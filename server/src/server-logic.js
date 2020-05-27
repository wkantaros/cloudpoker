const {Hand, rankHandInt} = require('./poker-logic');

class TableStateManager {
    /**
     *
     * @param {TableState} table
     * @param {boolean} gameInProgress
     */
    constructor(table, gameInProgress) {
        this.table = table;
        this.gameInProgress = gameInProgress;
    }

    get playerStates() {
        return this.table.playerStates;
    }

    get bigBlindSeat() {
        return this.table.bigBlindSeat;
    };

    get actionSeat() {
        if (this.gameInProgress){
            return this.table.actionSeat;
        } else {
            return -1;
        }
    }

    get allIn() {
        return this.table.allPlayers.map(p => p != null && p.inHand && p.allIn);
    }

    playersInNextHand () {
        return this.table.allPlayers.filter(elem => elem !== null && !elem.leavingGame && !elem.standingUp);
    }

    getStraddleLimit() {
        return this.table.straddleLimit;
    };

    getRoundName() {
        if (this.gameInProgress){
            return this.table.game.roundName.toLowerCase();
        } else {
            return 'deal';
        }
    }

    getDeal() {
        return this.table.getDeal();
    }

    getDealerSeat() {
        // console.log('GET DEALER');
        // console.log(this.table);
        // console.log('----------');
        if (this.gameInProgress) {
            const t = this.table;
            return t.players[t.dealer].seat;
        } else {
            return -1;
        }
    }

    getPot() {
        return this.gameInProgress ? this.table.game.pot : 0;
    }

    checkwin() {
        return this.table.checkwin();
    }

    getLosers() {
        let losers = this.table.getLosers();
        console.log('losers!');
        console.log(losers);
        return losers;
    }

    getPlayer(playerName) {
        return this.table.getPlayer(playerName);
    }

    getPlayerBySeat(seat) {
        const p = this.table.allPlayers[seat];
        if (p) return p.playerName;
        return 'guest';
    }

    getPlayerSeat(playerName) {
        const p = this.table.getPlayer(playerName);
        if (p) return p.seat;
        return -1;
    };

    isPlayerStandingUp(playerName) {
        const p = this.table.getPlayer(playerName);
        if (p) return p.standingUp;
        return false;
    }

    getBet (playerName) {
        if (!this.gameInProgress) return 0;
        return this.table.getPlayer(playerName).bet;
    }

    getStack(playerName) {
        const p = this.table.getPlayer(playerName);
        if (!p) return -1;
        return p.chips;
    }

    getNameByActionSeat() {
        let seat = this.actionSeat;
        if (seat === -1) return 'guest';
        return this.table.allPlayers[seat].playerName;
    }

    canPlayersRevealHand() {
        return this.gameInProgress && this.table.canPlayersRevealHands();
    }

    getAvailableActions(playerName) {
        let availableActions = {
            'min-bet': false,
            'bet': false,
            'raise': false,
            'fold': false,
            'call': false,
            'start': false,
            'check': false,
            'your-action': false,
            'show-hand': false,
        };
        const p = this.getPlayer(playerName);
        // if player is at the table
        if (p) {
            if (this.gameInProgress) {
                return this.table.getAvailableActions(playerName);
            }
            // case where game hasnt started yet, player is mod and there are enough players
            else if (!this.gameInProgress && p.isMod && this.playersInNextHand().length >= 2) {
                console.log('game can start');
                availableActions['start'] = true;
            }
        }
        return {availableActions: availableActions, canPerformPremoves: false};
    }
}

class TableManager extends TableStateManager {
    /**
     *
     * @param {Table} table
     * @param {string} hostName
     * @param {number} hostStack
     * @param {boolean} hostIsStraddling
     * @param {string} hostSeed
     * @param {string} playerid
     * @param {Object} playerids
     */
    constructor(sid, table, hostName, hostStack, hostIsStraddling, hostSeed, playerid, playerids, modIds) {
        super(table, table.game !== null);
        this.sid = sid;
        this.trackBuyins = [];
        this.modIds = modIds || [];
        if (!playerids) {
            this.playerids = {};
            this.buyin(hostName, playerid, hostStack, hostIsStraddling, hostSeed);
        } else this.playerids = playerids;
        this.bigBlindNextHand = undefined;
        this.smallBlindNextHand = undefined;
        this.playerStacksNextHand = [];
    }

    // let(\s*)(\S*)(\s*)=(\s*)\((.*)\)(\s*)=>
    // $2($5)
    addToPlayerIds(playerName, playerid) {
        console.log('atpi wtf');
        this.playerids[playerName] = {playerid};
    }

