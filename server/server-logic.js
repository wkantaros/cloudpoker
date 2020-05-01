const {rankHandInt} = require('../poker-logic/lib/deck');
const {Hand} = require('../poker-logic/lib/node-poker');

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

    get gameState() {
        return {
            smallBlind: this.table.smallBlind,
            bigBlind: this.table.bigBlind,
            dealer: this.getDealerSeat(),
            actionSeat: this.actionSeat,
            pot: this.getPot(),
            street: this.getRoundName(),
            board: this.getDeal()
        };
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

    playersInNextHand() {
        return this.table.allPlayers.filter(elem => elem !== null && !elem.leavingGame);
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
     * @param {*} playerid
     */
    constructor(table, hostName, hostStack, hostIsStraddling, playerid) {
        super(table, false);
        this.hostName = hostName;
        this.hostStack = hostStack;
        this.trackBuyins = [];
        this.playerids = {};
        table.AddPlayer(hostName, hostStack, hostIsStraddling);
        table.getPlayer(hostName).isMod = true;
        this.addToPlayerIds(hostName, playerid);
        this.addToBuyins(hostName, playerid, hostStack);
        this.bigBlindNextHand = undefined;
        this.smallBlindNextHand = undefined;
    }

    // let(\s*)(\S*)(\s*)=(\s*)\((.*)\)(\s*)=>
    // $2($5)
    addToPlayerIds(playerName, playerid) {
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
            if (this.getStraddleLimit() !== 0){
                player.isStraddling = isStraddling;
            } else {
                player.isStraddling = false;
            }
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
        const previousHost = this.getPlayer(this.hostName);
        if (previousHost !== null) {
            previousHost.isMod = false;
        }
        if (newHostName in this.playerids){
            this.setHost(newHostName);
            console.log('successfully transferred host to ' + newHostName);
            return true;
        } else if (Object.keys(this.playerids).length > 0) {
            const playerName = Object.keys(this.playerids)[0];
            this.setHost(playerName);
            console.log('transferred host to ' + playerName);
            return true;
        } else {
            this.hostName = null;
            this.hostStack = null;
            console.log('no player to transfer game to :(');
        }
        return false;
    }

    // private method
    setHost(playerName) {
        this.hostName = playerName;
        this.hostStack = this.getStack(playerName);
        this.table.getPlayer(playerName).isMod = true;
    }

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

    updatePlayerId(playerName, playerid) {
        let oldplayerid = this.playerids[playerName].playerid;
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
        if (this.gameInProgress) {
            const playableCards = p.cards.concat(this.table.game.board);
            result.handRankMessage = rankHandInt(new Hand(playableCards)).message;
        }
        return result;
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

    startGame() {
        this.gameInProgress = true;
        this.updateBlinds();
        this.table.StartGame();
    }

    startRound() {
        this.updateBlinds();
        this.table.initNewRound();
        if (!this.table.game)
            this.gameInProgress = false;
    }

    getCardsByPlayerName(playerName) {
        return this.table.getHandForPlayerName(playerName);
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

    // Idk why this returns bigBlind if game is not in progress. I don't want to break anything.
    get maxBet() {
        if (this.gameInProgress)
            return this.table.getMaxBet();
        else
            return this.table.bigBlind;
    };

    // return an array of seat, bet objects
    // may lead to a bug down the line still unsure
    getInitialBets() {
        return this.table.players.filter(p=>p.bet > 0).map(p=> {
            return {seat: p.seat, bet: p.bet,}
        });
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

    getPlayerIds() {
        return Object.values(this.playerids).map(x => x.playerid);
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
}

module.exports.TableStateManager = TableStateManager;
module.exports.TableManager = TableManager;
