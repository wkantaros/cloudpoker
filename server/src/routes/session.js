const router = require('express').Router();
const cookieParser = require('cookie-parser');
const xss = require("xss");

router.use('/', cookieParser(process.env.COOKIE_SECRET));
router.use('/:id', cookieParser(process.env.COOKIE_SECRET));

const path = require('path');
const Joi = require('@hapi/joi');
const shortid = require('shortid');
const {TableManager} = require('../server-logic');
const {asyncErrorHandler, sleep, asyncSchemaValidator, formatJoiError} = require('../funcs');
const poker = require('../poker-logic/lib/node-poker');
const socketioJwt   = require('socketio-jwt');
const jwt = require('jsonwebtoken');
const sio = require("socket.io");
const {getPlayerIdsForTable} = require("../redisHelpers");
const {getGameState} = require("../redisHelpers");
const {getGameId} = require("../redisHelpers");
const {getSids} = require("../redisHelpers");
const {addSidToRedis} = require("../redisHelpers");
const {deleteGameOnRedis} = require("../redisHelpers");
const {deletePlayerOnRedis} = require("../redisHelpers");
const {addPlayerToRedis} = require("../redisHelpers");
const {initializeGameRedis, addActionToRedis, addBoardCardsToRedis} = require("../redisHelpers");
const {getOrSetPlayerIdCookie} = require("../persistent");

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

    const playerId = getOrSetPlayerIdCookie(req, res);

    value.isValid = true;
    await res.json(value);
    console.log(`starting new table with id: ${value.tableName} with mod player id ${playerId}`);
    const tableNamespace = sio.of('/' + value.tableName);
    let table = new poker.Table(req.body.smallBlind, req.body.bigBlind, 2, 10, 1, 500000000000, req.body.straddleLimit,)

    addSidToRedis(value.tableName);
    sessionManagers.set(value.tableName, new SessionManager(tableNamespace, value.tableName, table, req.body.name, req.body.stack, false, playerId));
}));

// maps sid -> SessionManager
// TODO: delete sid from sessionManagers when table finishes
const sessionManagers = new Map();

(()=>{
    let sids = getSids() || [];
    console.log(sids);
    for (let sid of sids) {
        let gameId = getGameId(sid);
        let table = getGameState(gameId);
        const pids = getPlayerIdsForTable(sid);
        const tableNamespace = sio.of('/' + value.tableName);
        sessionManagers.set(sid, new SessionManager(tableNamespace, sid, table, null, null, null, null, pids));
    }
})();

