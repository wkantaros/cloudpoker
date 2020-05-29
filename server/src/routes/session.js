const router = require('express').Router();
const cookieParser = require('cookie-parser');
const xss = require("xss");
const { v4 } = require('uuid');

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
const crypto = require('crypto');
const {getGameLog} = require("../redisHelpers");
const {addToGameLog} = require("../redisHelpers");
const {initializeTableRedis} = require("../redisHelpers");
const {deleteTableOnRedis} = require("../redisHelpers");
const {sio} = require('../sio');
const {getPlayerIdsForTable} = require("../redisHelpers");
const {getTableState} = require("../redisHelpers");
const {getSids} = require("../redisHelpers");
const {deletePlayerOnRedis} = require("../redisHelpers");
const {addPlayerToRedis} = require("../redisHelpers");
const {initializeGameRedis} = require("../redisHelpers");
const {getOrSetPlayerIdCookie} = require("../persistent");
// const jsonpatch = require('fast-json-patch');

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

    const tableNamespace = sio.of('/' + value.tableName);
    let table = new poker.Table(req.body.smallBlind, req.body.bigBlind, 2, 10, 1, 500000000000, req.body.straddleLimit)
    sessionManagers.set(value.tableName, new SessionManager(tableNamespace, value.tableName, table, req.body.name, req.body.stack, false, v4(), playerId));
    await initializeTableRedis(table, value.tableName);

    await res.json(value);
    console.log(`starting new table with id: ${value.tableName} with mod player id ${playerId}`);
}));

// maps sid -> SessionManager
// TODO: delete sid from sessionManagers when table finishes
const sessionManagers = new Map();

(async ()=>{
    let sids = await getSids();
    console.log('restarting tables with sids:', sids);
    for (let sid of sids) {
        let {table, prev_round} = await getTableState(sid);
        const pids = await getPlayerIdsForTable(sid);
        const tableNamespace = sio.of('/' + sid);
        let modIds = table.allPlayers.filter(p=>p!==null&&p.isMod).map(p=>pids[p.playerName].playerid);
        const manager = new SessionManager(tableNamespace, sid, table, null, null, null, null, null, pids, modIds);
        sessionManagers.set(sid, manager);
        if (table.game) {
            await manager.check_round(prev_round);
        }
    }
})();

// class ReplayBuilder {
//     constructor() {
//         this.log = [];
//     }
//     updateLog() {
//         let tableState = this.getPublicInfo();
//         if (this.previousTableState === null) {
//             if (!tableState.table.game) return;
//             // push a new array to gameLog for the new hand
//             this.gameLog.push([{time: Date.now(), initialState: tableState}]);
//         } else {
//             let patch = jsonpatch.compare(this.previousTableState, tableState);
//             if (patch.length === 0) return;
//             console.log(patch);
//             this.gameLog[this.gameLog.length - 1].push({time: Date.now(), patch: patch});
//         }
//         this.previousTableState = tableState;
//     }
// }
const sha256Hash = (str) => crypto.createHash('sha256').update(str).digest('hex');

const TABLE_EXPIRY_TIMEOUT = 1000 * 60 * 30; // 30 minutes
class SessionManager extends TableManager {
    constructor(io, sid, table, hostName, hostStack, hostIsStraddling, hostSeed, playerid, playerids, modIds) {
        super(sid, table, hostName, hostStack, hostIsStraddling, hostSeed, playerid, playerids, modIds);
        this.io = io;
        this.socketMap = new Map();
        // maps player id -> playerName when kicked
        this.kickedPlayers = {};
        this.raceInProgress = false;
        this.raceSchedule = null;
        // registeredGuestCount counts how many guests have spoken in chat. It is used
        // to uniquely identify guests in chat by naming them "guest 1," "guest 2," etc.
        this.registeredGuestCount = 0;
        // stores chat names for users who have not joined the game and have sent a chat message
        this.registeredGuests = {};

        // To see how previousTableState, gameLog, and handEndLog are used, see updateLog and startNextRoundOrWaitingForPlayers

        // previousTableState is null if a hand just ended. otherwise it is the value of
        //  this.getPublicInfo() the last time sendTableState was called
        // this.previousTableState = null;
        // gameLog is a 2D array. top-level elements store the data for a hand, a "hand array".
        //  the first element of each hand array stores the initial state of the table.
        //  subsequent elements of the hand array are diffs from the preceding state (previous
        //  state is stored in previousTableState). see
        // this.gameLog = [];
        // handEndLog stores the public info of the table at the end of each hand. element
        //  at index i corresponds to the game in gameLog[i]
        // this.handEndLog = [];
        this.tableExpiryTimer = setTimeout(this.expireTable.bind(this), TABLE_EXPIRY_TIMEOUT);

        this.io.on('connection', socketioJwt.authorize({
            secret: process.env.PKR_JWT_SECRET,
            timeout: 15000 // 15 seconds to send the authentication message
        })).on('authenticated', makeAuthHandler(this));
    }