    isPlayerNameUsed(playerName) {
        return Object.keys(this.playerids).includes(playerName)
    };

    addToBuyins(playerName, playerid, playerStack) {
        let obj = {
            playerName: playerName,
            playerid: playerid,
            buyin: playerStack,
            time: null,
            buyout: null
        };
        let date = new Date;
        let minutes = (date.getMinutes() < 10) ? `0${date.getMinutes()}` : `${date.getMinutes()}`;
        let time = `${date.getHours()}:${minutes}`;
        obj.time = time;

        let playerAlreadyInDb = false;
        for (let i = 0; i < this.trackBuyins.length; i++) {
            if (this.trackBuyins[i].playerName === playerName && this.trackBuyins[i].playerid === playerid) {
                this.trackBuyins[i].buyin = parseInt(this.trackBuyins[i].buyin) + parseInt(playerStack);
                this.trackBuyins[i].time = time;
                playerAlreadyInDb = true;
            }
        }
        if (!playerAlreadyInDb){
            this.trackBuyins.push(obj);
        }
    }

    addBuyOut(playerName, playerid, buyOutStack) {
        let date = new Date;
        let minutes = (date.getMinutes() < 10) ? `0${date.getMinutes()}` : `${date.getMinutes()}`;
        let time = `${date.getHours()}:${minutes}`;
        for (let i = 0; i < this.trackBuyins.length; i++) {
            if (this.trackBuyins[i].playerName === playerName && this.trackBuyins[i].playerid === playerid) {
                if (buyOutStack === undefined){
                    buyOutStack = this.table.getPlayer(playerName).chips || this.trackBuyins[i].buyin;
                }
                if (this.trackBuyins[i].buyout != null){
                    this.trackBuyins[i].buyout = parseInt(buyOutStack) + parseInt(this.trackBuyins[i].buyout);
                }
                else {
                    this.trackBuyins[i].buyout = buyOutStack;
                }
                this.trackBuyins[i].time = time;
            }
        }
    }

    updateBuyIn(playerName, playerid, amountChange) {
        let date = new Date;
        let minutes = (date.getMinutes() < 10) ? `0${date.getMinutes()}` : `${date.getMinutes()}`;
        let time = `${date.getHours()}:${minutes}`;
        for (let i = 0; i < this.trackBuyins.length; i++) {
            if (this.trackBuyins[i].playerName === playerName && this.trackBuyins[i].playerid === playerid) {
                this.trackBuyins[i].buyin = parseInt(this.trackBuyins[i].buyin) + amountChange;
                this.trackBuyins[i].time = time;
            }
        }
    }

    getBuyinBuyouts() {
        return this.trackBuyins;
    };

    handlePlayerExit(playerName) {
        console.log(`${playerName} leaves game`);
        this.addBuyOut(playerName, this.getPlayerId(playerName), this.getStack(playerName));
        this.removePlayer(playerName);
    }

    // adds the player to this.playerids
    // adds the player to the table
    buyin(playerName, playerid, stack, isStraddling, seed) {
        const addedPlayer = this.table.AddPlayer(playerName, stack, isStraddling, seed);
        if (addedPlayer) {
            this.addToPlayerIds(playerName, playerid);
            this.addToBuyins(playerName, playerid, stack);
            console.log(`${playerName} buys in for ${stack}`);
            if (this.modIds.length === 0){
                console.log(`transferring host to ${playerName} (pid: ${playerid}) because modIds is empty`);
                this.setHost(playerName, playerid);
            }
            return true;
        } else {
            console.log('no seats available');
            return false;
        }
    };

    setPlayerStraddling(playerid, isStraddling) {
        const player = this.table.getPlayer(this.getPlayerById(playerid));
        if (player) {
            if (this.getStraddleLimit() !== 0){
                player.isStraddling = isStraddling;
            } else {
                player.isStraddling = false;
            }
        }
    }
    getPlayerSeed(playerName) {
        return this.getPlayer(playerName).seed;
    }
    setPlayerSeed(playerName, seed) {
        const p = this.table.getPlayer(playerName);
        if (p) {
            seed = seed.trim();
            console.log('setting seed for', p.playerName, 'to', seed);
            p.seed = seed;
            return true;
        }
        return false;
    }
    standUpPlayer(playerName) {
        return this.table.standUpPlayer(playerName);
    }
    sitDownPlayer(playerName) {
        return this.table.sitDownPlayer(playerName);
    }

