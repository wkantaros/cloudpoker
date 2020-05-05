const router = require('express').Router();
const cookieParser = require('cookie-parser');
const xss = require("xss");

router.use('/:id', cookieParser(process.env.COOKIE_SECRET));

const path = require('path');
const Joi = require('@hapi/joi');
const shortid = require('shortid');
import {TableManager} from '../server-logic';
import {playerIdFromRequest, newPlayerId, setPlayerIdCookie, TwoWayMap} from '../persistent';
import {asyncErrorHandler, sleep, asyncSchemaValidator, formatJoiError} from '../funcs';
import * as poker from '../poker-logic/lib/node-poker';
// import (.*) from (\S*);
// const $1 = require($2);
//
// const {TableManager} = require('../server-logic');
// const {playerIdFromRequest, newPlayerId, setPlayerIdCookie, TwoWayMap} = require('../persistent');
// const {asyncErrorHandler, sleep, asyncSchemaValidator} = require('../funcs');
// const poker = require('../../poker-logic/lib/node-poker');

const validateTableName = (val) => {
    if (!val || val.length === 0) return val;
    val = val.replace(/\s/g, '-'); // replace spaces with hyphens
    if (!sessionManagers.has(val)) return val;
    throw new Error(`table name ${val} is already taken`);
}

// Information host submits for game (name, stack, bb, sb)
router.route('/').post(asyncErrorHandler(async (req, res) => {
    //scheme to ensure valid username
    const schema = Joi.object({
        // username: Joi.string().alphanum().min(2).max(10)
        tableName: Joi.string().trim().min(2).max(15)
            // matches only letters, numbers, - (hyphen), _ (underscore), and " " (space)
            .regex(/[a-zA-Z0-9-_\s]+$/, 'no-punctuation')
            .external(validateTableName),
        username: Joi.string().regex(/^\w+(?:\s+\w+)*$/, 'no-punctuation').min(2).max(10),
        smallBlind: Joi.number().integer().min(0),
        bigBlind: Joi.number().integer().min(1),
        stack: Joi.number().integer().min(1),
        straddleLimit: Joi.number().integer().min(-1),
    });
    if (process.env.DEBUG === 'true') {
        req.body.name = req.body.name || 'debugName';
    }
    if (!req.body.tableName) {
        req.body.tableName = shortid.generate();
    }
    let value;
    try {
        value = await schema.validateAsync({
            tableName: req.body.tableName,
            username: req.body.name,
            smallBlind: req.body.smallBlind,
            bigBlind: req.body.bigBlind,
            stack: req.body.stack,
            straddleLimit: req.body.straddleLimit,
        });
    } catch (error) {
        res.status(422);
        let message;
        if (error.isJoi) {
            message = formatJoiError(error);
        } else {
            message = error.hasOwnProperty('message') ? error.message : error;
        }
        await res.json({
            isValid: false,
            message: message
        });
        return;
    }
    value.isValid = true;
    await res.json(value);
    console.log(`starting new table with id: ${value.tableName}`);
    sessionManagers.set(value.tableName, new SessionManager(null, value.tableName, req.body.smallBlind, req.body.bigBlind, req.body.name, req.body.stack, false, req.body.straddleLimit, 6969));
}));

// maps sid -> SessionManager
// TODO: delete sid from sessionManagers when table finishes
const sessionManagers = new Map();

// hacky fix
const socket_ids = {};

class SessionManager extends TableManager {
    // io;
    // sid;
    // socketMap;
    // timer;
    // raceInProgress;
    // raceSchedule;
    constructor(io, sid, smallBlind, bigBlind, hostName, hostStack, hostIsStraddling, straddleLimit, playerid) {
        let table = new poker.Table(smallBlind, bigBlind, 2, 10, 1, 500000000000, straddleLimit);
        super(table, hostName, hostStack, hostIsStraddling, playerid);
        this.io = io;
        this.sid = sid;
        this.socketMap = new Map();
        // maps player id -> playerName when kicked
        this.kickedPlayers = {};
        this.timerDelay = -1;
        this.timer = null;
        this.raceInProgress = false;
        this.raceSchedule = null;
    }