    async expireTable() {
        console.log('expiring table');
        this.socketMap.forEach(socket => socket.disconnect(false));
        this.socketMap.clear(); // explicitly dereference sockets. probably helps with memory, why not.
        // remove self from redis
        await deleteTableOnRedis(this.sid);
        sessionManagers.delete(this.sid); // dereference self from memory
    }

    setSocket(playerId, socket) {
        this.socketMap.set(playerId, socket);
    }

    getSocket (playerId) {
        return this.socketMap.get(playerId);
    };

    getSocketId (playerId) {
        const socket = this.getSocket(playerId);
        return socket? socket.id: undefined;
    };

    getHandLog(gameIndex) {
        if (gameIndex >= this.gameLog.length) {
            console.log(`gameIndex ${gameIndex} >= this.gameLog.length ${this.gameLog.length}`);
            return null;
        }
        return this.gameLog[gameIndex];
    }

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

    /**
     *
     * @param action
     * @param playerName
     * @param betAmount
     * @param addToRedis should be false only when standing up or player leaves game
     * @param {number} ogBetAmount original amount passed to/ to pass to performActionHelper.
     * @return {Promise<void>}
     */
    async emitAction(action, playerName, betAmount, addToRedis, ogBetAmount) {
        this.sendTableState();
        await this.addToGameLog('action', {
            playerName: playerName,
            seat: super.getPlayerSeat(playerName),
            action: action,
            amount: ogBetAmount || betAmount,
        })
    }

    getPublicInfo() {
        return {
            table: this.table.getPublicInfo(),
            gameInProgress: this.gameInProgress,
            raceInProgress: this.raceInProgress,
            raceSchedule: this.raceSchedule? Object.assign({}, this.raceSchedule): null,
        };
    }

    sendTableState() {
        // this.updateLog();
        let publicInfo = this.getPublicInfo();
        this.sendTableStateTo('guest', 'guest', publicInfo);
        // send each active player
        for (let p of this.table.allPlayers) {
            // this.getPlayerId(p.playerName) is falsy if handlePlayerExit called this function.
            if (!p || !this.getPlayerId(p.playerName)) continue;
            // console.log('got player id for', p.playerName, this.getPlayerId(p.playerName));
            const socketId = this.getSocketId(this.getPlayerId(p.playerName));
            if (socketId)
                this.sendTableStateTo(socketId, p.playerName);
            else console.log('could not get socket id for player id', this.getPlayerId(p.playerName));
        }
    }

    // sends playerName a snapshot that includes their private data (cards)
    sendTableStateTo(socketId, playerName, publicInfo) {
        publicInfo = publicInfo || this.getPublicInfo();

        let p = this.table.getPlayer(playerName);
        if (p) {
            p = Object.assign({}, p);
            delete p.hand; // hacky
            p = this.table.extraPlayerInfo(p);

            let table = publicInfo.table;
            let playersCopy = Array.from(table.allPlayers);
            playersCopy[p.seat] = p;

            table = Object.assign({}, table); // shallow copy
            Object.assign(table, {allPlayers: playersCopy});
            publicInfo = Object.assign({}, publicInfo);
            Object.assign(publicInfo, {table: table, player: p});
        }

        this.io.to(socketId).emit('state-snapshot', publicInfo);
    }

    async addToPlayerIds(playerName, playerid) {
        super.addToPlayerIds(playerName, playerid);
        await addPlayerToRedis(this.sid, this.table, this.getPlayer(playerName), playerid);
    }

    async getGameLog(cursor) {
        return await getGameLog(this.sid, cursor);
    }

