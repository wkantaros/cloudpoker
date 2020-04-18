const router = require('express').Router();
const cookieParser = require('cookie-parser');

router.use('/:id', cookieParser(process.env.COOKIE_SECRET));

const path = require('path');
const Joi = require('@hapi/joi');
const shortid = require('shortid');
const {TableManager} = require('../server-logic');
const {playerIdFromRequest, newPlayerId, setPlayerId, TwoWayMap} = require('../persistent');
let poker = require('../../poker-logic/lib/node-poker');

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
        sessionManagers.set(sid, new SessionManager(null, sid, req.body.smallBlind, req.body.bigBlind, req.body.name, req.body.stack, false, req.body.straddleLimit, 6969));
    }
});

// maps sid -> SessionManager
// TODO: delete sid from sessionManagers when table finishes
const sessionManagers = new Map();

// hacky fix
const socket_ids = {};

class SessionManager extends TableManager {
    constructor(io, sid, smallBlind, bigBlind, hostName, hostStack, hostIsStraddling, straddleLimit, playerid) {
        let table = new poker.Table(smallBlind, bigBlind, 2, 10, 1, 500000000000, straddleLimit);
        super(table, hostName, hostStack, hostIsStraddling, playerid);
        this.io = io;
        this.sid = sid;
        this.socketMap = new TwoWayMap();
        // maps player id -> playerName when kicked
        this.kickedPlayers = {};
        this.timerDelay = -1;
        this.timer = null;
    }

    setSocketId(playerId, socketId) {
        this.socketMap.set(playerId, socketId);
    }

    getSocketId (playerId) {
        // return tableSocketMap.get(this.sid).key(playerId);
        return this.socketMap.key(playerId);
    };

    canPlayerJoin(playerId, playerName, stack, isStraddling) {
        if (super.isPlayerNameUsed(playerName)) {
            this.io.sockets.to(this.getSocketId(playerId)).emit('alert',
                {'message': `Player name ${playerName} is already taken.`});
            return false;
        }
        return true;
    }

    kickPlayer(playerId) {
        this.kickedPlayers[playerId] = super.getPlayerById(playerId);
        this.playerLeaves(playerId);
    }

