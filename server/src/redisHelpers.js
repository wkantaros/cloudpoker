const { client } = require('./redisClient');
const poker = require('./poker-logic/lib/node-poker')
const {Player} = require("./sharedjs");
const { promisify } = require("util");

const fmtPlayerIdsId = (sid) => `table:${sid}:playerids`;
const fmtGameId = (sid) => `table:${sid}:gameId`;
// module.exports.fmtGameId = fmtGameId;

const fmtGameStateId = (gameId) => `game:${gameId}`;
// module.exports.getGameInitialStateId = fmtGameStateId;

const fmtPlayerStateId = (gameId, seat) => `player:${gameId}:${seat}`;
// module.exports.getPlayerInitialStateId = fmtPlayerStateId;

const fmtGameStreamId = (gameId) => `actionStream:${gameId}`;
// module.exports.fmtGameStreamId = fmtGameStreamId;

const smembersAsync = promisify(client.smembers).bind(client);
const hgetallAsync = promisify(client.hgetall).bind(client);
const hsetAsync = promisify(client.hset).bind(client);
const hdelAsync = promisify(client.hdel).bind(client);
const xrangeAsync = promisify(client.xrange).bind(client);
const xaddAsync = promisify(client.xadd).bind(client);
const execMultiAsync = (multi) => {
    return promisify(multi.exec).bind(multi);
}

async function getGameState(gameId) {
    let value;
    // let gameId;
    // client.get(fmtGameId(sid), function(err, value) {
    //     if (err) console.error(err);
    //     else gameId = value.toString();
    // });
    let table;
    value = await hgetallAsync(fmtGameStateId(gameId));
    table = new poker.Table(value.smallBlind, value.bigBlind, 2, 10, 1, 500000000000, 0);
    table.dealer = value.dealer;
    for (let i =0; i < 10; i++) {
        try {
            value = await hgetallAsync(fmtPlayerStateId(gameId, i));
        } catch (err) {
            console.log('this error is likely because the seat is empty:');
            console.error(err);
            return;
        }
        table.allPlayers[i] = new Player(value.playerName, value.chips, value.isStraddling, i, value.isMod)
        table.allPlayers[i].inHand = value.inHand;
        table.allPlayers[i].standingUp = value.standingUp;
    }
    table.initNewRound();
    return table;
}
module.exports.getGameState = getGameState;

async function getGameActions(gameId) {
    return await xrangeAsync(fmtGameStreamId(gameId), '-', '+')
}

function deleteGameOnRedis(sid, gameId) {
    let multi = client.multi();
    multi.del(fmtGameStateId(gameId))
    for (let i = 0; i < 10; i++) {
        multi.del(fmtPlayerStateId(gameId, i))
    }
    multi.del(fmtGameStreamId(gameId));
    multi.exec();
}
module.exports.deleteGameOnRedis = deleteGameOnRedis;

function getGameIdForTable(sid) {
    return client.get(fmtGameId(sid));
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

function addSidToRedis(sid) {
    client.sadd('sids', sid);
}
module.exports.addSidToRedis = addSidToRedis;

async function getSids() {
    return await smembersAsync('sids');
}
module.exports.getSids = getSids;
/**
 *
 * @param {Table} table
 * @param sid
 */
async function initializeGameRedis(table, sid) {
    let multi = client.multi();
    multi.set(fmtGameId(sid), table.game.id);
    multi.hmset(fmtGameStateId(table.game.id),
        'smallBlind', table.smallBlind,
        'bigBlind', table.bigBlind,
        'dealer', table.dealer,
        'startTime', Date.now());
    for (let p of table.allPlayers) {
        if (p===null) continue;
        let args = [fmtPlayerStateId(table.game.id, p.seat),
            'playerName', p.playerName,
            'inHand', p.inHand,
            'standingUp', p.standingUp,
            'chips', p.chips + p.bet, // p.bet > 0 if player is small or big blind
            'isMod', p.isMod,
            'isStraddling', p.isStraddling,
        ];
        if (p.inHand) {
            args.push(
                'card:0', p.cards[0],
                'card:1', p.cards[1]
            );
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

async function addBoardCardsToRedis(gameId, cards) {
    for (let c of cards) {
        await xaddAsync(fmtGameStreamId(gameId), '*',
            'action', 'boardCard',
            'card', c,
        );
    }
}
module.exports.addBoardCardsToRedis = addBoardCardsToRedis;
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
module.exports.addActionToRedis = addActionToRedis;
