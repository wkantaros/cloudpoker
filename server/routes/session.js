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

class SessionManager {
    constructor(io, sid) {
        this.io = io;
        this.table = getTableById(sid);
        this.sid = sid;
        // this.socketMap = new TwoWayMap();
    }

    getSocketId (playerId) {
        return tableSocketMap.get(this.sid).key(playerId);
        // return this.socketMap.key(playerId);
    };

    // horrible name. call playerLeaves. handlePlayerExit is basically a private method
    playerLeaves(playerId) {
        // if (!s.isActivePlayerId(playerId)) {
        //     console.log(`error: ${playerId} is inactive but received leave-game.`);
        //     return;
        // }
        if (!this.table.gameInProgress){
            let playerName =this.table.getPlayerById(playerId);
            this.handlePlayerExit(playerName);
            // highlight cards of player in action seat and get available buttons for players
            this.renderActionSeatAndPlayerActions();
            console.log('waiting for more players to rejoin');
        } else {
            let playerName =this.table.getPlayerById(playerId);
            let stack = this.table.getStack(playerName);
            let prev_round = this.table.getRoundName();
            console.log(`${playerName} leaves game for ${stack}`);
            // fold player
            // note: dont actually fold him (just emit folding noise)
            //this.table.fold(playerName);
            this.io.sockets.to(this.sid).emit('fold', {
                username: playerName,
                stack:this.table.getStack(playerName),
                pot: this.table.getPot(),
                seat:this.table.getPlayerSeat(playerName)
            });
            // update client's stack size
            this.io.sockets.to(this.sid).emit('update-stack', {
                seat:this.table.getPlayerSeat(playerName),
                stack:this.table.getStack(playerName)
            });
            // shift action to next player in hand
            if (this.table.actionOnAllInPlayer()) {
                console.log('ACTION ON ALL IN PLAYER 123');
            } else {
                // highlight cards of player in action seat and get available buttons for players
                this.renderActionSeatAndPlayerActions();
            }
            this.handlePlayerExit(playerName, true, stack);
            setTimeout(() => {
                // check if round has ended
                this.check_round(prev_round);
            }, 250);
            setTimeout(() => {
                // notify player its their action with sound
                const actionSeatPlayerId = this.table.getPlayerId(this.table.getNameByActionSeat());
                if (actionSeatPlayerId){
                    this.io.sockets.to(this.getSocketId(actionSeatPlayerId).emit('players-action-sound', {}));
                }
            }, 500);
        }
    }
    
    // private method
    handlePlayerExit(playerName, gameInProgress, stack) {
        const playerId =this.table.getPlayerId(playerName);
        const modLeavingGame = playerId === this.table.getModId();
        const seat =this.table.getPlayerSeat(playerName);
        console.log(`${playerName} leaves game`);

       this.table.addBuyOut(playerName, playerId, stack);
       this.table.removePlayer(playerName);
        if (modLeavingGame) {
            if (this.table.getModId() != null){
                this.io.sockets.to(this.getSocketId(this.table.getModId())).emit('add-mod-abilities');
            }
        }
        this.io.sockets.to(this.getSocketId(playerId)).emit('bust', {
            removeModAbilities: modLeavingGame
        });
        this.io.sockets.to(this.sid).emit('remove-out-players', {seat: seat});

        if (gameInProgress) {
            this.io.sockets.to(this.sid).emit('buy-out', {
                playerName: playerName,
                stack: stack,
                seat: seat
            });
        }
    };

    expirePlayerTurn () {

    };

    setTimer (delay) {
        // If a timer is not yet set, initialize one.
        const prevTimer = this.table.getTimer();
        if (prevTimer) {
            clearTimeout(prevTimer); // cancel previous timer, if it exists
        }
       this.table.initializeTimer(delay, this.expirePlayerTurn);
        this.io.sockets.to(this.sid).emit('render-timer', {
            seat: this.table.actionSeat,
            time: delay
        });
    };