class SessionManager extends TableManager {
    constructor(io, sid, table, hostName, hostStack, hostIsStraddling, playerid, playerids) {
        super(table, hostName, hostStack, hostIsStraddling, playerid, playerids);
        this.io = io;
        this.sid = sid;
        this.socketMap = new Map();
        // maps player id -> playerName when kicked
        this.kickedPlayers = {};
        this.timerDelay = -1;
        this.timer = null;
        this.raceInProgress = false;
        this.raceSchedule = null;
        // registeredGuestCount counts how many guests have spoken in chat. It is used
        // to uniquely identify guests in chat by naming them "guest 1," "guest 2," etc.
        this.registeredGuestCount = 0;
        // stores chat names for users who have not joined the game and have sent a chat message
        this.registeredGuests = {};

        this.previousBoardLength = table.game? table.game.board.length: 0;

        this.io.on('connection', socketioJwt.authorize({
            secret: process.env.PKR_JWT_SECRET,
            timeout: 15000 // 15 seconds to send the authentication message
        })).on('authenticated', makeAuthHandler(this));
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
            this.io.to(this.getSocketId(playerId)).emit('alert',
                {'message': `Player name ${playerName} is already taken.`});
            return false;
        } else if (playerName.toLowerCase().indexOf('guest') === 0) {
            this.io.to(this.getSocketId(playerId)).emit('alert',
                {'message': `Player name cannot start with "guest"`});
            return false;
        }
        return true;
    }

    emitAction(action, playerName, betAmount) {
        this.sendTableState();
        this.io.emit(action, {
            username: playerName,
            stack: this.getStack(playerName),
            pot: this.getPot(),
            seat: this.getPlayerSeat(playerName),
            amount: betAmount
        });
        addActionToRedis(this.table.game.id, super.getPlayerSeat(playerName), action, betAmount);
        if (this.table.game.board.length > this.previousBoardLength) {
            addBoardCardsToRedis(this.table.game.id, this.table.game.board.slice(this.previousBoardLength));
            this.previousBoardLength = this.table.game.board.length;
        }
    }

    sendTableState() {
        this.sendTableStateTo('guest', 'guest');
        // send each active player
        for (let p of this.table.allPlayers) {
            // this.getPlayerId(p.playerName) is falsy if handlePlayerExit called this function.
            if (!p || !this.getPlayerId(p.playerName)) continue;
            console.log('got player id for', p.playerName, this.getPlayerId(p.playerName));
            this.sendTableStateTo(this.getSocketId(this.getPlayerId(p.playerName)), p.playerName)
        }
    }

    // sends playerName a snapshot that includes their private data (cards)
    sendTableStateTo(socketId, playerName) {
        let table = this.table.getPublicInfo();

        let p = this.table.getPlayer(playerName);
        if (p) {
            table = Object.assign({}, table); // shallow copy
            table.allPlayers = Array.from(table.allPlayers); // shallow copy
            p = Object.assign({}, p);
            delete p.hand; // hacky
            p = this.table.extraPlayerInfo(p);
            Object.assign(table.allPlayers[p.seat], p);
        }

        this.io.to(socketId).emit('state-snapshot', {
            table: table,
            gameInProgress: this.gameInProgress,
            player: p,
            raceInProgress: this.raceInProgress,
            raceSchedule: this.raceSchedule,
        });
    }

    addToPlayerIds(playerName, playerid) {
        super.addToPlayerIds(playerName, playerid);
        addPlayerToRedis(this.sid, playerName, playerid);
    }
    removePlayer(playerName) {
        super.removePlayer(playerName);
        deletePlayerOnRedis(this.sid, playerName);
    }

    handleBuyIn(playerName, playerid, stack, isStraddling) {
        const addedPlayer = super.buyin(playerName, playerid, stack, isStraddling);
        if (addedPlayer) {
            if (this.registeredGuests[playerid]) {
                // remove playerid from registeredGuests as player is no longer a guest.
                //  their username is now stored in super.playerids
                delete this.registeredGuests[playerid];
            }

            console.log('socket id on buy in', this.getSocket(playerid).id);
            this.getSocket(playerid).leave(`guest`);
            this.getSocket(playerid).join(`active`);
            this.sendTableState();
            this.io.emit('buy-in', {
                playerName: playerName,
                stack: stack,
            });
        } else {
            // set or update this guest's name
            this.registeredGuests[playerid] = playerName;
        }
        return addedPlayer;
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
        // this.renderActionSeatAndPlayerActions();
        // this.io.emit('render-players', this.playersInfo());
        this.io.emit('stand-up', {playerName: playerName, seat: this.getPlayerSeat(playerName)});
    }
    sitDownPlayer(playerName) {
        if (!this.isPlayerStandingUp(playerName)) return;

        super.sitDownPlayer(playerName);
        this.sendTableState();
        // this.io.emit('render-players', this.playersInfo());
        this.io.emit('sit-down', {playerName: playerName, seat: this.getPlayerSeat(playerName)});
        // this.renderActionSeatAndPlayerActions(); // if <= 1 player is sitting down, host can now start game.
    }

    // horrible name. call playerLeaves. handlePlayerExit is basically a private method
    async playerLeaves(playerId) {
        let playerName = super.getPlayerById(playerId);
        if (!this.gameInProgress || !this.getPlayer(playerName).inHand){
            this.handlePlayerExit(playerName);
            // highlight cards of player in action seat and get available buttons for players
            // this.renderActionSeatAndPlayerActions();
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
            }
            this.sendTableState();

            this.handlePlayerExit(playerName);
            await sleep(250);
            // check if round has ended
            await this.check_round(prev_round);
        }
        this.sendTableState();
    }

    // private method
    // removes players not in the current hand
    handlePlayerExit(playerName) {
        const playerId = super.getPlayerId(playerName);
        const seat = super.getPlayerSeat(playerName);
        console.log(`${playerName} leaves game`);

        const stack = this.getStack(playerName);
        super.addBuyOut(playerName, playerId, stack);
        this.removePlayer(playerName);

        this.registeredGuests[playerId] = playerName;
        this.getSocket(playerId).leave(`active`);
        this.getSocket(playerId).join(`guest`);
        this.sendTableState();

        if (this.gameInProgress) {
            this.io.emit('buy-out', {
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
        this.sendTableState(); // show players' cards and hand rank messages
        let prevRound = super.getRoundName();

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
            }
        }
        this.raceInProgress = false;
        this.raceSchedule = null;
        this.sendTableState();
    }

    async handleEveryoneFolded(prev_round, data) {
        // TODO: ANYONE CAN REVEAL HAND HERE
        this.sendTableState();
        // this.renderActionSeatAndPlayerActions();
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
        this.io.emit('folds-through', {
            username: data.winner.playerName,
            amount: winnings,
            seat: super.getPlayerSeat(data.winner.playerName)
        });

        await sleep(3000);

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
            let winners = this.getWinners();
            for (let winnerInfo of winners) {
                this.getPlayer(winnerInfo.playerName).showHand();
            }
            this.sendTableState();
            console.log('winners');
            console.log('LOSERS');
            let losers = super.getLosers();
            this.io.emit('showdown', winners);

            await sleep(3000);
            // handle losers
            for (let i = 0; i < losers.length; i++){
                this.handlePlayerExit(losers[i].playerName);
            }
            this.sendTableState();

            // start new round
            this.startNextRoundOrWaitingForPlayers()
        }
        // if everyone is all in before the hand is over and its the end of the round, turn over their cards and let them race
        else if (super.isEveryoneAllIn() && prev_round !== super.getRoundName()) {
            console.log('doing all in race');
            await this.allInRace();
            await this.check_round('showdown');
            this.sendTableState();
        } else if (data.everyoneFolded) {
            await this.handleEveryoneFolded(prev_round, data);
        }
    }

    startNextRoundOrWaitingForPlayers () {
        let previousGameId = this.table.game? this.table.game.id: null;
        // start new round
        super.startRound();
        this.sendTableState();
        if (!this.gameInProgress) {
            console.log('waiting for more players to rejoin!');
        } else {
            this.previousBoardLength = 0;
            deleteGameOnRedis(this.sid, previousGameId);
            initializeGameRedis(this.table, this.sid);
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
            await sleep(500); // sleep so that if this is the last action before next street, people can see it
            await this.check_round(prev_round);
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
        this.io.emit('render-timer', {
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
    getPlayerChatName(playerId) {
        let playerName = super.getPlayerById(playerId);
        if (playerName !== 'guest') return playerName;
        if (this.registeredGuests[playerId]) {
            return this.registeredGuests[playerId];
        } else {
            this.registeredGuestCount++;
            let guestName = `guest ${this.registeredGuestCount}`;
            this.registeredGuests[playerId] = guestName;
            return guestName;
        }
    }
}

router.route('/:id').get(asyncErrorHandler((req, res) => {
    let sid = req.params.id;
    const s = sessionManagers.get(sid);
    if (!s) { // redirect user to login page if the request's table ID does not exist
        res.redirect('/');
        return;
    }

    const playerId = getOrSetPlayerIdCookie(req, res);
    const token = jwt.sign({playerId: playerId},
        process.env.PKR_JWT_SECRET, {expiresIn: "2 days"});
    res.render('pages/game', {
        sid: sid,
        token: token
    });
}));


function makeAuthHandler(s) {
    return async function (socket) {
        return await handleOnAuth(s, socket);
    }
}
/**
 *
 * @param s {SessionManager}
 * @param socket {Socket}
 * @return {Promise<void>}
 */
async function handleOnAuth(s, socket) {
    let playerId = socket.decoded_token.playerId;
    const io = s.io;

    s.setSocket(playerId, socket);
    if (s.isSeatedPlayerId(playerId)) {
        socket.join(`active`);
    } else {
        socket.join(`guest`);
    }

    socket.on('disconnect', (reason) => {
        console.log('pid', playerId, 'socket ID', socket.id, 'disconnect reason', reason);
        io.emit('player-disconnect', {
            playerName: s.getPlayerById(playerId),
        });
        // io.removeAllListeners('connection');
    });

    console.log('a user connected at', socket.id, 'with player ID', playerId);

    const chatSchema = Joi.object({
        message: Joi.string().trim().min(1).external(xss).required()
    });
    // chatroom features
    // send a message in the chatroom
    socket.on('chat', asyncSchemaValidator(chatSchema,(data) => {
        io.emit('chat', {
            handle: s.getPlayerChatName(playerId),
            message: data.message
        });
    }));

    // typing
    socket.on('typing', () => {
        socket.broadcast.emit('typing', s.getPlayerById(playerId));
    });

    s.sendTableStateTo(socket.id, s.getPlayerById(playerId));

    const isSeatedPlayerIdValidator = function(value) {
        if (!s.isSeatedPlayerId(playerId)) throw new Error('not a seated player\'s id');
        return value;
    }
    const isModValidator = function(value) {
        if (!s.isModPlayerId(playerId)) throw new Error('not a mod\'s player id');
        return value;
    }

    if (s.isSeatedPlayerId(playerId) && s.gameInProgress) {
        io.emit('player-reconnect', {
            playerName: s.getPlayerById(playerId),
        });
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
        s.handleBuyIn(data.playerName, playerId, data.stack, data.isStraddling === true);
    }));

    const straddleSwitchSchema = Joi.object({
        isStraddling: Joi.boolean().required()
    }).external(isSeatedPlayerIdValidator);
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

    socket.on('leave-game', async () => {
        if (!s.isSeatedPlayerId(playerId)) {
            console.log(`playerid ${playerId} emitted leave-game but is not an active player`);
            return;
        }
        await s.playerLeaves(playerId);
    });

    socket.on('stand-up', () => {
        if (!s.isSeatedPlayerId(playerId)) {
            console.log(`playerid ${playerId} emitted stand-up but is not an active player`);
            return;
        }
        s.standUpPlayer(s.getPlayerById(playerId));
    });

    socket.on('sit-down', () => {
        if (!s.isSeatedPlayerId(playerId)) {
            console.log(`playerid ${playerId} emitted sit-down but is not an active player`);
            return;
        }
        s.sitDownPlayer(s.getPlayerById(playerId));
    });

    const setTurnTimerSchema = Joi.object({delay: Joi.number().integer().required()}).external(isModValidator);
    socket.on('set-turn-timer', asyncSchemaValidator(setTurnTimerSchema, (data) => { // delay
        s.setTimer(data.delay);
    }));

    socket.on('start-game', () => {
        if (!s.isModPlayerId(playerId)) {
            console.log(`${s.getPlayerById(playerId)} cannot start the game because they are not a mod.`);
            return;
        }
        const playersInNextHand = s.playersInNextHand().length;
        console.log(`players in next hand: ${playersInNextHand}`);
        s.startNextRoundOrWaitingForPlayers();
    });

    socket.on('show-hand', () => {
        if (!s.isSeatedPlayerId(playerId)) {
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
    });

    socket.on('get-buyin-info', () => {
        io.emit('get-buyin-info', s.getBuyinBuyouts());
    });

    const actionSchema = Joi.object({
        action: Joi.string().min(1).required(),
        amount: Joi.number()
    }).external(isSeatedPlayerIdValidator);
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
            if (!s.transferHost(newHostName)){
                console.log('unable to transfer host');
            }
            s.sendTableState();
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
                }
            }
        }
    }));
}

module.exports = router;