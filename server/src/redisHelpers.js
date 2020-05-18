const { client } = require('./redisClient');

const getGameListId = (sid) => `table:${sid}:gameList`;
// module.exports.getTableId = getTableId;

const getGameStateId = (gameId) => `game:${gameId}`;
// module.exports.getGameInitialStateId = getGameStateId;

const getPlayerStateId = (gameId, seat) => `player:${gameId}:${seat}`;
// module.exports.getPlayerInitialStateId = getPlayerStateId;

const getGameStreamId = (gameId) => `actionStream:${gameId}`;
// module.exports.getGameStreamId = getGameStreamId;

function getGameState(sid) {
    let gameId;
    client.lindex(getGameListId(sid), function(err, res) {
        if (err) console.error(err);
        else gameId = res.toString();
    });
    let table;
    client.hgetall(getGameStateId(gameId), function(err, res) {
        table = new
    })
}

/**
 *
 * @param {Table} table
 * @param sid
 */

function initializeGameRedis(table, sid) {
    let multi = client.multi();
    multi.rpush(getGameListId(sid), table.game.id);
    multi.hmset(getGameStateId(table.game.id),
        'smallBlind', table.smallBlind,
        'bigBlind', table.bigBlind,
        'dealer', table.dealer,
        'startTime', Date.now());
    for (let p of table.allPlayers) {
        if (p===null) continue;
        let args = [getPlayerStateId(table.game.id, p.seat),
            'playerName', p.playerName,
            'inHand', p.inHand,
            'standingUp', p.standingUp,
            'chips', p.chips + p.bet, // p.bet > 0 if player is small or big blind
        ];
        if (p.inHand) {
            args.push(
                'card:0', p.cards[0],
                'card:1', p.cards[1]
            );
        }
        multi.hmset(args);
    }
    for (let i = 0; i < table.players.length; i++) {
        const p = table.players[(i + table.dealer) % table.players.length];
        if (p.bet > 0) {
            performActionHelper(multi, table.game.id, p.seat, 'bet', p.bet);
        }
    }
    multi.exec();
}
module.exports.initializeGameRedis = initializeGameRedis;

function performActionHelper(clientOrMulti, gameId, seat, action, amount) {
    if (amount || amount === 0) {
        return clientOrMulti.xadd(getGameStreamId(gameId), '*',
            'seat', seat,
            'action', action,
            'amount', amount
        );
    } else {
        return clientOrMulti.xadd(getGameStreamId(gameId), '*',
            'seat', seat,
            'action', action
        );
    }
}

function addBoardCardsToRedis(gameId, cards) {
    for (let c of cards) {
        client.xadd(getGameStreamId(gameId), '*',
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
