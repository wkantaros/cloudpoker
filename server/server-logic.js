/**
 * functions needed
 */

let poker = require('../poker-logic/lib/node-poker');

// could probably make this a proper db at some point
// maps sessionid -> TableManager
let tables = {};

let createNewTable = (sessionid, smallBlind, bigBlind, hostName, hostStack, hostIsStraddling, straddleLimit, playerid) => {
    let table = new poker.Table(smallBlind, bigBlind, 2, 10, 1, 500000000000, straddleLimit);
    tables[sessionid] = new TableManager(table, hostName, hostStack, hostIsStraddling, playerid);
    return tables[sessionid];
};

class TableManager {
    constructor(table, hostName, hostStack, hostIsStraddling, playerid) {
        this.table = table;
        this.hostName = hostName;
        this.hostStack = hostStack;
        this.allIn = [false, false, false, false, false, false, false, false, false, false];
        this.gameInProgress = false;
        this.trackBuyins = [];
        this.playerids = {};
        this.timerDelay = -1;
        this.timer = null;
        this.timerCallback = null;
        table.AddPlayer(hostName, hostStack, hostIsStraddling);
        this.addToPlayerIds(hostName, playerid);
        this.addToBuyins(hostName, playerid, hostStack);
    }

    get bigBlindSeat() {
        const t = this.table;
        return t.players[(t.dealer + 2) % t.players.length].seat;
    };

    // let(\s*)(\S*)(\s*)=(\s*)\((.*)\)(\s*)=>
    // $2($5)
    addToPlayerIds(playerName, playerid) {
        this.playerids[playerName] = {playerid};
    }

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

    getBuyinBuyouts() {
        return this.trackBuyins;
    };