    setSocket(playerId, socket) {
        this.socketMap.set(playerId, socket);
    }

    getSocket (playerId) {
        return this.socketMap.get(playerId);
    };

    getSocketId (playerId) {
        return this.getSocket(playerId).id;
    };

    canPlayerJoin(playerId, playerName, stack, isStraddling) {
        if (super.isPlayerNameUsed(playerName)) {
            this.io.sockets.to(this.getSocketId(playerId)).emit('alert',
                {'message': `Player name ${playerName} is already taken.`});
            return false;
        }
        return true;
    }

    emitAction(action, playerName, betAmount) {
        this.sendTableState();
        this.io.sockets.to(this.sid).emit(action, {
            username: playerName,
            stack: this.getStack(playerName),
            pot: this.getPot(),
            seat: this.getPlayerSeat(playerName),
            amount: betAmount
        });
        // update client's stack size
        // this.io.sockets.to(this.sid).emit('update-stack', {
        //     seat: this.getPlayerSeat(playerName),
        //     stack: this.getStack(playerName)
        // });
    }

    sendTableState() {
        // let data = {
        //     table: this.table.getPublicInfo(),
        //     gameInProgress: this.gameInProgress,
        // };
        this.sendTableStateTo(`${this.sid}-guest`, 'guest');
        // send each active player
        for (let p of this.table.allPlayers) {
            // this.getPlayerId(p.playerName) is falsy if handlePlayerExit called this function.
            if (!p || !this.getPlayerId(p.playerName)) continue;
            this.sendTableStateTo(this.getSocketId(this.getPlayerId(p.playerName)), p.playerName)
        }
    }

    // sends playerName a snapshot that includes their private data (cards)
    sendTableStateTo(socketId, playerName) {
        let table = this.table.getPublicInfo();

        const p = this.table.getPlayer(playerName);
        if (p) {
            table = Object.assign({}, table); // shallow copy
            table.allPlayers = Array.from(table.allPlayers); // shallow copy
            Object.assign(table.allPlayers[p.seat], p);
            delete table.allPlayers[p.seat].hand; // hacky
        }

        this.io.sockets.to(socketId).emit('state-snapshot', {
            table: table,
            gameInProgress: this.gameInProgress,
            player: p,
            raceInProgress: this.raceInProgress,
            raceSchedule: this.raceSchedule,
        });
    }

    addPlayer(playerName) {
        this.sendTableState();

        const socketId = this.getSocketId(this.getPlayerId(playerName));
        const newPlayer = this.table.getPlayer(playerName);
        if (newPlayer.isMod) this.io.sockets.to(socketId).emit('add-mod-abilities');
        this.io.sockets.to(this.sid).emit('buy-in', {
            playerName: playerName,
            stack: newPlayer.chips,
        });
        this.renderActionSeatAndPlayerActions();
    }

    async kickPlayer(playerId) {
        // this.kickedPlayers[playerId] = super.getPlayerById(playerId);
        // MAY BE AN ERROR HERE CHECK AGAIN
        let playerName = this.getPlayerById(playerId);
        await this.performAction(playerName, 'fold', 0);
        await this.playerLeaves(playerId);
    }

    async standUpPlayer(playerName) {
        if (this.isPlayerStandingUp(playerName)) return;

        if (this.gameInProgress && this.getPlayer(playerName).inHand && !this.hasPlayerFolded(playerName)) {
            this.emitAction('fold', playerName, 0);
        }
        let prev_round = super.getRoundName();
        super.standUpPlayer(playerName);
        // check if round has ended
        await this.check_round(prev_round);
        // this.sendTableState();
        this.renderActionSeatAndPlayerActions();
        // this.io.sockets.to(this.sid).emit('render-players', this.playersInfo());
        this.io.sockets.to(this.sid).emit('stand-up', {playerName: playerName, seat: this.getPlayerSeat(playerName)});
    }
    sitDownPlayer(playerName) {
        if (!this.isPlayerStandingUp(playerName)) return;

        super.sitDownPlayer(playerName);
        this.sendTableState();
        // this.io.sockets.to(this.sid).emit('render-players', this.playersInfo());
        this.io.sockets.to(this.sid).emit('sit-down', {playerName: playerName, seat: this.getPlayerSeat(playerName)});
        this.renderActionSeatAndPlayerActions(); // if <= 1 player is sitting down, host can now start game.
    }

