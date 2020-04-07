const router = require('express').Router();
const cookieParser = require('cookie-parser');
const cookie = require('cookie');

// Player UUIDs expire after 48 hours
const PLAYER_UUID_EXPIRY = 48 * 60 * 60 * 1000;
router.use('/:id', cookieParser(process.env.COOKIE_SECRET));

const path = require('path');
const Joi = require('@hapi/joi');
const shortid = require('shortid');
const s = require('../server-logic');

// Information host submits for game (name, stack, bb, sb)
router.route('/').post((req, res) => {
    //scheme to ensure valid username
    const schema = Joi.object({
        // username: Joi.string().alphanum().min(2).max(10)
        username: Joi.string().regex(/^\w+(?:\s+\w+)*$/).min(2).max(10),
        smallBlind: Joi.number().integer().min(0),
        bigBlind: Joi.number().integer().min(0),
        stack: Joi.number().integer().min(1)
    });
    const {
        error,
        value
    } = schema.validate({
        username: req.body.name,
        smallBlind: req.body.smallBlind,
        bigBlind: req.body.bigBlind,
        stack: req.body.stack
    });
    if (error) {
        res.status(422);
        let message = error.details[0].message;
        console.log(message);
        if (message.includes("fails to match the required pattern: /^\\w+(?:\\s+\\w+)*$/")){
            message = "\"username\" cannot have punctuation"
        }
        res.json({
            isValid: false,
            message: message
        });
    } else {
        let sid = shortid.generate();
        req.body.shortid = sid;
        req.body.isValid = true;
        res.json(req.body);
        console.log(`starting new table with id: ${sid}`);
        s.createNewTable(sid, req.body.smallBlind, req.body.bigBlind, req.body.name, req.body.stack, 6969);
    }
});

let socket_ids = {};

const PLAYER_UUID_COOKIE_NAME = "player_uuid";

function playerIdFromRequest(req) {
    return req.cookies[PLAYER_UUID_COOKIE_NAME];
}

function newPlayerId() {
    return shortid.generate();
}

function setPlayerId(pid, req, res) {
    res.setHeader('Set-Cookie', cookie.serialize(PLAYER_UUID_COOKIE_NAME, pid, {
        // Make the player ID unique to this table by using the table's path
        path: `${req.baseUrl}/${req.params.id}`,
        // TODO: should httpOnly be true?
        // httpOnly: true,
        maxAge: PLAYER_UUID_EXPIRY,
    }));
}

// maps player ID (from cookie) -> socket ID (from socket.io session)
// const socketPlayerIdMap = {};
// const playerIdSocketMap = {};

