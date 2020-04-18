const router = require('express').Router();
const cookieParser = require('cookie-parser');

router.use('/:id', cookieParser(process.env.COOKIE_SECRET));

const path = require('path');
const Joi = require('@hapi/joi');
const shortid = require('shortid');
const {getTableById, createNewTable} = require('../server-logic');
const {playerIdFromRequest, newPlayerId, setPlayerId, TwoWayMap} = require('../persistent');

// Information host submits for game (name, stack, bb, sb)
router.route('/').post((req, res) => {
    //scheme to ensure valid username
    const schema = Joi.object({
        // username: Joi.string().alphanum().min(2).max(10)
        username: Joi.string().regex(/^\w+(?:\s+\w+)*$/).min(2).max(10),
        smallBlind: Joi.number().integer().min(0),
        bigBlind: Joi.number().integer().min(0),
        stack: Joi.number().integer().min(1),
        straddleLimit: Joi.number().integer().min(-1)
    });
    if (process.env.DEBUG === 'true') {
        req.body.name = req.body.name || 'debugName';
    }
    const {
        error,
        value
    } = schema.validate({
        username: req.body.name,
        smallBlind: req.body.smallBlind,
        bigBlind: req.body.bigBlind,
        stack: req.body.stack,
        straddleLimit: req.body.straddleLimit,
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
        createNewTable(sid, req.body.smallBlind, req.body.bigBlind, req.body.name, req.body.stack, false, req.body.straddleLimit, 6969);
        tableSocketMap.set(sid, new TwoWayMap());
    }
});


// maps sid -> (player ID (from cookie) -> socket ID (from socket.io session) and vice versa)
// TODO: delete sid from tSM when table finishes
const tableSocketMap = new Map();

// hacky fix
const socket_ids = {};

router.route('/:id').get((req, res) => {
    let sid = req.params.id;
    let s = getTableById(sid);
    if (!s){
        res.status(404).render('pages/404');
    }

    let playerId = playerIdFromRequest(req);

    console.log('playerIdFromRequest', playerId, 'is active', s.isActivePlayerId(playerId));
    // isActivePlayerId is false if the player previously quit the game
    const isNewPlayer = (playerId === undefined) || !s.isActivePlayerId(playerId);
    console.log('inp', isNewPlayer);
    if (isNewPlayer) {
        // Create new player ID and set it as a cookie in user's browser
        playerId = newPlayerId();
        setPlayerId(playerId, req, res);
    }

    // gets a players socket ID from playerId
    const getSocketId = (playerId) => {
        return tableSocketMap.get(sid).key(playerId);
    };

    res.render('pages/game', {
        bigBlind: s.table.bigBlind,
        smallBlind: s.table.smallBlind,
        rank: 'A',
        suit: 'S',
        action: false,
        actionSeat: s.actionSeat,
        dealer: s.getDealerSeat(),
        color: 'black',
        showCards: false,
        joinedGame: s.isActivePlayerId(playerId),
        waiting: !s.gameInProgress,
        pot: s.getPot(),
        roundName: s.getRoundName(),
        callAmount: s.maxBet
    });

    // hacky
    let socket_id = [];
    const io = req.app.get('socketio');
    io.once('connection', function (socket) {
        console.log('socket id!:', socket.id, 'player id', playerId);

        if (!socket_ids[socket.id]) {
            socket_id.push(socket.id);
            // rm connection listener for any subsequent connections with the same ID
            if (socket_id[0] === socket.id) {
                io.removeAllListeners('connection');
            }
            console.log('a user connected at', socket.id);

            // added this because of duplicate sockets being sent with (when using ngrok, not sure why)
            socket_ids[socket_id[0]] = true;
        
        tableSocketMap.get(sid).set(playerId, socket.id);

        // socket.on('disconnect', (reason) => {
        //     console.log('pid', playerId, 'socket ID', socket.id, 'disconnect reason', reason);
        //     io.removeAllListeners('connection');
        // });

        // make sure host has a socketid associate with name (player who sent in login form)
        if (s.getModId() != null && s.getModId() === 6969) {
            s.updatePlayerId(s.getPlayerById(s.getModId()), playerId);
            console.log('updating hostname playerid to:', playerId);
        }
        console.log('a user connected at', socket.id, 'with player ID', playerId);

        //adds socket to room (actually a sick feature)
        socket.join(sid);
        if (s.getModId() != null){
            io.sockets.to(getSocketId(s.getModId())).emit('add-mod-abilities');
        }
        io.sockets.to(sid).emit('render-players', s.playersInfo());
        // highlight cards of player in action seat and get available buttons for players
        renderActionSeatAndPlayerActions(sid);

        // chatroom features
        // send a message in the chatroom
        socket.on('chat', (data) => {
            io.to(sid).emit('chat', {
                handle: s.getPlayerById(playerId),
                message: data.message
            });
        });

        // typing
        socket.on('typing', () => {
            socket.broadcast.to(sid).emit('typing', s.getPlayerById(playerId));
        });

        if (!isNewPlayer && s.gameInProgress) {
            // TODO: get returning player in sync with hand.
            //  render his cards, etc.
            console.log(`syncing ${s.getPlayerById(playerId)}`);
            let data = s.playersInfo();
            io.sockets.to(getSocketId(playerId)).emit('sync-board', {
                street: s.getRoundName(),
                board: s.getDeal(),
                sound: true
            });
            // TODO: check if player is in game
            // render player's hand
            // TODO: this doesn't work
            for (let i = 0; i < data.length; i++) {
                if (data[i].playerid === playerId) {
                    io.to(getSocketId(playerId)).emit('render-hand', {
                        cards: s.getCardsByPlayerName(data[i].playerName),
                        seat: data[i].seat
                    });
                }
            }

            // highlight cards of player in action seat and get available buttons for players
            renderActionSeatAndPlayerActions(sid);
            // Play sound for action seat player
            if (s.getPlayerId(s.getNameByActionSeat()) === playerId) {
                io.to(getSocketId(playerId)).emit('players-action-sound', {});
            }
        }

        socket.on('buy-in', (data) => {
            if (s.isPlayerNameUsed(data.playerName)) {
                io.sockets.to(getSocketId(playerId)).emit('alert',
                    {'message': `Player name ${data.playerName} is already taken.`});
                return;
            }
            s.buyin(data.playerName, playerId, data.stack, data.isStraddling === true);
            if (s.getModId() === playerId) {
                io.sockets.to(getSocketId(s.getModId())).emit('add-mod-abilities');
            }
            io.sockets.to(sid).emit('buy-in', data);
            io.sockets.to(sid).emit('render-players', s.playersInfo());
            // highlight cards of player in action seat and get available buttons for players
            renderActionSeatAndPlayerActions(sid);
        });

        socket.on('straddle-switch', (data) => {
            s.setPlayerStraddling(playerId, data.isStraddling)
        });

        socket.on('leave-game', (data) => {
            // if (!s.isActivePlayerId(playerId)) {
            //     console.log(`error: ${playerId} is inactive but received leave-game.`);
            //     return;
            // }
            if (!s.gameInProgress){
                let playerName = s.getPlayerById(playerId);
                handlePlayerExit(playerName);
                // highlight cards of player in action seat and get available buttons for players
                renderActionSeatAndPlayerActions(sid);
                console.log('waiting for more players to rejoin');
            } else {
                let playerName = s.getPlayerById(playerId);
                let stack = s.getStack(playerName);
                prev_round = s.getRoundName();
                console.log(`${playerName} leaves game for ${stack}`);
                // fold player
                // note: dont actually fold him (just emit folding noise)
                // s.fold(sid, playerName);
                io.sockets.to(sid).emit('fold', {
                    username: playerName,
                    stack: s.getStack(playerName),
                    pot: s.getPot(),
                    seat: s.getPlayerSeat(playerName),
                    amount: data.amount
                });
                // update client's stack size
                io.sockets.to(sid).emit('update-stack', {
                    seat: s.getPlayerSeat(playerName),
                    stack: s.getStack(playerName)
                });
                // shift action to next player in hand
                if (s.actionOnAllInPlayer(sid)) {
                    console.log('ACTION ON ALL IN PLAYER 123');
                } else {
                    // highlight cards of player in action seat and get available buttons for players
                    renderActionSeatAndPlayerActions(sid);
                }
                handlePlayerExit(playerName, true, stack);
                setTimeout(() => {
                    // check if round has ended
                    check_round(prev_round);
                }, 250);
                setTimeout(() => {
                    // notify player its their action with sound
                    if (s.getPlayerId(s.getNameByActionSeat())){
                        io.to(getSocketId(`${s.getPlayerId(s.getNameByActionSeat())}`)).emit('players-action-sound', {});
                    }
                }, 500);
            }
        });

        socket.on('start-game', (data) => {
            const playersInNextHand = s.playersInNextHand().length;
            console.log(`players in next hand: ${playersInNextHand}`);
            if (playersInNextHand >= 2 && playersInNextHand <= 10) {
                s.startGame();
                io.sockets.to(sid).emit('start-game', s.playersInfo());
                begin_round();
            } else {
                console.log("waiting on players");
            }
        });

        /**
         * @param playerName
         * @param data Player's action Object
         * @return {number} Amount bet. -1 if action cannot be performed
         */
        function performAction(playerName, data) {
            if (data.amount < 0) {
                return -1;
            }
            let actualBetAmount = 0;
            if (data.action === 'bet') {
                actualBetAmount = s.bet(playerName, data.amount);
            } else if (data.action === 'raise') {
                actualBetAmount = s.raise(playerName, data.amount);
            } else if (data.action === 'call') {
                if (s.getRoundName() === 'deal') {
                    actualBetAmount = s.callBlind(playerName);
                } else {
                    actualBetAmount = s.call(playerName);
                }
            } else if (data.action === 'fold') {
                actualBetAmount = 0;
                s.fold(playerName);
            } else if (data.action === 'check') {
                let canPerformAction = s.check(playerName);
                if (canPerformAction) {
                    actualBetAmount = 0;
                }
            }
            return actualBetAmount;
        }

        socket.on('get-buyin-info', () => {
            console.log('here!mf');
            io.sockets.to(sid).emit('get-buyin-info', s.getBuyinBuyouts());
        })
        
        socket.on('action', (data) => {
            // console.log(`data:\n${JSON.stringify(data)}`);
            let playerName = s.getPlayerById(playerId);
            if (!s.gameInProgress) {
                console.log('game hasn\'t started yet');
            } else if (s.actionSeat === s.getPlayerSeat(playerName)) {
                prev_round = s.getRoundName();
                console.log('action data', JSON.stringify(data));

                let actualBetAmount = performAction(playerName, data);
                let canPerformAction = actualBetAmount >= 0;

                if (canPerformAction) {
                    io.sockets.to(sid).emit(`${data.action}`, {
                        username: playerName,
                        stack: s.getStack(playerName),
                        pot: s.getPot(),
                        seat: s.getPlayerSeat(playerName),
                        amount: actualBetAmount
                    });
                    // update client's stack size
                    io.sockets.to(sid).emit('update-stack', {
                        seat: s.getPlayerSeat(playerName),
                        stack: s.getStack(playerName)
                    });
                    // shift action to next player in hand
                    if (s.actionOnAllInPlayer()){
                        console.log('ACTION ON ALL IN PLAYER');
                    }
                    // highlight cards of player in action seat and get available buttons for players
                    let everyoneFolded = s.checkwin().everyoneFolded;
                    check_round(prev_round);

                    setTimeout(()=>{
                        // check if round has ended
                        if (!everyoneFolded)
                            renderActionSeatAndPlayerActions(sid);
                        else
                            io.sockets.to(sid).emit('action', {
                                seat: -1
                            });
                    }, 250);
                    setTimeout(()=>{
                        // notify player its their action with sound
                        if (!everyoneFolded)
                            io.to(getSocketId(`${s.getPlayerId(s.getNameByActionSeat())}`)).emit('players-action-sound', {});
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
            console.log('already connected');
        }
    });

    const handlePlayerExit = function(playerName, gameInProgress, stack) {
        const playerId = s.getPlayerId(playerName);
        const modLeavingGame = playerId === s.getModId();
        const seat = s.getPlayerSeat(playerName);
        console.log(`${playerName} leaves game`);

        s.addBuyOut(playerName, playerId, stack);
        s.removePlayer(playerName);
        if (modLeavingGame) {
            if (s.getModId() != null){
                io.sockets.to(getSocketId(s.getModId())).emit('add-mod-abilities');
            }
        }
        io.sockets.to(getSocketId(playerId)).emit('bust', {
            removeModAbilities: modLeavingGame
        });
        io.sockets.to(sid).emit('remove-out-players', {seat: seat});

        if (gameInProgress) {
            io.sockets.to(sid).emit('buy-out', {
                playerName: playerName,
                stack: stack,
                seat: seat
            });
        }
    };
    
    //checks if round has ended (reveals next card)
    let check_round = (prev_round) => {
        let playerSeatsAllInBool = s.getAllIns();
        let data = s.checkwin();
        // SHOWDOWN CASE
        if (s.getRoundName() === 'showdown') {
            io.sockets.to(sid).emit('update-pot', {amount: s.getPot()});
            winners = s.getWinners();
            console.log('winners');
            console.log('LOSERS');
            let losers = s.getLosers();
            io.sockets.to(sid).emit('showdown', winners);

            // console.log("ALL IN");
            // console.log(s.getTableById(sid).table);
            // start new round
            setTimeout(function() {
                // handle losers
                for (let i = 0; i < losers.length; i++){
                    handlePlayerExit(losers[i].playerName, true, 0);
                }

                for (let i = 0; i < winners.length; i++){
                    // update client's stack size
                    io.sockets.to(sid).emit('update-stack', {
                        seat: s.getPlayerSeat(winners[i].playerName),
                        stack: s.getStack(winners[i].playerName)
                    });
                }

                // start new round
                startNextRoundOrWaitingForPlayers()
            }, (3000));
        } 
        // if everyone is all in before the hand is over and its the end of the round, turn over their cards and let them race
        else if (s.everyoneAllIn(sid) && prev_round !== s.getRoundName()) {
            let time = 500;
            if (s.getRoundName() === 'flop'){
                time = 4500;
            }
            else if (s.getRoundName() === 'turn'){
                time = 3000;
            }
            console.log("EVERYONE ALL IN BEFORE SHOWDOWN, TABLE THEM");
            let allInPlayerSeatsHands = [];
            for (let i = 0; i < playerSeatsAllInBool.length; i++){
                if (playerSeatsAllInBool[i]){
                    allInPlayerSeatsHands.push({
                        seat: i,
                        cards: s.getCardsByPlayerName(s.getPlayerBySeat(i))
                    });
                }
            }
            // TODO ADD NON ALL IN PLAYER WHO CALLED HERE AS WELL (will do later)
            io.sockets.to(sid).emit('turn-cards-all-in', allInPlayerSeatsHands);
            io.sockets.to(sid).emit('update-pot', {
                amount: s.getPot()
            });

            // TODO remove ability to perform actions

            while (s.getRoundName() !== 'showdown'){
                s.call(s.getNameByActionSeat());
            }
            io.sockets.to(sid).emit('render-all-in', {
                street: s.getRoundName(),
                board: s.getDeal(),
                sound: true
            });
            setTimeout(() => {
                check_round('showdown');
            }, time);
        } else if (data.everyoneFolded) {
            console.log(prev_round);
            // POTENTIALLY SEE IF prev_round can be replaced with s.getRoundName
            let winnings = s.getWinnings(prev_round);
            // console.log(data.winner);
            console.log(`${data.winner.playerName} won a pot of ${winnings}`);

            // tell clients who won the pot
            io.sockets.to(sid).emit('folds-through', {
                username: data.winner.playerName,
                amount: winnings,
                seat: s.getPlayerSeat(data.winner.playerName)
            });

            // start new round
            setTimeout(() => {
                // update client's stack size
                io.sockets.to(sid).emit('update-stack', {
                    seat: s.getPlayerSeat(data.winner.playerName),
                    stack: data.winner.chips + winnings
                });

                // update stack on the server
                console.log(`Player has ${s.getStack(data.winner.playerName)}`);
                console.log('Updating player\'s stack on the server...');
                s.updateStack(data.winner.playerName, winnings);
                console.log(`Player now has ${s.getStack(data.winner.playerName)}`);

                // next round
                startNextRoundOrWaitingForPlayers();
                
            }, (3000));
        } else if (prev_round !== s.getRoundName()) {
            io.sockets.to(sid).emit('update-pot', {amount: s.getPot()});
            io.sockets.to(sid).emit('render-board', {
                street: s.getRoundName(),
                board: s.getDeal(),
                sound: true
            });
        }
    }

    let startNextRoundOrWaitingForPlayers = () => {
        // start new round
        s.startRound();
        if (s.gameInProgress) {
            begin_round();
        } else {
            io.sockets.to(sid).emit('waiting', {});
            io.sockets.to(sid).emit('remove-out-players', {});
            io.sockets.to(sid).emit('render-board', {street: 'deal', sound: false});
            io.sockets.to(sid).emit('new-dealer', {seat: -1});
            io.sockets.to(sid).emit('update-pot', {amount: 0});
            io.sockets.to(sid).emit('clear-earnings', {});
            io.sockets.to(sid).emit('render-action-buttons', s.getAvailableActions());
            console.log('waiting for more players to rejoin!');
        }
    }

    let begin_round = () => {
        io.sockets.to(sid).emit('render-board', {street: 'deal', sound: true});
        io.sockets.to(sid).emit('remove-out-players', {});
        io.sockets.to(sid).emit('new-dealer', {seat: s.getDealerSeat()});
        io.sockets.to(sid).emit('nobody-waiting', {});
        io.sockets.to(sid).emit('update-pot', {amount: 0});
        io.sockets.to(sid).emit('clear-earnings', {});
        // io.sockets.to(sid).emit('hide-hands', {});
        io.sockets.to(sid).emit('initial-bets', {seats: s.getInitialBets()});
        let data = s.playersInfo();
        for (let i = 0; i < data.length; i++) {
            let name = data[i].playerName;
            io.to(getSocketId(`${data[i].playerid}`)).emit('render-hand', {
                cards: s.getCardsByPlayerName(name),
                seat: data[i].seat
            });
            io.sockets.to(sid).emit('update-stack', {
                seat: data[i].seat,
                stack: data[i].stack
            });

        }
        // highlight cards of player in action seat and get available buttons for players
        renderActionSeatAndPlayerActions(sid);
        // abstracting this to be able to work with bomb pots/straddles down the line
        io.to(getSocketId(s.getPlayerId(s.getNameByActionSeat()))).emit('players-action-sound', {});
    }

    let renderActionSeatAndPlayerActions = (sid) => {
        // highlight cards of player in action seat
        io.sockets.to(sid).emit('action', {
            seat: s.actionSeat
        });
        // get available actions for player to act
        // TODO: allow players to premove 
        let playerIds = s.getPlayerIds();
        for (let i = 0; i < playerIds.length; i++){
            let pid = playerIds[i];
            io.to(getSocketId(pid)).emit('render-action-buttons', s.getAvailableActions(pid));
        }
    }
});

module.exports = router;