    // horrible name. call playerLeaves. handlePlayerExit is basically a private method
    async playerLeaves(playerId) {
        let playerName = super.getPlayerById(playerId);
        if (!this.gameInProgress || !this.getPlayer(playerName).inHand){
            this.handlePlayerExit(playerName);
            // highlight cards of player in action seat and get available buttons for players
            this.renderActionSeatAndPlayerActions();
            console.log('waiting for more players to rejoin');
        } else {
            let stack = super.getStack(playerName);
            let prev_round = super.getRoundName();
            console.log(`${playerName} leaves game for ${stack}`);
            // fold player
            // note: dont actually fold him (just emit folding noise)
            //super.fold(playerName);
            this.emitAction('fold', playerName, 0);
            // shift action to next player in hand
            if (super.actionOnAllInPlayer()) {
                console.log('ACTION ON ALL IN PLAYER 123');
            } else {
                // highlight cards of player in action seat and get available buttons for players
                this.renderActionSeatAndPlayerActions();
            }

            this.handlePlayerExit(playerName);
            await sleep(250);
            // check if round has ended
            await this.check_round(prev_round);

            await sleep(250);
            // notify player its their action with sound
            const actionSeatPlayerId = super.getPlayerId(super.getNameByActionSeat());
            if (actionSeatPlayerId){
                this.io.sockets.to(this.getSocketId(actionSeatPlayerId)).emit('players-action-sound', {});
            }
        }
        this.sendTableState();
    }
    
    // private method
    // removes players not in the current hand
    handlePlayerExit(playerName) {
        const playerId = super.getPlayerId(playerName);
        const modLeavingGame = playerId === super.getModId();
        const seat = super.getPlayerSeat(playerName);
        console.log(`${playerName} leaves game`);

        const stack = this.getStack(playerName);
        super.addBuyOut(playerName, playerId, stack);
        super.removePlayer(playerName);

        this.getSocket(playerId).leave(`${this.sid}-active`);
        this.getSocket(playerId).join(`${this.sid}-guest`);
        this.sendTableState();

        if (modLeavingGame) {
            if (super.getModId() != null){
                this.io.sockets.to(this.getSocketId(super.getModId())).emit('add-mod-abilities');
            }
        }
        this.io.sockets.to(this.getSocketId(playerId)).emit('bust', {
            removeModAbilities: modLeavingGame
        });

        if (this.gameInProgress) {
            this.io.sockets.to(this.sid).emit('buy-out', {
                playerName: playerName,
                stack: stack,
                seat: seat
            });
        }
    };

    async allInRace() {
        console.log("EVERYONE ALL IN BEFORE SHOWDOWN, TABLE THEM");
        this.raceInProgress = true;
        this.raceSchedule = {'flop': 0, 'turn': 0, 'river': 0};
        // TODO: a player doesn't have to show their cards if they were not the last person to raise
        let playersShowingCards = this.table.players.filter(p=>p.allIn || !p.folded || p.showingCards);
        for (let p of playersShowingCards) {
            p.showHand();
        }
        this.renderActionSeatAndPlayerActions();
        this.sendTableState(); // show players' cards and hand rank messages
        let prevRound = super.getRoundName();
        // let handRanks = {};
        // handRanks[prevRound] = playersShowingCards.map(p => {
        //     return {seat: p.seat, handRankMessage: this.playerHandState(p.playerName).handRankMessage};
        // });

        // TODO: this shows hand rank message from next round but card from next round has not turned over yet (but
        //  will when render-all-in is sent
        // this.io.sockets.to(this.sid).emit('turn-cards-all-in', playersShowingCards.map(p=>{
        //     return {seat: p.seat, cards: super.getCardsByPlayerName(p.playerName), handRankMessage: this.playerHandState(p.playerName).handRankMessage};
        // }));
        // this.io.sockets.to(this.sid).emit('update-pot', {
        //     amount: super.getPot()
        // });

        const waitTime = 2000;
        let currentTime = Date.now();
        let sleepTime = 0;
        while (super.getRoundName() !== 'showdown'){
            super.call(super.getNameByActionSeat());
            if (super.getRoundName() !== prevRound && super.getRoundName() !== 'showdown') {
                prevRound = super.getRoundName();
                sleepTime += waitTime;
                await sleep(waitTime);
                this.sendTableState();
                this.raceSchedule[prevRound] = currentTime + sleepTime;
                // handRanks[prevRound] = playersShowingCards.map(p => {
                //     return {seat: p.seat, handRankMessage: this.playerHandState(p.playerName).handRankMessage};
                // });
            }
        }
        // if (sleepTime > 0) {
        //     this.sendTableState();
        //     await sleep(sleepTime); // wait before starting next round or continuing
        // }
        this.raceInProgress = false;
        this.raceSchedule = null;
        this.sendTableState();
        // this.io.sockets.to(this.sid).emit('render-all-in', {
        //     street: super.getRoundName(),
        //     board: super.getDeal(),
        //     sound: true,
        //     handRanks: null, // not a mistake. handRanks should not be used
        // });
    }