    // adds the player to this.playerids
    // adds the player to the table
    buyin(playerName, playerid, stack, isStraddling) {
        const addedPlayer = this.table.AddPlayer(playerName, stack, isStraddling);
        if (addedPlayer) {
            this.addToPlayerIds(playerName, playerid);
            this.addToBuyins(playerName, playerid, stack);
            console.log(`${playerName} buys in for ${stack}`);
            if (this.hostName === null){
                console.log(`transferring host to ${playerName} (pid: ${playerid})`);
                this.transferHost(playerName);
                this.hostStack = stack;
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
            player.isStraddling = isStraddling;
        }
    }

    removePlayer(playerName) {
        this.table.removePlayer(playerName);
        delete this.playerids[playerName];
        if (playerName === this.hostName){
            // transfer host name / abilities to next player
            this.transferHost('');
        }
    }

    transferHost(newHostName) {
        console.log(this.playerids);
        if (newHostName in this.playerids){
            this.hostName = newHostName;
            this.hostStack = this.getStack(newHostName);
            console.log('successfully transferred host to ' + newHostName);
            return true;
        } else if (Object.keys(this.playerids).length > 0) {
            const playerName = Object.keys(this.playerids)[0];
            this.hostName = playerName;
            this.hostStack = this.getStack(playerName);
            console.log('transferred host to ' + playerName);
            return true;
        } else {
            this.hostName = null;
            this.hostStack = null;
            console.log('no player to transfer game to :(');
        }
        return false;
    }

    // returns the seats of all all in players
    getAllIns() {
        let players = this.table.players;
        for (let i = 0; i < players.length; i++){
            this.allIn[players[i].seat] = players[i].allIn;
        }
        return this.allIn;
    }

    getLosers() {
        let losers = this.table.getLosers();
        console.log('losers!');
        console.log(losers);
        return losers;
    }

    playersInNextHand () {
        return this.table.allPlayers.filter(elem => elem !== null && !elem.leavingGame);
    }

    isPlayerNameUsed(playerName) {
        return Object.keys(this.playerids).includes(playerName)
    };

    getStraddleLimit() {
        return this.table.straddleLimit;
    };

    getPlayerId(playerName) {
        if (Object.keys(this.playerids).includes(playerName))
            return this.playerids[playerName].playerid;
        else
            return undefined;
    }

    getModId() {
        if (this.hostName != null){
            return this.getPlayerId(this.hostName);
        } else {
            return null;
        }
    }

    isModPlayerId (pid) {
        if (this.hostName === null) return false;
        return this.getPlayerId(this.hostName) === pid;
    }

    isActivePlayerId(playerid) {
        return Object.values(this.playerids).map(x => x.playerid).includes(playerid);
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

    updatePlayerId(playerName, playerid) {
        let oldplayerid = this.playerids[playerName].playerid;
        for (let i = 0; i < this.trackBuyins.length; i++) {
            if (this.trackBuyins[i].playerName === playerName && this.trackBuyins[i].playerid === oldplayerid){
                this.trackBuyins[i].playerid = playerid;
            }
        }
        this.playerids[playerName].playerid = playerid;
    }

    getAvailableSeat() {
        return this.table.getAvailableSeat();
    };

    // returns a list of {playerName, seat, stack, playerid, waiting, betAmount}
    // playerName -> { playerid, seat }
    playersInfo() {
        let info = [];
        const waitingPlayerNames = this.table.waitingPlayers.map(x => x.playerName);
        for (let name in this.playerids){
            if (this.playerids.hasOwnProperty(name)) {
                let isWaiting = waitingPlayerNames.includes(name);
                info.push({
                    playerName: name,
                    seat: this.getPlayerSeat(name),
                    stack: this.getStack(name),
                    playerid: this.playerids[name].playerid,
                    waiting: isWaiting,
                    betAmount: this.getBet(name), // amount that name bet so far in this street
                })
            }
        }
        // console.log(info);
        return info;
    };

    getBet (playerName) {
        if (!this.gameInProgress) return 0;
        return this.table.getPlayer(playerName).bet;
    }

    getStack(playerName) {
        const p = this.table.getPlayer(playerName);
        if (!p) return -1;
        return p.chips;
    }

    startGame() {
        this.gameInProgress = true;
        this.table.StartGame();
    }

    startRound() {
        this.table.initNewRound();
        if (!this.table.game)
            this.gameInProgress = false;
    }

    getCardsByPlayerName(playerName) {
        return this.table.getHandForPlayerName(playerName);
    }

    get actionSeat() {
        if (this.gameInProgress){
            const t = this.table;
            return t.players[t.currentPlayer].seat;
        } else {
            return -1;
        }
    }

    getDealerSeat() {
        // console.log('GET DEALER');
        // console.log(this.table);
        // console.log('----------');
        if (this.gameInProgress) {
            const t = this.table;
            return t.players[t.dealer].seat;
            // console.log(this.table.bets);
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

    callBlind(playerName) {
        return this.table.callBlind(playerName);
    };

    call(playerName) {
        // this.table.call(this.table.getCurrentPlayer());
        // console.log(this.table);
        return this.table.call(playerName);
    }

    check(playerName) {
        // return this.table.check(this.table.getCurrentPlayer());
        return this.table.check(playerName);
    }

    fold(playerName) {
        // return this.table.fold(this.table.getCurrentPlayer());
        return this.table.fold(playerName);
    }

    bet(playerName, betAmount) {
        // return this.table.bet(this.table.getCurrentPlayer(), betAmount);
        return this.table.bet(playerName, betAmount);
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

    get maxBet() {
        if (this.gameInProgress)
            return this.table.getMaxBet();
        else
            return this.table.bigBlind;
    };

    getNameByActionSeat() {
        let seat = this.actionSeat;
        if (seat === -1) return 'guest';
        return this.table.allPlayers[seat].playerName;
    };

    // return an array of seat, bet objects
    // may lead to a bug down the line still unsure
    getInitialBets() {
        let bets = this.table.players.map(x => x.bet);
        let toReturn = [];
        for (let i = 0; i < bets.length; i++){
            if (bets[i]){
                toReturn.push({
                    seat: this.table.players[i].seat,
                    bet: bets[i]
                });
            }
        }
        return toReturn;
    }

    getWinners() {
        return this.table.getWinners();
    }

    getAvailableActions(playerid) {
        let availableActions = {
            'min-bet': false,
            'bet': false,
            'raise': false,
            'fold': false,
            'call': false,
            'start': false,
            'check': false,
            'your-action': false,
            'straddle-switch': this.getStraddleLimit() !== 0,
        };

        let canPerformPremoves = false;
        // if player is at the table
        if (this.isActivePlayerId(playerid)){
            console.log('player at table');
            // case where game hasnt started yet, player is mod and there are enough players
            if (!this.gameInProgress && (this.getModId() === playerid) && this.playersInNextHand().length >= 2) {
                console.log('game can start');
                availableActions['start'] = true;
            }
            // cases where it's the player's action and game is in progress
            else if (this.gameInProgress && (this.actionSeat === this.getPlayerSeat(this.getPlayerById(playerid)))) {
                // player is in big blind
                if (this.actionSeat === this.bigBlindSeat && this.maxBet === this.table.bigBlind && this.getRoundName() === 'deal') {
                    availableActions['check'] = true;
                    availableActions['raise'] = true;
                    availableActions['fold'] = true;
                    availableActions['your-action'] = true;
                }
                // bet on table
                else if (this.maxBet){
                    availableActions['call'] = true;
                    availableActions['raise'] = true;
                    availableActions['fold'] = true;
                    availableActions['your-action'] = true;
                }
                // no bets yet
                else {
                    availableActions['check'] = true;
                    availableActions['bet'] = true;
                    availableActions['min-bet'] = true;
                    availableActions['fold'] = true;
                    availableActions['your-action'] = true;
                }
            }
            // cases where its not the players action and game is in progress
            else if (this.gameInProgress) {
                let playerName = this.getPlayerById(playerid);
                let playerFolded = this.table.getPlayer(playerName).folded;
                let playerAllIn = this.allIn[this.getPlayerSeat(playerName)];
                if (!playerFolded && !playerAllIn){
                    canPerformPremoves = true;
                }
            }
        }
        return {availableActions, canPerformPremoves};
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

    everyoneAllIn() {
        let playersInfos = this.playersInfo();
        let playersWhoCanAct = 0;
        let allInPlayer = false;
        let allInSeats = this.allIn;
        for (let i = 0; i < 10; i++){
            allInPlayer = allInPlayer || allInSeats[i];
        }
        for (let i = 0; i < playersInfos.length; i++){
            // if the player is currently in the hand
            if (!playersInfos[i].waiting) {
                // if player is not all in
                if (!this.allIn[playersInfos[i].seat]){
                    // if player hasnt folded
                    if (!this.playerFolded(playersInfos[i].playerName)){
                        // the number of players in the hand who can act ++
                        playersWhoCanAct++;
                    }
                }
            }
        }
        console.log(`Number of players who can act: ${playersWhoCanAct}`);
        console.log(`All in player: ${allInPlayer}`);
        let everyoneFolded = this.table.checkwin().everyoneFolded;
        return !everyoneFolded && (playersWhoCanAct <= 1) && allInPlayer;
    }

    playerFolded(playerName) {
        return this.table.getPlayer(playerName).folded;
    }

    getPlayerIds() {
        return Object.values(this.playerids).map(x => x.playerid);
    }

    getTimer() {
        return this.timer;
    }

    setTimer(timer) {
        this.timer = timer;
    }

    initializeTimer(delay, callback) {
        this.timer = setTimeout(delay, callback);
        this.timerDelay = delay;
        this.timerCallback = callback;
    }
}

const getTableById = (id) => tables[id];

module.exports.createNewTable = createNewTable;
module.exports.TableManager = TableManager;
module.exports.getTableById = getTableById;
