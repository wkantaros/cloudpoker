const { client } = require('./redisClient');
const poker = require('./poker-logic/lib/node-poker');
const {TableLogger} = require("./loggerInit");
const {Player} = require("./sharedjs");
const { promisify } = require("util");

const fmtPlayerIdsId = (sid) => `${sid}:playerids`;
const fmtGameListId = (sid) => `${sid}:gameList`;
const fmtGameStateId = (sid, gameId) => `${sid}:${gameId}:gameState`;
const fmtGameStreamId = (sid, gameId) => `${sid}:${gameId}:stream`;

const redisFieldsToObject = (args) => {
    let y = {};
    for (let i = 0; i < args.length; i+=2) {
        y[args[i]] = args[i+1];
    }
    return y;
}
function formatStreamElement(elementArray) {
    return redisFieldsToObject(elementArray[1]);
}
function parseStreamElementId(id) {
    let dashIndex = id.indexOf('-');
    return parseInt(id.substring(0, dashIndex));
}

const getAsync = promisify(client.get).bind(client);
const smembersAsync = promisify(client.smembers).bind(client);
const saddAsync = promisify(client.sadd).bind(client);
const sremAsync = promisify(client.srem).bind(client);
const lindexAsync = promisify(client.lindex).bind(client);
const lrangeAsync = promisify(client.lrange).bind(client);
const lpopAsync = promisify(client.lpop).bind(client);
const rpopAsync = promisify(client.rpop).bind(client);
const llenAsync = promisify(client.llen).bind(client);
const ltrimAsync = promisify(client.ltrim).bind(client);
const hgetallAsync = promisify(client.hgetall).bind(client);
const hgetAsync = promisify(client.hget).bind(client);
const hsetAsync = promisify(client.hset).bind(client);
const hdelAsync = promisify(client.hdel).bind(client);
const xrangeAsync = promisify(client.xrange).bind(client);
const xaddAsync = promisify(client.xadd).bind(client);
const xlenAsync = promisify(client.xlen).bind(client);
const existsAsync = promisify(client.exists).bind(client);
const execMultiAsync = (multi) => {
    return promisify(multi.exec).bind(multi);
}
module.exports.execMultiAsync = execMultiAsync;

async function getGameStream(sid, gameId) {
    return await xrangeAsync(fmtGameStreamId(sid, gameId), '-', '+');
}
module.exports.getGameStream = getGameStream;

const sha256Hash = (str) => crypto.createHash('sha256').update(str).digest('hex');
const transformLogStreamElement = (el) => {
    delete el.type;
    if (el.logEvent === 'action' && el.action === 'setSeed') {
        el.playerSeedHash = sha256Hash(el.value);
        delete el.value;
    }
    return el;
}
async function getGameLog(sid, cursor) {
    // get the 5 most recent gameIds before cursor
    let gameIds = await lrangeAsync(fmtGameListId(sid), cursor, cursor + 4);
    let log = [];
    for (let i = gameIds.length -1; i > -1; i--) {
        let gameId = gameIds[i];
        let gameStream = await getGameStream(sid, gameId);
        let gameLog = gameStream
            .map(formatStreamElement)
            .filter(el=>el.type==='log')
            .map(transformLogStreamElement);
        log.push(...gameLog);
    }
    return log;
}
module.exports.getGameLog = getGameLog;

const transformRngState = (playerVal) =>  {
    delete playerVal.type;
    for (const prop in playerVal)
        if (playerVal.hasOwnProperty(prop))
            playerVal[prop] = parseInt(playerVal[prop]);
    return Object.assign({}, playerVal);
}
const transformPlayerState = (playerVal) => {
    const p = new Player(playerVal.playerName, playerVal.chips, playerVal.isStraddling !== 'false', playerVal.seat, playerVal.isMod !== 'false', playerVal.seed);
    p.inHand = playerVal.inHand !== 'false';
    p.standingUp = playerVal.standingUp !== 'false';
    return p;
}
async function getTableState(sid, gameId) {
    gameId = gameId || await getGameIdForTable(sid);
    let gameVal = await getGameState(sid, gameId);
    let table = new poker.Table(parseInt(gameVal.smallBlind), parseInt(gameVal.bigBlind), 2, 10, 1, 500000000000, 0);
    table.dealer = parseInt(gameVal.dealer);

    let gameStream = await getGameStream(sid, gameId);
    gameStream = gameStream.map(formatStreamElement);
    let i;
    let rngState;
    for (i = 0; i < gameStream.length; i++) {
        let playerVal = gameStream[i];
        if (playerVal.type === 'rngState') {
            rngState = transformRngState(playerVal);
        } else if (playerVal.type === 'playerState') {
            table.allPlayers[i] = transformPlayerState(playerVal);
        } else {
            break; // if we have reached the action stream
        }
    }

    let prev_round = null;
    if (gameId !== 'none') {
        table.dealer = (table.dealer - 1) % table.players.length;
        table.setRng(table.getSeed(), rngState);
        table.initNewRound();
        table.game.id = gameId;
        // sync actions
        for (; i< gameStream.length; i++) {
            let el = gameStream[i];
            if (!(el.type === 'log' && el.logEvent === 'action')) continue;
            if (el.action === 'setSeed') {
                table.allPlayers[i][el.seat].seed = el.value;
            } else {
                prev_round = table.game.roundName.toLowerCase();
                table.applyAction(el.seat, el.action, el.amount || 0);
            }
        }
    }
    return {table, prev_round};
}
module.exports.getTableState = getTableState;

async function deleteTableOnRedis(sid) {
    let multi = client.multi();
    multi.srem('sids', sid);
    await trimGameList(multi, sid, 0);
    multi.del(fmtPlayerIdsId(sid));
    await execMultiAsync(multi)();
}
module.exports.deleteTableOnRedis = deleteTableOnRedis;