    async handleEveryoneFolded(prev_round, data) {
        // TODO: ANYONE CAN REVEAL HAND HERE
        this.renderActionSeatAndPlayerActions();
        console.log(prev_round);
        // POTENTIALLY SEE IF prev_round can be replaced with super.getRoundName
        let winnings = super.getWinnings(prev_round);
        // console.log(data.winner);
        console.log(`${data.winner.playerName} won a pot of ${winnings}`);
        // TODO: the below is extremely hacky and a horrible solution. find a better way to send
        //  earnings to the client when everyone folded, ideally by having Table itself (in node-poker)
        //  edit game.winners as it does in checkForWinner in other situations.
        this.table.game.winners.push({
            playerName: data.winner.playerName,
            amount: data.pot,
            hand: data.winner.hand,
            chips: data.winner.chips,
            seat: data.winner.seat,
        });
        this.sendTableState();
        // tell clients who won the pot
        this.io.sockets.to(this.sid).emit('folds-through', {
            username: data.winner.playerName,
            amount: winnings,
            seat: super.getPlayerSeat(data.winner.playerName)
        });

        await sleep(3000);
        // update client's stack size
        // this.io.sockets.to(this.sid).emit('update-stack', {
        //     seat: super.getPlayerSeat(data.winner.playerName),
        //     stack: data.winner.chips + winnings
        // });

        // update stack on the server
        console.log(`Player has ${super.getStack(data.winner.playerName)}`);
        console.log('Updating player\'s stack on the server...');
        super.updateStack(data.winner.playerName, winnings);
        console.log(`Player now has ${super.getStack(data.winner.playerName)}`);

        // next round
        this.startNextRoundOrWaitingForPlayers();
    }

    //checks if round has ended (reveals next card)
    async check_round (prev_round) {
        let data = super.checkwin();

        // SHOWDOWN CASE
        if (super.getRoundName() === 'showdown') {
            this.sendTableState();
            // TODO: ANYONE CAN REVEAL HAND HERE
            this.renderActionSeatAndPlayerActions();
            // this.io.sockets.to(this.sid).emit('update-pot', {amount: super.getPot()});
            let winners = this.getWinners();
            console.log('winners');
            console.log('LOSERS');
            let losers = super.getLosers();
            this.io.sockets.to(this.sid).emit('showdown', winners);

            await sleep(3000);
            // handle losers
            for (let i = 0; i < losers.length; i++){
                this.handlePlayerExit(losers[i].playerName);
            }
            this.sendTableState();
            // for (let i = 0; i < winners.length; i++){
            //     // update client's stack size
            //     this.io.sockets.to(this.sid).emit('update-stack', {
            //         seat: super.getPlayerSeat(winners[i].playerName),
            //         stack: super.getStack(winners[i].playerName)
            //     });
            // }

            // start new round
            this.startNextRoundOrWaitingForPlayers()
        }
        // if everyone is all in before the hand is over and its the end of the round, turn over their cards and let them race
        else if (super.isEveryoneAllIn() && prev_round !== super.getRoundName()) {
            // TODO: ANYONE CAN REVEAL HAND HERE
            // let time = 500;
            // if (super.getRoundName() === 'flop'){
            //     time = 4500;
            // }
            // else if (super.getRoundName() === 'turn'){
            //     time = 3000;
            // }
            console.log('doing all in race');
            await this.allInRace();
            await this.check_round('showdown');
        } else if (data.everyoneFolded) {
            this.sendTableState();
            await this.handleEveryoneFolded(prev_round, data);
        } else if (prev_round !== super.getRoundName()) {
            // this.io.sockets.to(this.sid).emit('update-pot', {amount: super.getPot()});
            // this.updateAfterCardTurn(false);
        }
        this.sendTableState();
    }