    removePlayer(playerName) {
        this.table.removePlayer(playerName);
        if (!this.playerids[playerName]) return;
        let removedPlayerId = this.playerids[playerName].playerid;
        const removingMod = this.isModPlayerId(removedPlayerId);
        delete this.playerids[playerName];
        if (removingMod) {
            const ind = this.modIds.findIndex(pid=>pid===removedPlayerId);
            this.modIds.splice(ind, 1);
            if (this.modIds.length === 0) {
                // transfer host name / abilities to next player
                this.transferHostToNextPlayer();
            }
        }
    }

    transferHostToNextPlayer() {
        if (Object.values(this.playerids).length > 0) {
            this.modIds.push(Object.values(this.playerids)[0].playerid);
        }
    }

    transferHost(newHostName) {
        for (let p of this.table.allPlayers) {
            if (!p)continue;
            p.isMod = false;
        }
        this.modIds.splice(0, this.modIds.length);
        if (newHostName in this.playerids) {
            this.modIds.push(this.playerids[newHostName].playerid);
            if (this.getPlayer(newHostName)) this.getPlayer(newHostName).isMod = true;
            return true;
        }
        this.transferHostToNextPlayer();
        return false;
    }

    // private method
    setHost(playerName, playerId) {
        this.modIds.push(playerId);
        const p = this.table.getPlayer(playerName);
        if (p) p.isMod = true;
    }

    getPlayerId(playerName) {
        if (Object.keys(this.playerids).includes(playerName))
            return this.playerids[playerName].playerid;
        else
            return undefined;
    }

    isModPlayerId (pid) {
        return this.modIds.includes(pid);
    }

    isActivePlayerId(playerid) {
        return Object.values(this.playerids).map(x => x.playerid).includes(playerid);
    }
    isSeatedPlayerId(playerid) {
        return this.table.allPlayers.filter(p=>p!==null).map(p=>p.playerName).includes(this.getPlayerById(playerid));
    }

    getPlayerById(pid) {
        // console.log(playerids);
        // let t = this.table;
        for (let name of Object.keys(this.playerids)){
            // console.log('name', name);
            if (this.playerids[name].playerid === pid){
                return name;
            }
        }
        return 'guest';
    }

    updatePlayerId(playerName, playerid) {
        let oldplayerid = this.playerids[playerName].playerid;

        let oldModIndex = this.modIds.indexOf(oldplayerid);
        if (oldModIndex > -1) // if oldplayerid is the player ID of a mod
            this.modIds.splice(oldModIndex, 1, playerid);

        for (let i = 0; i < this.trackBuyins.length; i++) {
            if (this.trackBuyins[i].playerName === playerName && this.trackBuyins[i].playerid === oldplayerid){
                this.trackBuyins[i].playerid = playerid;
            }
        }
        this.playerids[playerName].playerid = playerid;
    }

    playerHandState(playerName) {
        const p = this.table.getPlayer(playerName);
        if (!p) return null;
        let result = {
            cards: this.table.getHandForPlayerName(playerName),
            handRankMessage: '',
        };
        if (this.gameInProgress && p.inHand) {
            const playableCards = p.cards.concat(this.table.game.board);
            result.handRankMessage = rankHandInt(new Hand(playableCards)).message;
        }
        return result;
    }

    getAvailableSeat() {
        return this.table.getAvailableSeat();
    }

    startRound() {
        this.gameInProgress = true;
        this.updateBlinds();
        this.updateQueuedStackChanges();
        this.table.initNewRound();
        if (!this.table.game)
            this.gameInProgress = false;
    }

    /**
     * @param {string} playerName
     * @param {string} action Player's action
     * @param {number} amount Player's action amount. Ignored if action === 'call', 'check', or 'fold'
     * @return {number} Amount bet. -1 if action cannot be performed
     */
    performActionHelper(playerName, action, amount) {
        if (amount < 0 || this.actionSeat !== this.getPlayerSeat(playerName)) {
            return -1;
        }
        let actualBetAmount = 0;
        if (action === 'bet') {
            actualBetAmount = this.bet(playerName, amount);
        } else if (action === 'raise') {
            actualBetAmount = this.raise(playerName, amount);
        } else if (action === 'call') {
            if (this.getRoundName() === 'deal') {
                actualBetAmount = this.callBlind(playerName);
            } else {
                actualBetAmount = this.call(playerName);
            }
        } else if (action === 'fold') {
            actualBetAmount = 0;
            this.fold(playerName);
        } else if (action === 'check') {
            let canPerformAction = this.check(playerName);
            if (canPerformAction) {
                actualBetAmount = 0;
            }
        }
        return actualBetAmount;
    }