    async handleBuyIn(playerName, playerid, stack, isStraddling, seed) {
        const addedPlayer = super.buyin(playerName, playerid, stack, isStraddling, seed);
        if (addedPlayer) {
            if (this.registeredGuests[playerid]) {
                // remove playerid from registeredGuests as player is no longer a guest.
                //  their username is now stored in super.playerids
                delete this.registeredGuests[playerid];
            }

            const socket = this.getSocket(playerid);
            if (socket) {
                socket.leave(`guest`);
                socket.join(`active`);
            }
            this.sendTableState();
            await this.addToGameLog('buy-in', {
                playerName: playerName,
                stack: stack,
                playerSeedHash: sha256Hash(super.getPlayerSeed(playerName)),
                tableSeedHash: sha256Hash(this.table.getSeed()),
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
        await this.playerLeaves(playerId);
    }
    async setPlayerSeed(playerName, value) {
        value = value.trim();
        let setSeed = super.setPlayerSeed(playerName, value);
        if (setSeed) {
            this.sendTableState();
            await this.addToGameLog('action', {
                action: 'setSeed',
                playerName: playerName,
                value: value,
                tableSeedHash: sha256Hash(this.table.getSeed()),
            },{
                action: 'setSeed',
                playerName: playerName,
                playerSeedHash: sha256Hash(value),
                tableSeedHash: sha256Hash(this.table.getSeed()),
            });
        }
        return setSeed;
    }
    async standUpPlayer(playerName) {
        if (this.isPlayerStandingUp(playerName)) return;
        await this.addToGameLog('action', {
            action: 'standUp',
            playerName: playerName,
            seat: super.getPlayerSeat(playerName)
        });
        // if (this.gameInProgress && this.getPlayer(playerName).inHand && !this.hasPlayerFolded(playerName)) {
        //     await this.emitAction('fold', playerName, 0, false);
        // }
        let prev_round = super.getRoundName();
        this.table.standUpPlayer(playerName);
        await this.check_round(prev_round);
    }
    async sitDownPlayer(playerName) {
        if (!this.isPlayerStandingUp(playerName)) return;
        await this.addToGameLog('action', {
            action: 'sitDown',
            playerName: playerName,
            seat: super.getPlayerSeat(playerName)
        });
        this.table.sitDownPlayer(playerName);
        this.sendTableState();
    }

    // horrible name. call playerLeaves. handlePlayerExit is basically a private method
    async playerLeaves(playerId) {
        let playerName = super.getPlayerById(playerId);
        if (!this.gameInProgress || !this.getPlayer(playerName).inHand || this.hasPlayerFolded(playerName)){
            await this.handlePlayerExit(playerName);
        } else {
            let prev_round = super.getRoundName();
            // console.log(`${playerName} leaves game for ${super.getStack(playerName)}`);
            // await this.emitAction('fold', playerName, 0);
            // this.sendTableState();

            await this.handlePlayerExit(playerName);
            // await sleep(250);
            // check if round has ended
            await this.check_round(prev_round);
        }
        this.sendTableState();
    }

    // private method
    // removes players not in the current hand
    async handlePlayerExit(playerName) {
        const playerId = super.getPlayerId(playerName);
        const seat = super.getPlayerSeat(playerName);
        const stack = this.getStack(playerName);
        super.handlePlayerExit(playerName);

        this.registeredGuests[playerId] = playerName;
        const socket = this.getSocket(playerId);
        if (socket) {
            socket.leave(`active`);
            socket.join(`guest`);
        }
        this.sendTableState();

        // if (this.gameInProgress) {
        await this.addToGameLog('action', {
            action: 'removePlayer',
            playerName: playerName,
            stack: stack,
            seat: seat
        });
        // }
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
            this.table.call();
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
        await this.check_round('showdown');
    }

    async addToGameLog(logEvent, args, emittedArgs) {
        this.io.emit(logEvent, emittedArgs || args);
        await addToGameLog(this.sid, this.table.game? this.table.game.id: 'none', logEvent, ...Object.entries(args || {}).flat());
    }

    async check_round (prev_round) {
        // if at showdown or everyone folded
        if (this.table.game.winners.length > 0) {
            this.sendTableState();
            for (let winnerData of this.table.game.winners) {
                // TODO: use multi (redis) and message-batch (gameLog.jsx) to make this somewhat atomic.
                await this.addToGameLog('log-winner', winnerData);
            }

            await sleep(3000);
            // handle losers
            let losers = super.getLosers();
            for (let i = 0; i < losers.length; i++){
                await this.handlePlayerExit(losers[i].playerName);
            }

            // start new round
            await this.startNextRoundOrWaitingForPlayers();
        }
        // if everyone is all in before the hand is over and its the end of the round, turn over their cards and let them race
        else if (this.table.isEveryoneAllIn() && prev_round !== super.getRoundName()) {
            console.log('doing all in race');
            await this.allInRace();
        }
    }

    async deleteLeavingPlayersRedis() {
        const leavingPlayers = this.table.leavingPlayers;
        for (const p of leavingPlayers) {
            await deletePlayerOnRedis(this.sid, p.playerName);
        }
    }
    async startNextRoundOrWaitingForPlayers () {
        await this.deleteLeavingPlayersRedis();
        // this.previousTableState = null;
        // this.handEndLog.push({time: Date.now(), finalState: this.getPublicInfo()});
        // start new round
        super.startRound();
        this.sendTableState();
        // initializes game ID to 'none' if no game is in progress
        await initializeGameRedis(this.table, this.sid);
        if (!this.gameInProgress) {
            console.log('waiting for more players to rejoin!');
        } else {
            await this.addToGameLog('new-round');
        }
    }

    async performAction(playerName, action, amount) {
        if (amount < 0) return;
        const prev_round = this.getRoundName();
        let actualBetAmount = this.table.applyAction(this.getPlayerSeat(playerName), action, amount);
        let canPerformAction = actualBetAmount >= 0;

        if (canPerformAction) {
            this.tableExpiryTimer.refresh();
            await this.emitAction(action, playerName, actualBetAmount, true, amount);
            // shift action to next player in hand
            await sleep(500); // sleep so that if this is the last action before next street, people can see it
            await this.check_round(prev_round);
        }
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

    socket.on('get-game-log', async ({cursor}) => {
        io.to(socket.id).emit('get-game-log', {cursor, log: await s.getGameLog(cursor)});
    })
    socket.on('get-hand-replay', ({gameIndex, display}) => {
        let handLog = s.getHandLog(gameIndex);
        io.to(socket.id).emit('get-hand-replay', {handLog, gameIndex, display, validatePatch: process.env.NODE_ENV !== 'production'})
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
        isStraddling: Joi.boolean(),
        seed: Joi.string().trim().max(51).external(xss).optional(),
    });
    socket.on('buy-in', asyncSchemaValidator(buyInSchema, async (data) => {
        if (!s.canPlayerJoin(playerId, data.playerName, data.stack, data.isStraddling === true)) {
            return;
        }
        data.seed = data.seed && data.seed.length > 0? data.seed: v4();
        // console.log('buy in seed is undefined', data.seed === undefined);
        await s.handleBuyIn(data.playerName, playerId, data.stack, data.isStraddling === true, data.seed);
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

    socket.on('standUp', async () => {
        if (!s.isSeatedPlayerId(playerId)) {
            console.log(`playerid ${playerId} emitted standUp but is not an active player`);
            return;
        }
        await s.standUpPlayer(s.getPlayerById(playerId));
    });

    socket.on('sitDown', async () => {
        if (!s.isSeatedPlayerId(playerId)) {
            console.log(`playerid ${playerId} emitted sitDown but is not an active player`);
            return;
        }
        await s.sitDownPlayer(s.getPlayerById(playerId));
    });

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

    const setSeedSchema = Joi.object({
        value: Joi.string().trim().min(1).max(51).external(xss).required()
    }).external(isSeatedPlayerIdValidator);
    socket.on('setSeed', asyncSchemaValidator(setSeedSchema, async ({value}) => {
        const playerName = s.getPlayerById(playerId);
        await s.setPlayerSeed(playerName, value);
    }));

    socket.on('get-buyin-info', () => {
        io.to(socket.id).emit('get-buyin-info', s.getBuyinBuyouts());
    });
    // socket.on('get-hand-end-log', () => {
    //     io.to(socket.id).emit('get-hand-end-log', {handEndLog: s.handEndLog});
    // })

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