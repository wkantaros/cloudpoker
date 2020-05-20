const { client } = require('./redisClient');
const poker = require('./poker-logic/lib/node-poker')
const {Player} = require("./sharedjs");
const { promisify } = require("util");

const fmtPlayerIdsId = (sid) => `table:${sid}:playerids`;
const fmtGameId = (sid) => `table:${sid}:gameId`;
// module.exports.fmtGameId = fmtGameId;

const fmtGameStateId = (sid, gameId) => `${sid}:game:${gameId}`;
// module.exports.getGameInitialStateId = fmtGameStateId;

const fmtPlayerStateId = (sid, gameId, seat) => `${sid}:player:${gameId}:${seat}`;
// module.exports.getPlayerInitialStateId = fmtPlayerStateId;

const fmtGameStreamId = (gameId) => `actionStream:${gameId}`;
// module.exports.fmtGameStreamId = fmtGameStreamId;

const getAsync = promisify(client.get).bind(client);
const smembersAsync = promisify(client.smembers).bind(client);
const saddAsync = promisify(client.sadd).bind(client);
const sremAsync = promisify(client.srem).bind(client);
const hgetallAsync = promisify(client.hgetall).bind(client);
const hsetAsync = promisify(client.hset).bind(client);
const hdelAsync = promisify(client.hdel).bind(client);
const xrangeAsync = promisify(client.xrange).bind(client);
const xaddAsync = promisify(client.xadd).bind(client);
const execMultiAsync = (multi) => {
    return promisify(multi.exec).bind(multi);
}
module.exports.execMultiAsync = execMultiAsync;

async function getTableState(sid) {
    let gameId = await getGameIdForTable(sid);
    let gameVal = await hgetallAsync(fmtGameStateId(sid, gameId));
    let table = new poker.Table(parseInt(gameVal.smallBlind), parseInt(gameVal.bigBlind), 2, 10, 1, 500000000000, 0);
    let playerCards = [].fill(null, 0, 10);
    for (let i =0; i < 10; i++) {
        let playerVal = await hgetallAsync(fmtPlayerStateId(sid, gameId, i));
        if (playerVal === null) continue;
        table.allPlayers[i] = new Player(playerVal.playerName, playerVal.chips, playerVal.isStraddling !== 'false', i, playerVal.isMod !== 'false')
        table.allPlayers[i].inHand = playerVal.inHand !== 'false';
        table.allPlayers[i].standingUp = playerVal.standingUp !== 'false';
        if (table.allPlayers[i].inHand)
            playerCards[i] = playerVal.cards.split(',');
    }
    table.dealer = parseInt(gameVal.dealer);

    if (gameId !== 'none') {
        table.dealer = (table.dealer - 1) % table.players.length;
        table.initNewRound();
        table.game.id = gameId;
        table.game.deck = gameVal.deck.split(',');
        for (let p of table.players) {
            p.cards = playerCards[p.seat];
        }
    }
    return table;
}
module.exports.getTableState = getTableState;

async function getGameActions(gameId) {
    return await xrangeAsync(fmtGameStreamId(gameId), '-', '+')
}
module.exports.getGameActions = getGameActions;

async function deleteGameOnRedis(sid, gameId) {
    let multi = client.multi();
    multi.srem('sids', sid);
    multi.del(fmtGameId(sid));
    multi.del(fmtGameStateId(sid, gameId));
    for (let i = 0; i < 10; i++) {
        multi.del(fmtPlayerStateId(sid, gameId, i))
    }
    multi.del(fmtGameStreamId(gameId));
    await execMultiAsync(multi)();
}
module.exports.deleteGameOnRedis = deleteGameOnRedis;

async function getGameIdForTable(sid) {
    return await getAsync(fmtGameId(sid));
}
module.exports.getGameIdForTable = getGameIdForTable;
function getActiveGameIds() {
    let sids = getSids();
    let gameIds = [];
    for (let sid of sids) {
        gameIds.push(getGameIdForTable(sid));
    }
    return gameIds;
}
module.exports.getActiveGameIds = getActiveGameIds;

