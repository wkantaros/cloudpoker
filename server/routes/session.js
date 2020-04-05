const router = require('express').Router();
const path = require('path');
const Joi = require('@hapi/joi');
const shortid = require('shortid');
const s = require('../server-logic');

// Information host submits for game (name, stack, bb, sb)
router.route('/').post((req, res) => {
    //scheme to ensure valid username
    const schema = Joi.object({
        username: Joi.string().alphanum().min(2).max(30)
    });
    const { error, value } = schema.validate({ username: req.body.name });
    if (error) {
        res.status(422);
        res.json({
            isValid: false,
            message: error.details[0].message
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

//login page for host
// note: removing the ? makes id necessary (not optional)
router.route('/:id').get((req, res) => {
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
        dealer: s.getDealer(sid),
        color: 'black',
        name: t.hostName,
        stack: t.hostStack,
        showCards: false,
        joinedGame: true,
        waiting: !s.gameInProgress(sid),
        pot: s.getPot(sid),
        roundName: s.getRoundName(sid)
    });

    //consider uncommenting if it becomes an issue
    let socket_id = [];
    const io = req.app.get('socketio');
    io.on('connection', function (socket) {
        // make sure host has a socketid associate with name
        if (s.getPlayerId(sid, t.hostName) == 6969) {
            s.updatePlayerId(sid, t.hostName, socket.id);
            console.log(s.getPlayerId(sid, t.hostName));
        }

        socket_id.push(socket.id);
        // rm connection listener for any subsequent connections with the same ID
        if (socket_id[0] === socket.id) 
            io.removeAllListeners('connection');
        console.log('a user connected at', socket.id);
        // --------------------------------------------------------------------
        //adds socket to room (actually a sick feature)
        socket.join(sid);
        // io.sockets.to(sid).emit('game-in-progress', {waiting: !s.gameInProgress(sid)});
        io.sockets.to(sid).emit('render-players', s.playersInfo(sid));

        // send a message in the chatroom
        socket.on('chat', (data) => {
            console.log(data);
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

        socket.on('check', (data) => {
            let playerName = s.getPlayerById(sid, data.id);
            if (!s.gameInProgress(sid)) {
                console.log('game hasn\'t started yet');
            } else if (s.getActionSeat(sid) === s.getPlayerSeat(sid, playerName)) {
                prev_round = s.getRoundName(sid);
                let able_to_check = s.check(sid);
                if (able_to_check) {
                    io.sockets.to(sid).emit('check', {
                        username: playerName,
                        stack: s.getStack(sid, playerName),
                        pot: s.getPot(sid),
                        seat: s.getPlayerSeat(sid, playerName)
                    });
                    // update client's stack size
                    io.sockets.to(sid).emit('update-stack', {
                        seat: s.getPlayerSeat(sid, playerName),
                        stack: s.getStack(sid, playerName)
                    });
                    // let next client know it's his action
                    io.sockets.to(sid).emit('action', {seat: s.getActionSeat(sid)});
                    check_round(prev_round);
                } else {
                    console.log(`${playerName} cannot check in this situation!`);
                }
            } else {
                console.log(`not ${playerName}'s action`);
            }
        });

        socket.on('call', (data) => {
            let playerName = s.getPlayerById(sid, data.id);
            if (!s.gameInProgress(sid)) {
                console.log('game hasn\'t started yet');
            } else if (s.getActionSeat(sid) === s.getPlayerSeat(sid, playerName)) {
                prev_round = s.getRoundName(sid);
                s.call(sid);
                // send call back to every client
                io.sockets.to(sid).emit('call', {
                    username: playerName,
                    stack: s.getStack(sid, playerName),
                    pot: s.getPot(sid),
                    seat: s.getPlayerSeat(sid, playerName)
                });
                // update client's stack size
                io.sockets.to(sid).emit('update-stack', {
                    seat: s.getPlayerSeat(sid, playerName),
                    stack: s.getStack(sid, playerName)
                });
                // let next client know it's his action
                io.sockets.to(sid).emit('action', {seat: s.getActionSeat(sid)});
                check_round(prev_round);
            } else {
                console.log(`not ${playerName}'s action`);
            }
        });

        socket.on('fold', (data) => {
            let playerName = s.getPlayerById(sid, data.id);
            if (!s.gameInProgress(sid)) {
                console.log('game hasn\'t started yet');
            } else if (s.getActionSeat(sid) === s.getPlayerSeat(sid, playerName)) {
                prev_round = s.getRoundName(sid);
                s.fold(sid);
                io.sockets.to(sid).emit('fold', {
                    username: playerName,
                    stack: s.getStack(sid, playerName),
                    pot: s.getPot(sid),
                    seat: s.getPlayerSeat(sid, playerName)
                });
                // update client's stack size
                io.sockets.to(sid).emit('update-stack', {
                    seat: s.getPlayerSeat(sid, playerName),
                    stack: s.getStack(sid, playerName)
                });
                // let next client know it's his action
                io.sockets.to(sid).emit('action', {seat: s.getActionSeat(sid)});
                check_round(prev_round);
            } else {
                console.log(`not ${playerName}'s action`);
            }
        });

        socket.on('bet', (data) => {
            let playerName = s.getPlayerById(sid, data.id);
            if (!s.gameInProgress(sid)) {
                console.log('game hasn\'t started yet');
            } else if (s.getActionSeat(sid) === s.getPlayerSeat(sid, playerName)) {
                prev_round = s.getRoundName(sid);
                s.bet(sid, data.amount);
                io.sockets.to(sid).emit('bet', {
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
                // let next client know it's his action
                io.sockets.to(sid).emit('action', {
                    seat: s.getActionSeat(sid)
                });
                check_round(prev_round);
            } else {
                console.log(`not ${playerName}'s action`);
            }
        });
    });

    //checks if round has ended (reveals next card)
    let check_round = (prev_round) => {
        let table = s.getTableById(sid).table;
        console.log(table);
        let data = s.checkwin(sid);
        if (s.getRoundName(sid) === 'showdown') {
            winners = table.getWinners();
            console.log('winners');
            console.log(winners[0].hand.cards);
            io.sockets.to(sid).emit('showdown', winners);
            s.startRound(sid);
            begin_round();
        } else if (data.everyoneFolded) {
            console.log(prev_round);
            // POTENTIALLY SEE IF prev_round can be replaced with s.getRoundName
            let winnings = s.getWinnings(sid, prev_round);
            // console.log(data.winner);
            console.log(`${data.winner.playerName} won a pot of ${winnings}`);
            // update client's stack size
            io.sockets.to(sid).emit('update-stack', {
                seat: s.getPlayerSeat(sid, data.winner.playerName),
                stack: data.winner.chips + winnings
            });

            console.log(`Player has ${s.getStack(sid, data.winner.playerName)}`);
            console.log('Updating player\'s stack on the server...');
            s.updateStack(sid, data.winner.playerName, winnings);
            console.log(`Player now has ${s.getStack(sid, data.winner.playerName)}`)

            // tell clients who won the pot
            io.sockets.to(sid).emit('folds-through', {
                username: data.winner.playerName,
                amount: winnings
            });

            // start new round
            s.startRound(sid);
            if (s.gameInProgress(sid)) {
                begin_round();
            } else {
                console.log('waiting for more players to rejoin!');
            }
        } else if (prev_round !== s.getRoundName(sid)) {
            io.sockets.to(sid).emit('render-board', {
                street: s.getRoundName(sid),
                board: s.getDeal(sid)
            });
        }
    }

    let begin_round = () => {
        io.sockets.to(sid).emit('render-board', {street: 'deal'});
        io.sockets.to(sid).emit('new-dealer', {seat: s.getDealer(sid)});
        let data = s.playersInfo(sid);
        console.log(data);
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
        io.sockets.to(sid).emit('action', {seat: s.getActionSeat(sid)});
    }
});

module.exports = router;