    //checks if round has ended (reveals next card)
    check_round (prev_round) {
        let playerSeatsAllInBool = this.table.getAllIns();
        let data = this.table.checkwin();
        // SHOWDOWN CASE
        if (this.table.getRoundName() === 'showdown') {
            this.io.sockets.to(this.sid).emit('update-pot', {amount: this.table.getPot()});
            let winners = this.table.getWinners();
            console.log('winners');
            console.log('LOSERS');
            let losers = this.table.getLosers();
            this.io.sockets.to(this.sid).emit('showdown', winners);

            // console.log("ALL IN");
            // console.log(this.table.table);
            // start new round
            setTimeout(() => {
                // handle losers
                for (let i = 0; i < losers.length; i++){
                    this.handlePlayerExit(losers[i].playerName, true, 0);
                }

                for (let i = 0; i < winners.length; i++){
                    // update client's stack size
                    this.io.sockets.to(this.sid).emit('update-stack', {
                        seat:this.table.getPlayerSeat(winners[i].playerName),
                        stack:this.table.getStack(winners[i].playerName)
                    });
                }

                // start new round
                this.startNextRoundOrWaitingForPlayers()
            }, (3000));
        }
        // if everyone is all in before the hand is over and its the end of the round, turn over their cards and let them race
        else if (this.table.everyoneAllIn() && prev_round !== this.table.getRoundName()) {
            let time = 500;
            if (this.table.getRoundName() === 'flop'){
                time = 4500;
            }
            else if (this.table.getRoundName() === 'turn'){
                time = 3000;
            }
            console.log("EVERYONE ALL IN BEFORE SHOWDOWN, TABLE THEM");
            let allInPlayerSeatsHands = [];
            for (let i = 0; i < playerSeatsAllInBool.length; i++){
                if (playerSeatsAllInBool[i]){
                    allInPlayerSeatsHands.push({
                        seat: i,
                        cards:this.table.getCardsByPlayerName(this.table.getPlayerBySeat(i))
                    });
                }
            }
            // TODO ADD NON ALL IN PLAYER WHO CALLED HERE AS WELL (will do later)
            this.io.sockets.to(this.sid).emit('turn-cards-all-in', allInPlayerSeatsHands);
            this.io.sockets.to(this.sid).emit('update-pot', {
                amount: this.table.getPot()
            });

            // TODO remove ability to perform actions

            while (this.table.getRoundName() !== 'showdown'){
               this.table.call(this.table.getNameByActionSeat());
            }
            this.io.sockets.to(this.sid).emit('render-all-in', {
                street: this.table.getRoundName(),
                board: this.table.getDeal(),
                sound: true
            });
            setTimeout(() => {
                this.check_round('showdown');
            }, time);
        } else if (data.everyoneFolded) {
            console.log(prev_round);
            // POTENTIALLY SEE IF prev_round can be replaced with this.table.getRoundName
            let winnings = this.table.getWinnings(prev_round);
            // console.log(data.winner);
            console.log(`${data.winner.playerName} won a pot of ${winnings}`);

            // tell clients who won the pot
            this.io.sockets.to(this.sid).emit('folds-through', {
                username: data.winner.playerName,
                amount: winnings,
                seat: this.table.getPlayerSeat(data.winner.playerName)
            });

            // start new round
            setTimeout(() => {
                // update client's stack size
                this.io.sockets.to(this.sid).emit('update-stack', {
                    seat: this.table.getPlayerSeat(data.winner.playerName),
                    stack: data.winner.chips + winnings
                });

                // update stack on the server
                console.log(`Player has ${this.table.getStack(data.winner.playerName)}`);
                console.log('Updating player\'s stack on the server...');
                this.table.updateStack(data.winner.playerName, winnings);
                console.log(`Player now has ${this.table.getStack(data.winner.playerName)}`);

                // next round
                this.startNextRoundOrWaitingForPlayers();

            }, (3000));
        } else if (prev_round !== this.table.getRoundName()) {
            this.io.sockets.to(this.sid).emit('update-pot', {amount: this.table.getPot()});
            this.io.sockets.to(this.sid).emit('render-board', {
                street: this.table.getRoundName(),
                board: this.table.getDeal(),
                sound: true
            });
        }
    }

    startNextRoundOrWaitingForPlayers () {
        // start new round
        this.table.startRound();
        if (this.table.gameInProgress) {
            this.begin_round();
        } else {
            this.io.sockets.to(this.sid).emit('waiting', {});
            this.io.sockets.to(this.sid).emit('remove-out-players', {});
            this.io.sockets.to(this.sid).emit('render-board', {street: 'deal', sound: false});
            this.io.sockets.to(this.sid).emit('new-dealer', {seat: -1});
            this.io.sockets.to(this.sid).emit('update-pot', {amount: 0});
            this.io.sockets.to(this.sid).emit('clear-earnings', {});
            this.io.sockets.to(this.sid).emit('render-action-buttons', this.table.getAvailableActions());
            console.log('waiting for more players to rejoin!');
        }
    }

    begin_round() {
        this.io.sockets.to(this.sid).emit('render-board', {street: 'deal', sound: true});
        this.io.sockets.to(this.sid).emit('remove-out-players', {});
        this.io.sockets.to(this.sid).emit('new-dealer', {seat: this.table.getDealerSeat()});
        this.io.sockets.to(this.sid).emit('nobody-waiting', {});
        this.io.sockets.to(this.sid).emit('update-pot', {amount: 0});
        this.io.sockets.to(this.sid).emit('clear-earnings', {});
        // this.io.sockets.to(this.sid).emit('hide-hands', {});
        this.io.sockets.to(this.sid).emit('initial-bets', {seats: this.table.getInitialBets()});
        let data = this.table.playersInfo();
        for (let i = 0; i < data.length; i++) {
            let name = data[i].playerName;
            this.io.sockets.to(this.getSocketId(`${data[i].playerid}`)).emit('render-hand', {
                cards: this.table.getCardsByPlayerName(name),
                seat: data[i].seat
            });
            this.io.sockets.to(this.sid).emit('update-stack', {
                seat: data[i].seat,
                stack: data[i].stack
            });

        }
        // highlight cards of player in action seat and get available buttons for players
        this.renderActionSeatAndPlayerActions();
        // abstracting this to be able to work with bomb pots/straddles down the line
        this.io.sockets.to(this.getSocketId(this.table.getPlayerId(this.table.getNameByActionSeat()))).emit('players-action-sound', {});
    }