async function addSidToRedis(sid) {
    await saddAsync('sids', sid);
}
module.exports.addSidToRedis = addSidToRedis;

async function getSids() {
    return await smembersAsync('sids');
}
module.exports.getSids = getSids;

/**
 * @param {Table} table
 * @param {string} sid
 */
async function initializeGameRedis(table, sid) {
    let multi = client.multi();
    let gameId = table.game? table.game.id: 'none';
    multi.set(fmtGameId(sid), gameId);
    let gameStateArgs = [fmtGameStateId(sid, gameId),
        'smallBlind', table.smallBlind,
        'bigBlind', table.bigBlind,
        'dealer', table.dealer,
        'startTime', Date.now()];
    if (table.game) {
        gameStateArgs.push('deck', table.game.deck.join(','));
    }
    multi.hmset(gameStateArgs);
    for (let p of table.allPlayers) {
        if (p===null) continue;
        let args = [fmtPlayerStateId(sid, gameId, p.seat),
            'playerName', p.playerName,
            'inHand', p.inHand,
            'standingUp', p.standingUp,
            'chips', p.chips + p.bet, // p.bet > 0 if player is small or big blind
            'isMod', p.isMod,
            'isStraddling', p.isStraddling,
        ];
        if (p.inHand) {
            args.push('cards', p.cards.join(','));
        }
        multi.hmset(args);
    }
    // for (let i = 0; i < table.players.length; i++) {
    //     const p = table.players[(i + table.dealer) % table.players.length];
    //     if (p.bet > 0) {
    //         performActionHelper(multi, table.game.id, p.seat, 'bet', p.bet);
    //     }
    // }
    await execMultiAsync(multi)();
}
module.exports.initializeGameRedis = initializeGameRedis;

async function getPlayerIdsForTable(sid) {
    let pids = await hgetallAsync(fmtPlayerIdsId(sid));
    let playerids = {}
    for (let playerName of Object.keys(pids)) {
        playerids[playerName] = {playerid: pids[playerName]}
    }
    return playerids;
}
module.exports.getPlayerIdsForTable = getPlayerIdsForTable;
async function addPlayerToRedis(sid, playerName, playerId) {
    await hsetAsync(fmtPlayerIdsId(sid), playerName, playerId);
}
module.exports.addPlayerToRedis = addPlayerToRedis;
async function deletePlayerOnRedis(sid, playerName) {
    await hdelAsync(fmtPlayerIdsId(sid), playerName);
}
module.exports.deletePlayerOnRedis = deletePlayerOnRedis;
async function handlePlayerSitsDownRedis(sid, table, seat) {
    if (table.game) {
        return await addActionToRedis(table.game.id, seat, 'sitDown');
    } else {
        return await hsetAsync(fmtPlayerStateId(sid, 'none', seat), 'standingUp', false);
    }
}
async function handlePlayerStandsUpRedis(sid, table, seat) {
    if (table.game) {
        return await addActionToRedis(table.game.id, seat, 'standUp');
    } else {
        return await hsetAsync(fmtPlayerStateId(sid, 'none', seat), 'standingUp', true);
    }
}
function formatActionObject(actionObjectArray) {
    console.log(actionObjectArray);
    let y = {
        seat: parseInt(actionObjectArray[1][1]),
        action: actionObjectArray[1][3],
    };
    if (actionObjectArray[1].length > 4)
        y.amount = parseInt(actionObjectArray[1][5]);
    console.log('y', y)
    return y;
}
async function addActionToRedis(gameId, seat, action, amount) {
    if (amount || amount === 0) {
        return await xaddAsync(fmtGameStreamId(gameId), '*',
            'seat', seat,
            'action', action,
            'amount', amount,
        );
    } else {
        return await xaddAsync(fmtGameStreamId(gameId), '*',
            'seat', seat,
            'action', action,
        );
    }
}
module.exports.formatActionObject = formatActionObject;
module.exports.handlePlayerStandsUpRedis = handlePlayerStandsUpRedis;
module.exports.handlePlayerSitsDownRedis = handlePlayerSitsDownRedis;
module.exports.addActionToRedis = addActionToRedis;