function getActiveGameIds() {
    let sids = getSids();
    let gameIds = [];
    for (let sid of sids) {
        gameIds.push(getGameIdForTable(sid));
    }
    return gameIds;
}
module.exports.getActiveGameIds = getActiveGameIds;

const setInitialGameState = async (multi, table, sid, startTime) => {
    let gameStateArgs = [
        'gameId', table.game? table.game.id: 'none',
        'smallBlind', table.smallBlind,
        'bigBlind', table.bigBlind,
        'dealer', table.dealer,
        'startTime', startTime,
    ];
    multi.lpush(fmtGameListId(sid), table.game? table.game.id: 'none');
    multi.hmset(fmtGameStateId(sid, table.game? table.game.id: 'none'), ...gameStateArgs);
    TableLogger.newRound(sid, gameStateArgs);
}
const getGameIdForTable = async (sid) => {
    return await lindexAsync(fmtGameListId(sid), 0);
}
module.exports.getGameIdForTable = getGameIdForTable;

const getGameState = async (sid, gameId) => {
    return await hgetallAsync(fmtGameStateId(sid, gameId));
}
const setRngState = (multi, table, sid) => {
    if (table.game) {
        let state = table.initialRngState;
        let args = [
            'type', 'rngState',
            ...Object.entries(state).flat()
        ]
        multi.xadd(fmtGameStreamId(sid, table.game.id), '*', ...args);
        TableLogger.addOp(sid, 'rngState', args);
    }
}
const setInitialPlayerStates = (multi, table, sid) => {
    let gameId = table.game? table.game.id: 'none';
    // sort of hacky. delete the previous stream. only has an effect if gameId === 'none'
    // (because other game IDs are unique UUIDs)
    multi.del(fmtGameStreamId(sid, gameId));
    for (let p of table.allPlayers) {
        if (p===null) continue;
        let args = addPlayerArgs(table, sid, p);
        multi.xadd(fmtGameStreamId(sid, gameId), '*', ...args);
        TableLogger.playerState(sid, args);
    }
}
const addPlayerArgs = (table, sid, p) => {
    let args = [
        'type', 'playerState',
        'playerName', p.playerName,
        'inHand', p.inHand,
        'standingUp', p.standingUp,
        'chips', p.chips + p.bet, // p.bet > 0 if player is small or big blind
        'isMod', p.isMod,
        'isStraddling', p.isStraddling,
        'seat', p.seat,
        'seed', p.seed,
    ];
    return args;
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
    let startTime = Date.now();
    await setInitialGameState(multi, table, sid, startTime);
    setInitialPlayerStates(multi, table, sid);
    setRngState(multi, table, sid);

    await trimGameList(multi, sid, 40);

    await execMultiAsync(multi)();
}
const trimGameList = async (multi, sid, maxLen) => {
    let listLength = await llenAsync(fmtGameListId(sid));

    for (let i = 0; i < listLength - maxLen; i++) {
        let gameId = await rpopAsync(fmtGameListId(sid));
        multi.del(fmtGameStateId(sid, gameId));
        multi.del(fmtGameStreamId(sid, gameId));
    }
    if (maxLen <= 0) multi.del(fmtGameListId(sid));
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
async function addPlayerToRedis(sid, table, player, playerId) {
    let multi = client.multi();
    multi.xadd(fmtGameStreamId(sid, table.game? table.game.id: 'none'), '*', ...addPlayerArgs(table, sid, player));
    multi.hset(fmtPlayerIdsId(sid), player.playerName, playerId);
    await execMultiAsync(multi)();
    TableLogger.addPlayer(sid, player.playerName, playerId);
}
module.exports.addPlayerToRedis = addPlayerToRedis;
async function deletePlayerOnRedis(sid, playerName) {
    TableLogger.delPlayer(sid, playerName);
    await hdelAsync(fmtPlayerIdsId(sid), playerName);
}
module.exports.deletePlayerOnRedis = deletePlayerOnRedis;

async function addToGameLog(sid, gameId, logEvent, ...args) {
    let xaddArgs = ['type', 'log', 'logEvent', logEvent, ...args];
    await xaddAsync(fmtGameStreamId(sid, gameId), '*', ...xaddArgs);
    TableLogger.log(sid, [logEvent, ...args]);
}
module.exports.addToGameLog = addToGameLog;
const addActionHelper = async (sid, gameId, seat, action, ...args) => {
    return await addToGameLog(sid, gameId, 'action', 'seat', seat, 'action', action, ...args)
}
async function handlePlayerSitsDownRedis(sid, table, seat) {
    return await addActionHelper(sid, table.game? table.game.id: 'none', seat, 'sitDown');
}
async function handlePlayerStandsUpRedis(sid, table, seat) {
    return await addActionHelper(sid, table.game? table.game.id: 'none', seat, 'standUp');
}
// for external use (in session.js)
async function addActionToRedis(sid, gameId, seat, action, amount) {
    let args = [sid, gameId, seat, action];
    if (amount || amount === 0)
        args.push('amount', amount);
    return await addActionHelper(...args);
}

async function addSidToRedis(sid) {
    await saddAsync('sids', sid);
}
async function getSids() {
    return await smembersAsync('sids');
}
module.exports.addSidToRedis = addSidToRedis;
module.exports.getSids = getSids;

module.exports.formatStreamElement = formatStreamElement;
module.exports.handlePlayerStandsUpRedis = handlePlayerStandsUpRedis;
module.exports.handlePlayerSitsDownRedis = handlePlayerSitsDownRedis;
module.exports.addActionToRedis = addActionToRedis;