    // horrible name. call playerLeaves. handlePlayerExit is basically a private method
    playerLeaves(playerId) {
        // if (!s.isActivePlayerId(playerId)) {
        //     console.log(`error: ${playerId} is inactive but received leave-game.`);
        //     return;
        // }
        if (!this.gameInProgress){
            let playerName =super.getPlayerById(playerId);
            this.handlePlayerExit(playerName);
            // highlight cards of player in action seat and get available buttons for players
            this.renderActionSeatAndPlayerActions();
            console.log('waiting for more players to rejoin');
        } else {
            let playerName =super.getPlayerById(playerId);
            let stack = super.getStack(playerName);
            let prev_round = super.getRoundName();
            console.log(`${playerName} leaves game for ${stack}`);
            // fold player
            // note: dont actually fold him (just emit folding noise)
            //super.fold(playerName);
            this.io.sockets.to(this.sid).emit('fold', {
                username: playerName,
                stack: super.getStack(playerName),
                pot: super.getPot(),
                seat: super.getPlayerSeat(playerName)
            });
            // update client's stack size
            this.io.sockets.to(this.sid).emit('update-stack', {
                seat: super.getPlayerSeat(playerName),
                stack: super.getStack(playerName)
            });
            // shift action to next player in hand
            if (super.actionOnAllInPlayer()) {
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
                const actionSeatPlayerId = super.getPlayerId(super.getNameByActionSeat());
                if (actionSeatPlayerId){
                    this.io.sockets.to(this.getSocketId(actionSeatPlayerId)).emit('players-action-sound', {});
                }
            }, 500);
        }
    }
    
    // private method
    // removes players not in the current hand
    handlePlayerExit(playerName, gameInProgress, stack) {
        const playerId = super.getPlayerId(playerName);
        const modLeavingGame = playerId === super.getModId();
        const seat = super.getPlayerSeat(playerName);
        console.log(`${playerName} leaves game`);

        super.addBuyOut(playerName, playerId, stack);
        super.removePlayer(playerName);
        if (modLeavingGame) {
            if (super.getModId() != null){
                this.io.sockets.to(this.getSocketId(super.getModId())).emit('add-mod-abilities');
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

    //checks if round has ended (reveals next card)
    check_round (prev_round) {
        let playerSeatsAllInBool = super.getAllIns();
        let data = super.checkwin();
        // SHOWDOWN CASE
        if (super.getRoundName() === 'showdown') {
            this.io.sockets.to(this.sid).emit('update-pot', {amount: super.getPot()});
            let winners = super.getWinners();
            console.log('winners');
            console.log('LOSERS');
            let losers = super.getLosers();
            this.io.sockets.to(this.sid).emit('showdown', winners);

            // start new round
            setTimeout(() => {
                // handle losers
                for (let i = 0; i < losers.length; i++){
                    this.handlePlayerExit(losers[i].playerName, true, 0);
                }

                for (let i = 0; i < winners.length; i++){
                    // update client's stack size
                    this.io.sockets.to(this.sid).emit('update-stack', {
                        seat:super.getPlayerSeat(winners[i].playerName),
                        stack:super.getStack(winners[i].playerName)
                    });
                }

                // start new round
                this.startNextRoundOrWaitingForPlayers()
            }, (3000));
        }
        // if everyone is all in before the hand is over and its the end of the round, turn over their cards and let them race
        else if (super.everyoneAllIn() && prev_round !== super.getRoundName()) {
            let time = 500;
            if (super.getRoundName() === 'flop'){
                time = 4500;
            }
            else if (super.getRoundName() === 'turn'){
                time = 3000;
            }
            console.log("EVERYONE ALL IN BEFORE SHOWDOWN, TABLE THEM");
            let allInPlayerSeatsHands = [];
            for (let i = 0; i < playerSeatsAllInBool.length; i++){
                if (playerSeatsAllInBool[i]){
                    allInPlayerSeatsHands.push({
                        seat: i,
                        cards: super.getCardsByPlayerName(super.getPlayerBySeat(i))
                    });
                }
            }
            // TODO ADD NON ALL IN PLAYER WHO CALLED HERE AS WELL (will do later)
            this.io.sockets.to(this.sid).emit('turn-cards-all-in', allInPlayerSeatsHands);
            this.io.sockets.to(this.sid).emit('update-pot', {
                amount: super.getPot()
            });

            // TODO remove ability to perform actions

            while (super.getRoundName() !== 'showdown'){
               super.call(super.getNameByActionSeat());
            }
            this.io.sockets.to(this.sid).emit('render-all-in', {
                street: super.getRoundName(),
                board: super.getDeal(),
                sound: true
            });
            setTimeout(() => {
                this.check_round('showdown');
            }, time);
        } else if (data.everyoneFolded) {
            console.log(prev_round);
            // POTENTIALLY SEE IF prev_round can be replaced with super.getRoundName
            let winnings = super.getWinnings(prev_round);
            // console.log(data.winner);
            console.log(`${data.winner.playerName} won a pot of ${winnings}`);

            // tell clients who won the pot
            this.io.sockets.to(this.sid).emit('folds-through', {
                username: data.winner.playerName,
                amount: winnings,
                seat: super.getPlayerSeat(data.winner.playerName)
            });

            // start new round
            setTimeout(() => {
                // update client's stack size
                this.io.sockets.to(this.sid).emit('update-stack', {
                    seat: super.getPlayerSeat(data.winner.playerName),
                    stack: data.winner.chips + winnings
                });

                // update stack on the server
                console.log(`Player has ${super.getStack(data.winner.playerName)}`);
                console.log('Updating player\'s stack on the server...');
                super.updateStack(data.winner.playerName, winnings);
                console.log(`Player now has ${super.getStack(data.winner.playerName)}`);

                // next round
                this.startNextRoundOrWaitingForPlayers();

            }, (3000));
        } else if (prev_round !== super.getRoundName()) {
            this.io.sockets.to(this.sid).emit('update-pot', {amount: super.getPot()});
            this.io.sockets.to(this.sid).emit('render-board', {
                street: super.getRoundName(),
                board: super.getDeal(),
                sound: true
            });
        }
    }

    startNextRoundOrWaitingForPlayers () {
        // start new round
        super.startRound();
        if (this.gameInProgress) {
            this.begin_round();
        } else {
            this.io.sockets.to(this.sid).emit('waiting', {});
            this.io.sockets.to(this.sid).emit('remove-out-players', {});
            this.io.sockets.to(this.sid).emit('render-board', {street: 'deal', sound: false});
            this.io.sockets.to(this.sid).emit('new-dealer', {seat: -1});
            this.io.sockets.to(this.sid).emit('update-pot', {amount: 0});
            this.io.sockets.to(this.sid).emit('clear-earnings', {});
            this.io.sockets.to(this.sid).emit('render-action-buttons', super.getAvailableActions());
            console.log('waiting for more players to rejoin!');
        }
    }

    begin_round() {
        this.io.sockets.to(this.sid).emit('render-board', {street: 'deal', sound: true});
        this.io.sockets.to(this.sid).emit('remove-out-players', {});
        this.io.sockets.to(this.sid).emit('new-dealer', {seat: super.getDealerSeat()});
        this.io.sockets.to(this.sid).emit('nobody-waiting', {});
        this.io.sockets.to(this.sid).emit('update-pot', {amount: 0});
        this.io.sockets.to(this.sid).emit('clear-earnings', {});
        // this.io.sockets.to(this.sid).emit('hide-hands', {});
        this.io.sockets.to(this.sid).emit('initial-bets', {seats: super.getInitialBets()});
        let data = super.playersInfo();
        for (let i = 0; i < data.length; i++) {
            let name = data[i].playerName;
            this.io.sockets.to(this.getSocketId(`${data[i].playerid}`)).emit('render-hand', {
                cards: super.getCardsByPlayerName(name),
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
        this.io.sockets.to(this.getSocketId(super.getPlayerId(super.getNameByActionSeat()))).emit('players-action-sound', {});
    }

    renderActionSeatAndPlayerActions() {
        // highlight cards of player in action seat
        this.io.sockets.to(this.sid).emit('action', {
            seat: this.actionSeat
        });
        // get available actions for player to act
        // TODO: allow players to premove
        let playerIds = super.getPlayerIds();
        for (let i = 0; i < playerIds.length; i++){
            let pid = playerIds[i];
            this.io.sockets.to(this.getSocketId(pid)).emit('render-action-buttons', super.getAvailableActions(pid));
        }
    }

    performAction(playerName, action, amount) {
        const prev_round = this.getRoundName();
        let actualBetAmount = this.performActionHelper(playerName, action, amount);
        let canPerformAction = actualBetAmount >= 0;

        if (canPerformAction) {
            this.refreshTimer();
            this.io.sockets.to(this.sid).emit(`${action}`, {
                username: playerName,
                stack: this.getStack(playerName),
                pot: this.getPot(),
                seat: this.getPlayerSeat(playerName),
                amount: actualBetAmount
            });
            // update client's stack size
            this.io.sockets.to(this.sid).emit('update-stack', {
                seat: this.getPlayerSeat(playerName),
                stack: this.getStack(playerName)
            });
            // shift action to next player in hand
            if (this.actionOnAllInPlayer()){
                console.log('ACTION ON ALL IN PLAYER');
            }
            // highlight cards of player in action seat and get available buttons for players
            let everyoneFolded = this.checkwin().everyoneFolded;
            this.check_round(prev_round);

            setTimeout(()=>{
                // check if round has ended
                if (!everyoneFolded)
                    this.renderActionSeatAndPlayerActions();
                else
                    this.io.sockets.to(this.sid).emit('action', {
                        seat: -1
                    });
            }, 250);
            setTimeout(()=>{
                // notify player its their action with sound
                if (!everyoneFolded)
                    this.io.sockets.to(this.getSocketId(`${this.getPlayerId(this.getNameByActionSeat())}`)).emit('players-action-sound', {});
            }, 500);
        }
    }

    /**
     * @param {string} playerName
     * @param {string} action Player's action
     * @param {number} amount Player's action amount. Ignored if action === 'call', 'check', or 'fold'
     * @return {number} Amount bet. -1 if action cannot be performed
     */
    performActionHelper(playerName, action, amount) {
        if (amount < 0) {
            return -1;
        }
        let actualBetAmount = 0;
        if (action === 'bet') {
            actualBetAmount = super.bet(playerName, amount);
        } else if (action === 'raise') {
            actualBetAmount = super.raise(playerName, amount);
        } else if (action === 'call') {
            if (super.getRoundName() === 'deal') {
                actualBetAmount = super.callBlind(playerName);
            } else {
                actualBetAmount = super.call(playerName);
            }
        } else if (action === 'fold') {
            actualBetAmount = 0;
            super.fold(playerName);
        } else if (action === 'check') {
            let canPerformAction = super.check(playerName);
            if (canPerformAction) {
                actualBetAmount = 0;
            }
        }
        return actualBetAmount;
    }

    setTimer (delay) {
        // If a timer is not yet set, initialize one.
        const prevTimer = this.timer;
        if (prevTimer) {
            clearTimeout(prevTimer); // cancel previous timer, if it exists
        }
        if (delay > 0) {
            this.initializeTimer(delay);
        } else if (prevTimer) { // turn off the turn timer
            this.timer = null;
            this.timerDelay = -1;
        }
        this.io.sockets.to(this.sid).emit('render-timer', {
            seat: this.actionSeat,
            time: delay
        });
    };

    initializeTimer(delay) {
        this.timer = setTimeout(delay, this.expirePlayerTurn);
        this.timerDelay = delay;
    }

    refreshTimer() {
        if (this.timer) this.timer.refresh();
    }

    expirePlayerTurn () {
        const playerName = super.getPlayerBySeat(super.actionSeat);
        const availableActions = super.getAvailableActions(playerName).availableActions;
        const action = availableActions['check'] ? 'check' : 'fold';
        this.performAction(playerName, action, 0);
    };
}

router.route('/:id').get((req, res) => {
    let sid = req.params.id;
    const s = sessionManagers.get(sid);
    if (!s) {
        res.status(404).render('pages/404');
    }
    const io = req.app.get('socketio');
    s.io = io;

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

        s.setSocketId(playerId, socket.id);

        socket.on('disconnect', (reason) => {
            console.log('pid', playerId, 'socket ID', socket.id, 'disconnect reason', reason);
            io.sockets.to(sid).emit('player-disconnect', {
                playerName: s.getPlayerById(playerId),
            });
            // io.removeAllListeners('connection');
        });

        socket.on('request-state', (data) => {
            let result = {};
            if (data.gameState) {
                result.gameState = s.gameState;
            }
            if (data.playerStates)
                result.playerStates = s.playerStates;
            if (data.handState) {
                result.handState = s.playerHandState(s.getPlayerById(playerId));
            }
            io.sockets.to(s.getSocketId(playerId)).emit('state-response', result);
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
            io.sockets.to(s.getSocketId(s.getModId())).emit('add-mod-abilities');
        }
        io.sockets.to(sid).emit('render-players', s.playersInfo());
        // highlight cards of player in action seat and get available buttons for players
        s.renderActionSeatAndPlayerActions();

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
            io.sockets.to(s.getSocketId(playerId)).emit('sync-board', {
                street: s.getRoundName(),
                board: s.getDeal(),
                sound: false
            });
            // render player's hand
            const playerName = s.getPlayerById(playerId);
            io.sockets.to(s.getSocketId(playerId)).emit('render-hand', {
                cards: s.getCardsByPlayerName(playerName),
                seat: s.getPlayerSeat(playerName)
            });

            // highlight cards of player in action seat and get available buttons for players
            s.renderActionSeatAndPlayerActions();
            // Play sound for action seat player
            if (s.getPlayerId(s.getNameByActionSeat()) === playerId) {
                io.sockets.to(s.getSocketId(playerId)).emit('players-action-sound', {});
            }
        }

        socket.on('buy-in', (data) => {
            if (!s.canPlayerJoin(playerId, data.playerName, data.stack, data.isStraddling === true)) {
                return;
            }
            s.buyin(data.playerName, playerId, data.stack, data.isStraddling === true);
            if (s.isModPlayerId(playerId)) {
                io.sockets.to(s.getSocketId(s.getModId())).emit('add-mod-abilities');
            }
            io.sockets.to(sid).emit('buy-in', data);
            io.sockets.to(sid).emit('render-players', s.playersInfo());
            // highlight cards of player in action seat and get available buttons for players
            s.renderActionSeatAndPlayerActions();
        });

        socket.on('straddle-switch', (data) => {
            s.setPlayerStraddling(playerId, data.isStraddling)
        });

        socket.on('kick-player', (data) => {
            if (s.isModPlayerId(playerId)) {
                s.kickPlayer(s.getPlayerId(data.playerName));
            }
        });

        socket.on('leave-game', (data) => {
            s.playerLeaves(playerId);
        });
        
        socket.on('set-turn-timer', (data) => { // delay
            if (s.isModPlayerId(playerId)) {
                s.setTimer(data.delay);
            }
        });

        socket.on('start-game', (data) => {
            const playersInNextHand = s.playersInNextHand().length;
            console.log(`players in next hand: ${playersInNextHand}`);
            if (playersInNextHand >= 2 && playersInNextHand <= 10) {
                s.startGame();
                io.sockets.to(sid).emit('start-game', s.playersInfo());
                s.begin_round();
            } else {
                console.log("waiting on players");
            }
        });

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
                console.log('action data', JSON.stringify(data));
                s.performAction(playerName, data.action, data.amount);
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