    getCardsByPlayerName(playerName) {
        return this.table.getHandForPlayerName(playerName);
    }

    callBlind(playerName) {
        return this.table.callBlind();
    };

    call(playerName) {
        // this.table.call(this.table.getCurrentPlayer());
        // console.log(this.table);
        return this.table.call();
    }

    check(playerName) {
        // return this.table.check(this.table.getCurrentPlayer());
        return this.table.check();
    }

    fold(playerName) {
        // return this.table.fold(this.table.getCurrentPlayer());
        return this.table.fold();
    }

    bet(playerName, betAmount) {
        // return this.table.bet(this.table.getCurrentPlayer(), betAmount);
        return this.table.bet(betAmount);
    }


    // allows user to raise to a number
    // (such that node-poker doenst have him bet that number + his previous bet)
    raise(playerName, betAmount) {
        let playersLastBet = this.getBet(playerName);
        let realBetAmount = betAmount - playersLastBet;
        // let addedBetSize = betAmount - getBet
        // return this.table.bet(this.table.getCurrentPlayer(), betAmount);
        console.log(`player ${playerName} is betting ${realBetAmount} on top of his last bet of ${playersLastBet}`);
        return this.bet(playerName, realBetAmount);
    }

    getWinnings(prev_round) {
        console.log('calculating winnings');
        let winnings = this.table.game.pot;
        if (prev_round === 'deal') {
            //basically check if any bets are still on the table and add them to the pot (for big blind, etc)
            for (const p of this.table.players) {
                winnings += p.bet;
            }
        }
        return winnings;
    }

    updateStack(playerName, winnings) {
        this.table.getPlayer(playerName).GetChips(winnings);
    }

    // different than update stack as it changes stack entirely, doesn't add on
    updateStackBuyIn(playerName, stackAmount, change) {
        this.table.getPlayer(playerName).UpdateStackAmount(stackAmount);
        this.updateBuyIn(playerName, this.getPlayerId(playerName), change);
    }

    getWinners() {
        return this.table.getWinners();
    }

    // if thats the case, just call and move forward with game
    actionOnAllInPlayer() {
        let actionSeat = this.actionSeat;
        if (this.allIn[actionSeat]){
            console.log('action on all in player, moving game forward');
            this.check(this.getPlayerBySeat(actionSeat));
            return true;
        } else {
            return false;
        }
    }

    isEveryoneAllIn() {
        return this.table.isEveryoneAllIn();
    }

    hasPlayerFolded(playerName) {
        return this.table.getPlayer(playerName).folded;
    }

    updateBlindsNextHand(smallBlind, bigBlind) {
        if (this.gameInProgress){
            this.smallBlindNextHand = smallBlind;
            this.bigBlindNextHand = bigBlind;
        } else {
            this.table.bigBlind = bigBlind;
            this.table.smallBlind = smallBlind;
        }
    }

    updateBlinds() {
        if (this.smallBlindNextHand){
            this.table.smallBlind = this.smallBlindNextHand;
            this.smallBlindNextHand = undefined;
        }
        if (this.bigBlindNextHand){
            this.table.bigBlind = this.bigBlindNextHand;
            this.bigBlindNextHand = undefined;
        }
    }

    updateStraddleLimit(straddleLimit) {
        // quit out of any current straddles
        for (let name of Object.keys(this.playerids)) {
            this.setPlayerStraddling(this.playerids[name].playerid, false);
        }
        this.table.straddleLimit = straddleLimit;
    }

    queueUpdatePlayerStack(playerName, amount) {
        if (!this.gameInProgress){
            let curAmount = this.getPlayer(playerName).chips || 0;
            let change = amount - curAmount;
            this.updateStackBuyIn(playerName, amount, change);
        } else {
            let obj = {
                name: playerName,
                stack: amount
            };
            this.playerStacksNextHand.push(obj);
        }
    }

    updateQueuedStackChanges() {
        while(this.playerStacksNextHand.length > 0){
            let playerName = this.playerStacksNextHand[0].name;
            let playerStack = this.playerStacksNextHand[0].stack;
            if (this.getPlayer(playerName)){
                let curAmount = this.getPlayer(playerName).chips;
                let change = playerStack - curAmount;
                this.updateStackBuyIn(playerName, playerStack, change);
            }
            // remove element from list
            this.playerStacksNextHand.shift();
        }
    }
}

module.exports.TableStateManager=TableStateManager;
module.exports.TableManager=TableManager;