    renderActionSeatAndPlayerActions() {
        // highlight cards of player in action seat
        this.io.sockets.to(this.sid).emit('action', {
            seat: this.table.actionSeat
        });
        // get available actions for player to act
        // TODO: allow players to premove
        let playerIds = this.table.getPlayerIds();
        for (let i = 0; i < playerIds.length; i++){
            let pid = playerIds[i];
            this.io.sockets.to(this.getSocketId(pid)).emit('render-action-buttons', this.table.getAvailableActions(pid));
        }
    }
}

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
    const sm = new SessionManager(io, sid);
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

        socket.on('disconnect', (reason) => {
            console.log('pid', playerId, 'socket ID', socket.id, 'disconnect reason', reason);
            io.sockets.to(sid).emit('player-disconnect', {
                playerName: s.getPlayerById(playerId),
            });
            // io.removeAllListeners('connection');
        });

        // make sure host has a socketid associate with name (player who sent in login form)

        if (s.getModId() != null && s.getModId() === 6969) {
            s.updatePlayerId(s.getPlayerById(s.getModId()), playerId);
            console.log('updating hostname playerid to:', playerId);
        }
        console.log('a user connected at', socket.id, 'with player ID', playerId);

        //adds socket to room (actually a sick feature)
        socket.join(sid);
        if (s.getModId(sid) != null){
            io.sockets.to(sm.getSocketId(s.getModId())).emit('add-mod-abilities');
        }
        io.sockets.to(sid).emit('render-players', s.playersInfo());
        // highlight cards of player in action seat and get available buttons for players
        sm.renderActionSeatAndPlayerActions();

        // chatroom features
        // send a message in the chatroom
        socket.on('chat', (data) => {
            io.sockets.to(sid).emit('chat', {
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
            io.sockets.to(sid).emit('player-reconnect', {
                playerName: s.getPlayerById(playerId),
            });
            io.sockets.to(sm.getSocketId(playerId)).emit('sync-board', {
                street: s.getRoundName(),
                board: s.getDeal(),
                sound: true
            });
            // render player's hand
            const playerName = s.getPlayerById(playerId);
            io.sockets.to(sm.getSocketId(playerId)).emit('render-hand', {
                cards: s.getCardsByPlayerName(playerName),
                seat: s.getPlayerSeat(playerName)
            });

            // highlight cards of player in action seat and get available buttons for players
            sm.renderActionSeatAndPlayerActions();
            // Play sound for action seat player
            if (s.getPlayerId(s.getNameByActionSeat()) === playerId) {
                io.sockets.to(sm.getSocketId(playerId)).emit('players-action-sound', {});
            }
        }

        socket.on('buy-in', (data) => {
            if (s.isPlayerNameUsed(data.playerName)) {
                io.sockets.to(sm.getSocketId(playerId)).emit('alert',
                    {'message': `Player name ${data.playerName} is already taken.`});
                return;
            }
            s.buyin(data.playerName, playerId, data.stack, data.isStraddling === true);
            if (s.getModId() === playerId) {
                io.sockets.to(sm.getSocketId(s.getModId())).emit('add-mod-abilities');
            }
            io.sockets.to(sid).emit('buy-in', data);
            io.sockets.to(sid).emit('render-players', s.playersInfo());
            // highlight cards of player in action seat and get available buttons for players
            sm.renderActionSeatAndPlayerActions();
        });

        socket.on('straddle-switch', (data) => {
            s.setPlayerStraddling(playerId, data.isStraddling)
        });

        socket.on('kick-player', (data) => {
            sm.playerLeaves(s.getPlayerId(playerId));
        });

        socket.on('leave-game', (data) => {
            sm.playerLeaves(playerId);
        });
        
        socket.on('set-turn-timer', (data) => { // delay
            if (playerId === s.getModId()) {
                sm.setTimer(data.delay);
            }
        });

        socket.on('start-game', (data) => {
            const playersInNextHand = s.playersInNextHand().length;
            console.log(`players in next hand: ${playersInNextHand}`);
            if (playersInNextHand >= 2 && playersInNextHand <= 10) {
                s.startGame();
                io.sockets.to(sid).emit('start-game', s.playersInfo());
                sm.begin_round();
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
                    sm.check_round(prev_round);

                    setTimeout(()=>{
                        // check if round has ended
                        if (!everyoneFolded)
                            sm.renderActionSeatAndPlayerActions();
                        else
                            io.sockets.to(sid).emit('action', {
                                seat: -1
                            });
                    }, 250);
                    setTimeout(()=>{
                        // notify player its their action with sound
                        if (!everyoneFolded)
                            io.sockets.to(sm.getSocketId(`${s.getPlayerId(s.getNameByActionSeat())}`)).emit('players-action-sound', {});
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
});

module.exports = router;