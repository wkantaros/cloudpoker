export class TableStateManager {
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