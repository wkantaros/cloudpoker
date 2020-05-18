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

const hgetallAsync = promisify(client.hgetall).bind(client);

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
        client.hgetall(fmtPlayerStateId(gameId, i), function (err, value) {
            if (err) {
                console.log('this error is likely because the seat is empty:');
                console.error(err);
                return;
            }
            table.allPlayers[i] = new Player(value.playerName, value.chips, value.isStraddling, i, value.isMod)
            table.allPlayers[i].inHand = value.inHand;
            table.allPlayers[i].standingUp = value.standingUp;
        })
    }
    table.initNewRound();
    client.xrange(fmtGameStreamId(gameId), '-', '+', function(err, value) {
        if (err) console.error(err);
        console.log(value);
    })
    return table;
}
module.exports.getGameState = getGameState;

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

function getSids() {
    let members;
    let err;
    client.smembers('sids', function(e, value) {
        if (e) {
            console.error(e);
            err = e;
            return;
        }
        console.log('sids smembers');
        console.log(value);
        members = value;
    })
    if (err) throw err;
    return members;
}
module.exports.getSids = getSids;
/**
 *
 * @param {Table} table
 * @param sid
 */
function initializeGameRedis(table, sid) {
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
    multi.exec();
}
module.exports.initializeGameRedis = initializeGameRedis;

function performActionHelper(clientOrMulti, gameId, seat, action, amount) {
    if (amount || amount === 0) {
        return clientOrMulti.xadd(fmtGameStreamId(gameId), '*',
            'seat', seat,
            'action', action,
            'amount', amount
        );
    } else {
        return clientOrMulti.xadd(fmtGameStreamId(gameId), '*',
            'seat', seat,
            'action', action
        );
    }
}

function getPlayerIdsForTable(sid) {
    let pids;
    let err;
    client.hgetall(fmtPlayerIdsId(sid), function(e, v) {
        if (e) {
            console.error(e);
            err = e;
            return;
        }
        pids = v;
    });
    if (err) throw err;
    let playerids = {}
    for (let playerName of Object.keys(pids)) {
        playerids[playerName] = {playerid: pids[playerName]}
    }
    return playerids;
}
module.exports.getPlayerIdsForTable = getPlayerIdsForTable;
function addPlayerToRedis(sid, playerName, playerId) {
    client.hset(fmtPlayerIdsId(sid), playerName, playerId);
}
module.exports.addPlayerToRedis = addPlayerToRedis;
function deletePlayerOnRedis(sid, playerName) {
    client.hdel(fmtPlayerIdsId(sid), playerName);
}
module.exports.deletePlayerOnRedis = deletePlayerOnRedis;

function addBoardCardsToRedis(gameId, cards) {
    for (let c of cards) {
        client.xadd(fmtGameStreamId(gameId), '*',
            'action', 'boardCard',
            'card', c,
        );
    }
}
module.exports.addBoardCardsToRedis = addBoardCardsToRedis;
function addActionToRedis(gameId, seat, action, amount) {
    return performActionHelper(client, gameId, seat, action, amount);
}
module.exports.addActionToRedis = addActionToRedis;