//login page for host
// note: removing the ? makes id necessary (not optional)
router.route('/:id').get((req, res) => {
    let playerId = playerIdFromRequest(req);
    if (!playerId) {
        playerId = newPlayerId();
        setPlayerId(playerId, req, res);
    }

    let sid = req.params.id;
    let t = s.getTableById(sid);
    let table = t.table;

    res.render('pages/game', {
        bigBlind: table.bigBlind,
        smallBlind: table.smallBlind,
        rank: 'A',
        suit: 'S',
        action: false,
        actionSeat: s.getActionSeat(sid),
        dealer: s.getDealerSeat(sid),
        color: 'black',
        name: t.hostName,
        stack: t.hostStack,
        showCards: false,
        joinedGame: false,
        waiting: !s.gameInProgress(sid),
        pot: s.getPot(sid),
        roundName: s.getRoundName(sid),
    });

    //consider uncommenting if it becomes an issue
    let socket_id = [];
    const io = req.app.get('socketio');
    io.on('connection', function (socket) {
        // console.log(JSON.stringify(socket.handshake.headers));
        console.log('socket id!:', socket.id, 'player id', playerId);
        // added bc duplicate sockets (idk why, need to fix this later)
        if (!socket_ids[playerId]){
            // make sure host has a socketid associate with name
            if (s.getPlayerId(sid, t.hostName) == 6969) {
                s.updatePlayerId(sid, t.hostName, playerId);
                console.log(s.getPlayerId(sid, t.hostName));
            }

            socket_id.push(playerId);
            // rm connection listener for any subsequent connections with the same ID
            if (socket_id[0] === playerId) {
                io.removeAllListeners('connection');
            }
            console.log('a user connected at', socket.id, 'with player ID', playerId);
            
            // added this because of duplicate sockets being sent with (when using ngrok, not sure why)
            socket_ids[socket_id[0]] = true;
            // --------------------------------------------------------------------
            //adds socket to room (actually a sick feature)
            socket.join(sid);
            if (s.getModId(sid) != null){
                io.sockets.to(s.getModId(sid)).emit('add-mod-abilities');
            }
            io.sockets.to(sid).emit('render-players', s.playersInfo(sid));
            
            // send a message in the chatroom
            socket.on('chat', (data) => {
                io.to(sid).emit('chat', {
                    handle: s.getPlayerById(sid, data.id),
                    message: data.message
                });
                // io.sockets.to(sid).emit('chat', data);
            });
            
            // typing
            socket.on('typing', (handle) => {
                socket.broadcast.to(sid).emit('typing', handle);
            });

            socket.on('buy-in', (data) => {
            // console.log(data);
            s.buyin(sid, data.playerName, data.id, data.stack);
            io.sockets.to(sid).emit('buy-in', data);
            io.sockets.to(sid).emit('render-players', s.playersInfo(sid));
        });

        socket.on('leave-game', (data) => {
            // check if mod is leaving the game
            let oldModId = data.id;
            let modLeavingGame = false;
            if (data.id == s.getModId(sid)) {
                modLeavingGame = true;
            }

            if (!s.gameInProgress(sid)){
                let playerName = s.getPlayerById(sid, data.id);
                let seat = s.getPlayerSeat(sid, playerName);
                s.removePlayer(sid, playerName);
                console.log(`${playerName} leaves game`);
                if (modLeavingGame) {
                    // transfer mod if mod left game
                    if (s.getModId(sid) != null){
                        io.sockets.to(s.getModId(sid)).emit('add-mod-abilities');
                    }
                    io.sockets.to(oldModId).emit('remove-mod-abilities');
                }
                io.sockets.to(sid).emit('remove-out-players', {seat: seat});
                s.makeEmptySeats(sid);
                console.log('waiting for more players to rejoin');
            } else {
                let playerName = s.getPlayerById(sid, data.id);
                let stack = s.getStack(sid, playerName);
                let seat = s.getPlayerSeat(sid, playerName);
                prev_round = s.getRoundName(sid);
                console.log(`${playerName} leaves game for ${stack}`);
                // fold player
                s.fold(sid, playerName);
                io.sockets.to(sid).emit('fold', {
                    username: playerName,
                    stack: s.getStack(sid, playerName),
                    pot: s.getPot(sid),
                    seat: s.getPlayerSeat(sid, playerName),
                    amount: data.amount
                });
                // update client's stack size
                io.sockets.to(sid).emit('update-stack', {
                    seat: s.getPlayerSeat(sid, playerName),
                    stack: s.getStack(sid, playerName)
                });
                // shift action to next player in hand
                io.sockets.to(sid).emit('action', {
                    seat: s.getActionSeat(sid),
                    availableActions: s.getAvailableActions(sid)
                });
                s.removePlayer(sid, playerName);
                if (modLeavingGame){
                    // transfer mod if mod left game
                    if (s.getModId(sid) != null){
                        io.sockets.to(s.getModId(sid)).emit('add-mod-abilities');
                    }
                    io.sockets.to(oldModId).emit('remove-mod-abilities');
                }
                io.sockets.emit('buy-out', {
                    playerName: playerName,
                    stack: stack,
                    seat: seat
                });
                setTimeout(() => {
                    // check if round has ended
                    check_round(prev_round);
                }, 250);
                setTimeout(() => {
                    // notify player its their action with sound
                    io.to(`${s.getPlayerId(sid, s.getNameByActionSeat(sid))}`).emit('players-action', {});
                }, 500);
            }
        });

        socket.on('start-game', (data) => {
            let playersInNextHand = 0;
            if (table.playersToAdd) playersInNextHand += table.playersToAdd.length;
            if (table.players) playersInNextHand += table.players.length;
            console.log(`players in next hand: ${playersInNextHand}`);
            if (playersInNextHand >= 2 && playersInNextHand <= 10) {
                s.startGame(sid);
                io.sockets.to(sid).emit('start-game', s.playersInfo(sid));
                begin_round();
            } else {
                console.log("waiting on players");
            }
        });
        
        socket.on('action', (data) => {
            // console.log(`data:\n${JSON.stringify(data)}`);
            let playerName = s.getPlayerById(sid, data.id);
            if (!s.gameInProgress(sid)) {
                console.log('game hasn\'t started yet');
            } else if (s.getActionSeat(sid) === s.getPlayerSeat(sid, playerName)) {
                prev_round = s.getRoundName(sid);
                let canPerformAction = true;
                if (data.action === 'bet') {
                    s.bet(sid, playerName, data.amount);
                } else if (data.action === 'call') {
                    data.amount = s.getMaxBet(sid);
                    s.call(sid, playerName);
                } else if (data.action === 'fold') {
                    s.fold(sid, playerName);
                } else if (data.action === 'check') {
                    canPerformAction = s.check(sid, playerName);
                }
                if (canPerformAction) {
                    io.sockets.to(sid).emit(`${data.action}`, {
                        username: playerName,
                        stack: s.getStack(sid, playerName),
                        pot: s.getPot(sid),
                        seat: s.getPlayerSeat(sid, playerName),
                        amount: data.amount
                    });
                    // update client's stack size
                    io.sockets.to(sid).emit('update-stack', {
                        seat: s.getPlayerSeat(sid, playerName),
                        stack: s.getStack(sid, playerName)
                    });
                    // shift action to next player in hand
                    io.sockets.to(sid).emit('action', {
                        seat: s.getActionSeat(sid),
                        availableActions: s.getAvailableActions(sid)
                    });
                    setTimeout(()=>{
                        // check if round has ended
                        check_round(prev_round);
                    }, 250);
                    setTimeout(()=>{
                        // notify player its their action with sound
                        io.to(`${s.getPlayerId(sid, s.getNameByActionSeat(sid))}`).emit('players-action', {});
                    }, 500);
                } else {
                    console.log(`${playerName} cannot perform action in this situation!`);
                }
            } else {
                console.log(`not ${playerName}'s action`);
            }
        });
        
        // this if else statement is a nonsense fix need to find a better one
        } else {
            console.log('fuck already connected');
        }
    });
    
    //checks if round has ended (reveals next card)
    let check_round = (prev_round) => {
        let table = s.getTableById(sid).table;
        s.checkAllIns(sid);
        // console.log(table);
        let data = s.checkwin(sid);
        if (s.getRoundName(sid) === 'showdown') {
            io.sockets.to(sid).emit('update-pot', {amount: s.getPot(sid)});
            winners = s.getWinners(sid);
            console.log('winners');
            console.log('LOSERS');
            let losers = s.getLosers(sid);
            io.sockets.to(sid).emit('showdown', winners);

            
            // console.log("ALL IN");
            // console.log(s.getTableById(sid).table);
            // start new round
            setTimeout(() => {
                // handle losers
                for (let i = 0; i < losers.length; i++){
                    let playerName = losers[i].playerName;
                    let seat = s.getPlayerSeat(sid, playerName);
                    console.log(`${playerName} leaves game for 0`);
                    let oldModId = s.getModId(sid);
                    s.removePlayer(sid, playerName);
                    if (oldModId != s.getModId(sid)){
                        if (s.getModId(sid) != null){
                            io.sockets.to(s.getModId(sid)).emit('add-mod-abilities');
                        }
                        io.sockets.to(oldModId).emit('remove-mod-abilities');
                    }
                    io.sockets.emit('buy-out', {
                        playerName: playerName,
                        stack: 0,
                        seat: seat
                    });
                }
                // start new round
                s.startRound(sid);
                if (s.gameInProgress(sid)) {
                    begin_round();
                } else {
                    io.sockets.to(sid).emit('waiting', {});
                    s.makeEmptySeats(sid);
                    io.sockets.to(sid).emit('remove-out-players', {});
                    io.sockets.to(sid).emit('render-board', {street: 'deal', sound: false});
                    io.sockets.to(sid).emit('new-dealer', {seat: -1});
                    io.sockets.to(sid).emit('update-pot', {amount: 0});
                    io.sockets.to(sid).emit('clear-earnings', {});
                    io.sockets.to(sid).emit('available-actions', {availableActions: s.getAvailableActions(sid)});
                    console.log('waiting for more players to rejoin!');
                }
            }, (3000));
        } else if (data.everyoneFolded) {
            console.log(prev_round);
            // POTENTIALLY SEE IF prev_round can be replaced with s.getRoundName
            let winnings = s.getWinnings(sid, prev_round);
            // console.log(data.winner);
            console.log(`${data.winner.playerName} won a pot of ${winnings}`);

            // tell clients who won the pot
            io.sockets.to(sid).emit('folds-through', {
                username: data.winner.playerName,
                amount: winnings,
                seat: s.getPlayerSeat(sid, data.winner.playerName)
            });

            // start new round
            setTimeout(() => {
                // update client's stack size
                io.sockets.to(sid).emit('update-stack', {
                    seat: s.getPlayerSeat(sid, data.winner.playerName),
                    stack: data.winner.chips + winnings
                });

                // update stack on the server
                console.log(`Player has ${s.getStack(sid, data.winner.playerName)}`);
                console.log('Updating player\'s stack on the server...');
                s.updateStack(sid, data.winner.playerName, winnings);
                console.log(`Player now has ${s.getStack(sid, data.winner.playerName)}`)

                // start new round
                s.startRound(sid);
                if (s.gameInProgress(sid)) {
                    begin_round();
                } else {
                    io.sockets.to(sid).emit('waiting', {});
                    s.makeEmptySeats(sid);
                    io.sockets.to(sid).emit('remove-out-players', {});
                    io.sockets.to(sid).emit('render-board', {street: 'deal', sound: false});
                    io.sockets.to(sid).emit('new-dealer', {seat: -1});
                    io.sockets.to(sid).emit('update-pot', {amount: 0});
                    io.sockets.to(sid).emit('clear-earnings', {});
                    io.sockets.to(sid).emit('available-actions', {availableActions: s.getAvailableActions(sid)});
                    console.log('waiting for more players to rejoin!');
                }
            }, (3000));
        } else if (prev_round !== s.getRoundName(sid)) {
            // console.log("ALL IN");
            // console.log(s.getTableById(sid).table);
            io.sockets.to(sid).emit('update-pot', {amount: s.getPot(sid)});
            io.sockets.to(sid).emit('render-board', {
                street: s.getRoundName(sid),
                board: s.getDeal(sid),
                sound: true
            });
        }
    }

    let begin_round = () => {
        io.sockets.to(sid).emit('render-board', {street: 'deal', sound: true});
        s.makeEmptySeats(sid);
        io.sockets.to(sid).emit('remove-out-players', {});
        io.sockets.to(sid).emit('new-dealer', {seat: s.getDealerSeat(sid)});
        io.sockets.to(sid).emit('nobody-waiting', {});
        io.sockets.to(sid).emit('update-pot', {amount: 0});
        io.sockets.to(sid).emit('clear-earnings', {});
        // io.sockets.to(sid).emit('hide-hands', {});
        io.sockets.to(sid).emit('initial-bets', {seats: s.getInitialBets(sid)});
        let data = s.playersInfo(sid);
        // console.log(data);
        for (let i = 0; i < data.length; i++) {
            let name = data[i].playerName;
            io.to(`${data[i].playerid}`).emit('render-hand', {
                cards: s.getCardsByPlayerName(sid, name),
                seat: data[i].seat
            });
            io.sockets.to(sid).emit('update-stack', {
                seat: data[i].seat,
                stack: data[i].stack
            });

        }
        io.sockets.to(sid).emit('action', {
            seat: s.getActionSeat(sid),
            availableActions: s.getAvailableActions(sid)
        });
        // abstracting this to be able to work with bomb pots/straddles down the line
        io.to(`${s.getPlayerId(sid, s.getNameByActionSeat(sid))}`).emit('players-action', {});
    }
});

module.exports = router;