    // updates the board and hand rank messages after turning a card.
    // if allInRace is true, sends each hand rank message to this.sid.
    // if allInRace is false, sends each hand rank message to the respective player.
    // updateAfterCardTurn(allInRace) {
    //     this.io.sockets.to(this.sid).emit('render-board', {
    //         street: super.getRoundName(),
    //         board: super.getDeal(),
    //         sound: true
    //     });
    //     // TODO: don't think we need to send update-rank is we call this.sendTableState
    //     for (let i = 0; i < this.table.players.length; i++) {
    //         const p = this.table.players[i];
    //         const socketId = allInRace ? this.sid : this.getSocketId(this.getPlayerId(p.playerName));
    //         this.io.sockets.to(socketId).emit('update-rank', {
    //             seat: super.getPlayerSeat(p.playerName),
    //             handRankMessage: this.playerHandState(p.playerName).handRankMessage,
    //         });
    //     }
    // }

    // resetAfterRound() {
    //     this.sendTableState();
    //     this.io.sockets.to(this.sid).emit('render-board', {street: 'deal', sound: this.gameInProgress});
    //     this.io.sockets.to(this.sid).emit('update-pot', {amount: 0});
    // }

    startNextRoundOrWaitingForPlayers () {
        // start new round
        super.startRound();
        if (this.gameInProgress) {
            this.begin_round();
        } else {
            this.sendTableState();
            // this.resetAfterRound();
            this.io.sockets.to(this.sid).emit('render-action-buttons', super.getAvailableActions());
            console.log('waiting for more players to rejoin!');
        }
    }

    begin_round() {
        this.io.sockets.to(this.sid).emit('update-header-blinds', {bigBlind: this.table.bigBlind, smallBlind: this.table.smallBlind});
        // this.io.sockets.to(this.sid).emit('nobody-waiting', {});
        this.sendTableState();
        // this.resetAfterRound();
        // let data = super.playersInfo();
        // for (let i = 0; i < data.length; i++) {
        //     let name = data[i].playerName;
        //     if (this.getPlayer(name).inHand) {
        //         this.io.sockets.to(this.getSocketId(`${data[i].playerid}`)).emit('render-hand', {
        //             cards: super.getCardsByPlayerName(name),
        //             seat: data[i].seat,
        //             folded: false,
        //             handRankMessage: this.playerHandState(name).handRankMessage,
        //         });
        //     }
        //     // else {
        //     //     this.io.sockets.to(this.sid).emit()
        //     // }
        //     this.io.sockets.to(this.sid).emit('update-stack', {
        //         seat: data[i].seat,
        //         stack: data[i].stack
        //     });
        //
        // }
        // highlight cards of player in action seat and get available buttons for players
        this.renderActionSeatAndPlayerActions();
        // abstracting this to be able to work with bomb pots/straddles down the line
        this.io.sockets.to(this.getSocketId(super.getPlayerId(super.getNameByActionSeat()))).emit('players-action-sound', {});
    }

    renderActionSeatAndPlayerActions() {
        // get available actions for player to act
        // TODO: allow players to premove
        for (let playerName in this.playerids) {
            if (this.playerids.hasOwnProperty(playerName)) {
                this.io.sockets.to(this.getSocketId(this.playerids[playerName].playerid)).emit('render-action-buttons', super.getAvailableActions(playerName));
            }
        }
    }

