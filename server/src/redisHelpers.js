const { client } = require('./redisClient');
const poker = require('./poker-logic/lib/node-poker');
const {Player} = require("./sharedjs");
const { promisify } = require("util");

const fmtPlayerIdsId = (sid) => `table:${sid}:playerids`;
const fmtGameId = (sid) => `table:${sid}:gameId`;
const fmtGameStateId = (sid, gameId) => `${sid}:game:${gameId}`;
const fmtPlayerStateId = (sid, gameId, seat) => `${sid}:player:${gameId}:${seat}`;
const fmtGameStreamId = (gameId) => `actionStream:${gameId}`;

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
    let gameVal = await getInitialGameState(sid, gameId);
    let table = new poker.Table(parseInt(gameVal.smallBlind), parseInt(gameVal.bigBlind), 2, 10, 1, 500000000000, 0);
    let playerCards = [].fill(null, 0, 10);
    for (let i =0; i < 10; i++) {
        let playerVal = await getInitialPlayerState(sid, gameId, i);
        if (playerVal === null) continue;
        table.allPlayers[i] = new Player(playerVal.playerName, playerVal.chips, playerVal.isStraddling !== 'false', i, playerVal.isMod !== 'false')
        table.allPlayers[i].inHand = playerVal.inHand !== 'false';
        table.allPlayers[i].standingUp = playerVal.standingUp !== 'false';
        if (playerVal.cards && playerVal.cards.length > 0)
            playerCards[i] = playerVal.cards.split(','); // table.allPlayers[i].cards will be overwritten in initNewRound
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

async function deleteTableOnRedis(sid, gameId) {
    let multi = client.multi();
    multi.srem('sids', sid);
    multi.del(fmtGameId(sid));
    await deleteGameOnRedis(sid, gameId, multi);
}
module.exports.deleteTableOnRedis = deleteTableOnRedis;
async function deleteGameOnRedis(sid, gameId, multi) {
    multi = multi || client.multi();
    delInitialGameState(multi, sid, gameId);
    delInitialPlayerStates(multi, sid, gameId);
    delGameStream(multi, gameId);
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

const setCurrentGameIdForTable = (multi, table, sid) => {
    let gameId = table.game? table.game.id: 'none';
    multi.set(fmtGameId(sid), gameId);
}
const delInitialGameState = (multi, sid, gameId) => {
    multi.del(fmtGameStateId(sid, gameId));
}
const setInitialGameState = (multi, table, sid) =>{
    let gameId = table.game? table.game.id: 'none';
    let gameStateArgs = [fmtGameStateId(sid, gameId),
        'smallBlind', table.smallBlind,
        'bigBlind', table.bigBlind,
        'dealer', table.dealer,
        'startTime', Date.now()];
    if (table.game) {
        gameStateArgs.push('deck', table.game.deck.join(','));
    }
    multi.hmset(gameStateArgs);
}
const getInitialGameState = async (sid, gameId) => {
    console.log(sid, gameId);
    return await hgetallAsync(fmtGameStateId(sid, gameId));
}
const getInitialPlayerState = async (sid, gameId, seat) => {
    return await hgetallAsync(fmtPlayerStateId(sid, gameId, seat));
}
const delInitialPlayerStates = (multi, sid, gameId) => {
    for (let i = 0; i < 10; i++) {
        multi.del(fmtPlayerStateId(sid, gameId, i))
    }
}
const setInitialPlayerStates = (multi, table, sid) => {
    let gameId = table.game? table.game.id: 'none';
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
}

async function initializeTableRedis(table, sid) {
    let multi = client.multi();
    multi.sadd('sids', sid)
    await initializeGameRedis(table, sid, multi);
}
module.exports.initializeTableRedis = initializeTableRedis;
/**
 * @param {Table} table
 * @param {string} sid
 * @param {Multi} multi
 */
async function initializeGameRedis(table, sid, multi) {
    multi = multi || client.multi();
    setCurrentGameIdForTable(multi, table, sid);
    setInitialGameState(multi, table, sid);
    setInitialPlayerStates(multi, table, sid);
    await execMultiAsync(multi)();
}
module.exports.initializeGameRedis = initializeGameRedis;

const getPids = async (sid) => {
    return await hgetallAsync(fmtPlayerIdsId(sid));
}
async function getPlayerIdsForTable(sid) {
    let pids = await getPids(sid);
    if (!pids) return {}; // if this table is empty because all players quit
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
const delGameStream = (multi, gameId) => {
    multi.del(fmtGameStreamId(gameId));
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