    async performAction(playerName, action, amount) {
        const prev_round = this.getRoundName();
        let actualBetAmount = this.performActionHelper(playerName, action, amount);
        let canPerformAction = actualBetAmount >= 0;

        if (canPerformAction) {
            this.refreshTimer();
            this.emitAction(action, playerName, actualBetAmount);
            // shift action to next player in hand
            if (this.actionOnAllInPlayer()){
                console.log('ACTION ON ALL IN PLAYER');
            }
            // highlight cards of player in action seat and get available buttons for players
            let everyoneFolded = this.checkwin().everyoneFolded;
            await this.check_round(prev_round);

            await sleep(250);
            // check if round has ended
            if (!everyoneFolded)
                this.renderActionSeatAndPlayerActions();

            await sleep(250);
            // notify player its their action with sound
            if (!everyoneFolded)
                this.io.sockets.to(this.getSocketId(`${this.getPlayerId(this.getNameByActionSeat())}`)).emit('players-action-sound', {});
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

    async expirePlayerTurn () {
        const playerName = super.getPlayerBySeat(super.actionSeat);
        const availableActions = super.getAvailableActions(playerName).availableActions;
        const action = availableActions['check'] ? 'check' : 'fold';
        await this.performAction(playerName, action, 0);
    };

    canSendMessage(playerId, message) {
        return message.length > 0;
    }
}

router.route('/:id').get(asyncErrorHandler((req, res) => {
    let sid = req.params.id;
    const s = sessionManagers.get(sid);
    if (!s) {
        res.redirect('/');
        return;
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
        setPlayerIdCookie(playerId, req, res);
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
        callAmount: s.maxBet,
        standingUp: s.isActivePlayerId(playerId) && s.isPlayerStandingUp(s.getPlayerById(playerId)), // todo soon
    });

    // hacky
    let socket_id = [];
    io.once('connection', async function (socket) {
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

        s.setSocket(playerId, socket);

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
            io.sockets.to(s.getSocketId(s.getModId())).emit('add-mod-abilities');
        }
        // io.sockets.to(sid).emit('render-players', s.playersInfo());
        // highlight cards of player in action seat and get available buttons for players
        s.renderActionSeatAndPlayerActions();

        const chatSchema = Joi.object({
            message: Joi.string().trim().min(1).external(xss).required()
        });
        // chatroom features
        // send a message in the chatroom
        socket.on('chat', asyncSchemaValidator(chatSchema,(data) => {
            io.sockets.to(sid).emit('chat', {
                handle: s.getPlayerById(playerId),
                message: data.message
            });
        }));

        // typing
        socket.on('typing', () => {
            socket.broadcast.to(sid).emit('typing', s.getPlayerById(playerId));
        });

        s.sendTableStateTo(socket.id, s.getPlayerById(playerId));

        const isActivePlayerIdValidator = function(value) {
            if (!s.isActivePlayerId(playerId)) throw new Error('inactive player id');
            return value;
        }
        const isModValidator = function(value) {
            if (!s.isModPlayerId(playerId)) throw new Error('not a mod player id');
            return value;
        }
        if (!isNewPlayer) {
            socket.join(`${sid}-active`);
            io.sockets.to(s.getSocketId(playerId)).emit('log-in', {});
        } else {
            socket.join(`${sid}-guest`);
        }

        if (!isNewPlayer && s.gameInProgress) {
            // TODO: get returning player in sync with hand.
            //  render his cards, etc.
            console.log(`syncing ${s.getPlayerById(playerId)}`);
            io.sockets.to(sid).emit('player-reconnect', {
                playerName: s.getPlayerById(playerId),
            });
            // render player's hand
            const playerName = s.getPlayerById(playerId);
            if (s.getPlayer(playerName).inHand) {
                // io.sockets.to(s.getSocketId(playerId)).emit('render-hand', {
                //     cards: s.getCardsByPlayerName(playerName),
                //     seat: s.getPlayerSeat(playerName),
                //     folded: s.hasPlayerFolded(playerName),
                //     handRankMessage: s.playerHandState(playerName).handRankMessage,
                // });

                // highlight cards of player in action seat and get available buttons for players
                s.renderActionSeatAndPlayerActions();
                // Play sound for action seat player
                if (s.getPlayerId(s.getNameByActionSeat()) === playerId) {
                    io.sockets.to(s.getSocketId(playerId)).emit('players-action-sound', {});
                }
            }
        }

        const buyInSchema = Joi.object({
            playerName: Joi.string().trim().min(2).external(xss).required(),
            stack: Joi.number().min(0).required(),
            isStraddling: Joi.boolean()
        });
        socket.on('buy-in', asyncSchemaValidator(buyInSchema, (data) => {
            if (!s.canPlayerJoin(playerId, data.playerName, data.stack, data.isStraddling === true)) {
                return;
            }
            socket.leave(`${sid}-guest`);
            socket.join(`${sid}-active`);
            const addedPlayer = s.buyin(data.playerName, playerId, data.stack, data.isStraddling === true);
            if (addedPlayer) {
                s.addPlayer(data.playerName);
            } else {
                console.log('buyin returned false for data:', JSON.stringify(data));
            }
            s.sendTableState();
        }));

        const straddleSwitchSchema = Joi.object({
            isStraddling: Joi.boolean().required()
        }).external(isActivePlayerIdValidator);
        socket.on('straddle-switch', asyncSchemaValidator(straddleSwitchSchema, (data) => {
            s.setPlayerStraddling(playerId, data.isStraddling);
            s.sendTableState();
        }));

        const kickPlayerSchema = Joi.object({
            seat: Joi.number().integer().min(0).required()
        }).external(isModValidator);
        socket.on('kick-player', asyncSchemaValidator(kickPlayerSchema, async (data) => {
            let playerName = s.getPlayerBySeat(data.seat);
            console.log('kicking player', playerName)
            await s.kickPlayer(s.getPlayerId(playerName));
        }));

        socket.on('leave-game', async (data) => {
            if (!s.isActivePlayerId(playerId)) {
                console.log(`playerid ${playerId} emitted leave-game but is not an active player`);
                return;
            }
            await s.playerLeaves(playerId);
        });

        socket.on('stand-up', () => {
            if (!s.isActivePlayerId(playerId)) {
                console.log(`playerid ${playerId} emitted stand-up but is not an active player`);
                return;
            }
            s.standUpPlayer(s.getPlayerById(playerId));
        });

        socket.on('sit-down', () => {
            if (!s.isActivePlayerId(playerId)) {
                console.log(`playerid ${playerId} emitted sit-down but is not an active player`);
                return;
            }
            s.sitDownPlayer(s.getPlayerById(playerId));
        });
        
        const setTurnTimerSchema = Joi.object({delay: Joi.number().integer().required()}).external(isModValidator);
        socket.on('set-turn-timer', asyncSchemaValidator(setTurnTimerSchema, (data) => { // delay
            s.setTimer(data.delay);
        }));

        socket.on('start-game', (data) => {
            if (!s.isModPlayerId(playerId)) {
                console.log(`${s.getPlayerById(playerId)} cannot start the game because they are not a mod.`);
                return;
            }
            const playersInNextHand = s.playersInNextHand().length;
            console.log(`players in next hand: ${playersInNextHand}`);
            if (playersInNextHand >= 2 && playersInNextHand <= 10) {
                s.startGame();
                s.begin_round();
                s.sendTableState();
                io.sockets.to(sid).emit('start-game');
            } else {
                console.log("waiting on players");
            }
        });

        socket.on('show-hand', () => {
            if (!s.isActivePlayerId(playerId)) {
                console.log(`playerid ${playerId} emitted show-hand but is not an active player`);
                return;
            }
            const playerName = s.getPlayerById(playerId);
            const p = s.getPlayer(playerName);
            if (!p || !p.inHand || !s.canPlayersRevealHand()) {
                return;
            }
            p.showHand();
            s.sendTableState();
            // io.sockets.to(sid).emit('render-hand', {
            //     cards: s.getCardsByPlayerName(playerName),
            //     seat: s.getPlayerSeat(playerName),
            //     folded: s.hasPlayerFolded(playerName),
            //     handRankMessage: s.playerHandState(playerName).handRankMessage,
            // });
        });

        socket.on('get-buyin-info', () => {
            io.sockets.to(sid).emit('get-buyin-info', s.getBuyinBuyouts());
        });

        const actionSchema = Joi.object({
            action: Joi.string().min(1).required(),
            amount: Joi.number()
        }).external(isActivePlayerIdValidator);
        socket.on('action', asyncSchemaValidator(actionSchema, async (data) => {
            // console.log(`data:\n${JSON.stringify(data)}`);
            let playerName = s.getPlayerById(playerId);
            if (!s.gameInProgress) {
                console.log('game hasn\'t started yet');
            } else if (s.actionSeat === s.getPlayerSeat(playerName)) {
                console.log('action data', JSON.stringify(data));
                await s.performAction(playerName, data.action, data.amount);
            } else {
                console.log(`not ${playerName}'s action`);
            }
        }));

        const updateBlindsSchema = Joi.object({
            smallBlind: Joi.number().min(0).required(),
            bigBlind: Joi.number().min(0).required(),
        }).external(isModValidator);
        socket.on('update-blinds-next-round', asyncSchemaValidator(updateBlindsSchema, (data) => {
            if (data && data.smallBlind && data.bigBlind){
                if (data.smallBlind <= data.bigBlind){
                    console.log('updating blinds next hand');
                    s.updateBlindsNextHand(data.smallBlind, data.bigBlind);
                    // if game isnt in progress change blinds in header immediately
                    if (!s.gameInProgress){
                        io.sockets.to(sid).emit('update-header-blinds', {
                            bigBlind: s.table.bigBlind,
                            smallBlind: s.table.smallBlind
                        });
                    }
                    s.sendTableState();
                } else {
                    console.log('big blind must be greater than small blind');
                }
            }
        }));


        const updateStraddleSchema = Joi.object({
            straddleLimit: Joi.number().required()
        }).external(isModValidator);
        socket.on('update-straddle-next-round', asyncSchemaValidator(updateStraddleSchema, (data) => {
            console.log('setting straddle limit to ', data.straddleLimit);
            s.updateStraddleLimit(data.straddleLimit);
            s.sendTableState();
        }));

        const transferHostSchema = Joi.object({
            seat: Joi.number().integer().min(0).required()
        }).external(isModValidator);
        socket.on('transfer-host', asyncSchemaValidator(transferHostSchema, (data) => {
            let newHostName = s.getPlayerBySeat(data.seat);
            if (newHostName === s.getPlayerById(playerId)){
                console.log('attempting to transfer host to oneself');
            } else {
                console.log('transferring host to ', newHostName);
                if (s.transferHost(newHostName)){
                    let newHostSocketId = s.getSocketId(s.getPlayerId(newHostName));
                    io.sockets.to(s.getSocketId(playerId)).emit('remove-mod-abilities');
                    io.sockets.to(newHostSocketId).emit('add-mod-abilities');
                    s.sendTableState();
                } else {
                    console.log('unable to transfer host');
                    s.sendTableState();
                }
            }
        }));

        const updatePlayerStackSchema = Joi.object({
            seat: Joi.number().integer().min(0).required(),
            newStackAmount: Joi.number().integer().min(0).required()
        }).external(isModValidator);
        socket.on('update-player-stack', asyncSchemaValidator(updatePlayerStackSchema, (data) => {
            let pName = s.getPlayerBySeat(data.seat);
            let newStack = data.newStackAmount;
            if (!pName || pName === 'guest'){
                console.log('player at seat ' + data.seat + ' doesnt exist');
            } else {
                if (!newStack || isNaN(newStack) || newStack <= 0){
                    console.log('error with newStackAmountInput');
                } else {
                    console.log(`queuing to update ${pName}'s stack to ${newStack}`);
                    s.queueUpdatePlayerStack(pName, newStack);
                    // if game isnt in progress update players stack immediately
                    if (!s.gameInProgress) {
                        s.sendTableState();
                        // io.sockets.to(sid).emit('update-stack', {
                        //     seat: data.seat,
                        //     stack: newStack
                        // });
                    }
                }
            }
        }));

        // this if else statement is a nonsense fix need to find a better one
        } else {
            console.log('already connected');
        }
    });
}));

module.exports = router;