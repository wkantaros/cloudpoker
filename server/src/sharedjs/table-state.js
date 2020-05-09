const {Hand, rankHandInt} = require("../poker-logic");

class TableState {
    /**
     *
     * @param {number} smallBlind
     * @param {number} bigBlind
     * @param {number} minPlayers
     * @param {number} maxPlayers
     * @param {number} minBuyIn
     * @param {number} maxBuyIn
     * @param {number} straddleLimit
     * @param {number} dealer
     * @param {Player[]} allPlayers
     * @param {number} currentPlayer
     * @param {GameState|null} game
     */
    constructor(smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn, straddleLimit, dealer, allPlayers, currentPlayer, game) {
        this.smallBlind = smallBlind;
        this.bigBlind = bigBlind;
        this.minPlayers = minPlayers;
        this.maxPlayers =  maxPlayers;
        // allPlayers[i].seat === i. empty seats correspond to a null element.
        this.allPlayers = allPlayers;
        this.dealer = dealer; //Track the dealer position between games
        this.currentPlayer = currentPlayer; // Initialized to 1 in initializeBlinds (called by startGame)
        this.minBuyIn = minBuyIn;
        this.maxBuyIn = maxBuyIn;
        this.straddleLimit = straddleLimit;
        this.game = game;

        //Validate acceptable value ranges.
        let err;
        if (minPlayers < 2) { //require at least two players to start a game.
            err = new Error(101, 'Parameter [minPlayers] must be a postive integer of a minimum value of 2.');
        } else if (maxPlayers > 10) { //hard limit of 10 players at a table.
            err = new Error(102, 'Parameter [maxPlayers] must be a positive integer less than or equal to 10.');
        } else if (minPlayers > maxPlayers) { //Without this we can never start a game!
            err = new Error(103, 'Parameter [minPlayers] must be less than or equal to [maxPlayers].');
        }

        if (err) {
            return err;
        }
    }

    getPublicInfo() {
        return {
            smallBlind: this.smallBlind,
            bigBlind: this.bigBlind,
            allPlayers: this.playerStates,
            dealer: this.dealer,
            currentPlayer: this.currentPlayer,
            minBuyIn: this.minBuyIn,
            maxBuyIn: this.maxBuyIn,
            straddleLimit: this.straddleLimit,
            game: this.game? this.game.getPublicInfo(): null,
        }
    }

    playerPublicInfo(p) {
        return this.extraPlayerInfo(p.getPublicInfo());
    }

    // extra info used only on the front end
    extraPlayerInfo(info) {
        info.handRankMessage = info.cards.length > 0? rankHandInt(new Hand(info.cards.concat(this.game.board))).message : '';
        info.isDealer = this.game !== null && this.dealer > -1 && this.players[this.dealer] && this.players[this.dealer].playerName === info.playerName;
        info.isActionSeat = this.game !== null && this.currentPlayer > -1 && this.players[this.currentPlayer] && this.actionSeat === info.seat;
        info.earnings = 0;
        return info;
    }

    get playerStates() {
        let states = this.allPlayers.map(p => p === null ? null: this.playerPublicInfo(p));
        if (this.game) {
            for (let winnerInfo of this.game.winners) {
                states[winnerInfo.seat].earnings = winnerInfo.amount;
            }
        }
        return states;
    }

    get players() {
        return this.allPlayers.filter(p => p !== null && p.inHand);
    }

    get waitingPlayers() {
        return this.allPlayers.filter(p => p!== null && p.isWaiting);
    }

    get leavingPlayers() {
        return this.allPlayers.filter(p => p !== null && p.leavingGame)
    }

    get actionSeat() {
        return this.players[this.currentPlayer].seat;
    }

    get bigBlindSeat() {
        return this.players[(this.dealer + 2) % this.players.length].seat;
    }
    getWinners(){
        return this.game.winners;
    };
    getLosers(){
        return this.game.losers;
    };
    getHandForPlayerName( playerName ){
        const p = this.getPlayer(playerName);
        if (p !== null) return p.cards || [];
        return [];
    };

    /**
     * @return {Player|null}
     */
    getPlayer( playerName ){
        return this.allPlayers.find(elem => elem !== null && elem.playerName === playerName) || null;
    };
    getDeal(){
        return this.game.board;
    };
    getCurrentPlayer() {
        return this.players[ this.currentPlayer ].playerName;
    };
    canPlayerRaise(playerName) {
        const p = this.getPlayer(playerName);
        if (p === null || !p.inHand || p.folded) {
            return false;
        }
        return p.bet + p.chips > this.getMaxBet() && !this.isEveryoneAllIn();
    }
    isEveryoneAllIn() {
        const playersIn = this.players.filter(p=>!p.folded);
        const playersWhoCanAct = playersIn.filter(p=>!p.allIn);
        return playersIn.length >= 2 && playersWhoCanAct.length <= 1;
    }
    // Precondition: A game is in progress.
    canPlayersRevealHands() {
        return this.game.roundName.toLowerCase() === 'showdown' || this.players.filter(p => !p.folded).length <= 1
    }

    // Precondition: A game is in progress.
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

        let canPerformPremoves = false;
        const p = this.getPlayer(playerName);
        availableActions['show-hand'] = (p !== null) && !p.showingCards && p.inHand && this.canPlayersRevealHands();
        // no action can be performed if players can show hands because betting is over
        if (availableActions['show-hand'] || p === null || !p.inHand || p.showingCards){
            return {availableActions, canPerformPremoves};
        }
        // if (p === null || !p.inHand || p.folded || this.canPlayersRevealHands())
        //     return {availableActions, canPerformPremoves};

        // cases where it's the player's action
        if (this.players[this.currentPlayer].playerName === playerName) {
            availableActions['fold'] = true;
            availableActions['your-action'] = true;
            // TODO: this.getMaxBet() === this.bigBlind will be false if it's heads up
            //   and one player went all in with < this.bigBlind
            // player is in big blind
            if (this.actionSeat === this.bigBlindSeat && this.getMaxBet() === this.bigBlind && this.game.roundName.toLowerCase() === 'deal') {
                availableActions['check'] = true;
                availableActions['raise'] = this.canPlayerRaise(playerName);
            }
            // bet on table
            else if (this.getMaxBet() > 0) {
                availableActions['call'] = true;
                console.log(p);
                console.log(this.getMaxBet());

                availableActions['raise'] = this.canPlayerRaise(playerName);
            }
            // no bets yet
            else {
                availableActions['check'] = true;
                availableActions['bet'] = true;
                availableActions['min-bet'] = true;
            }
        }
        // cases where its not the players action
        else if (!p.folded && !p.allIn) {
            canPerformPremoves = true;
        }
        return {availableActions, canPerformPremoves};
    }

    minimumBetAllowed(playerName) {
        const player = this.getPlayer(playerName);
        if (player === null) return 0;
        if (player.bet + player.chips >= this.bigBlind) {
            // min should be < bb if (1) a player’s stack > bb but all players in the hand have a stack < bb
            return Math.min(this.otherPlayersMaxStack(playerName), this.bigBlind);
        }
        // (2) a player’s stack < bb
        return Math.min(player.bet + player.chips, this.otherPlayersMaxStack(playerName));
    }

    otherPlayersMaxStack(playerName) {
        return Math.max(...this.players
            .filter(p=>p.playerName !== playerName && !p.folded)
            .map(x => x.bet + x.chips)
        );
    }

    /**
     * Calculates the maximum that a player can bet (total) as limited
     * by his going all in or making everyone else at the table go all in
     * if he has the biggest stack
     */
    maxBetPossible(playerName) {
        const player = this.getPlayer(playerName);
        if (player === null) return 0;
        return Math.min(player.bet + player.chips, this.otherPlayersMaxStack(playerName));
    };

    // straddleLimit values:
    // -1: unlimited straddles (last player who can straddle is the dealer)
    // 0: no straddling allowed
    // 1: only player after big blind can straddle
    // 1 < x <= players.length - 2: x players can straddle. if x == players.length -2,
    //      the same behavior as -1 occurs.
    // x > players.length - 2: same behavior as -1 occurs.
    // Up to this.players.length -2 players can straddle because
    //      the last player that is able to is the dealer
    maxStraddles() {
        if (this.players.length <= 2) return 0;
        if (this.straddleLimit >= 0 && this.straddleLimit <= this.players.length -2) {
            return this.straddleLimit;
        }
        if (this.straddleLimit === -1 || this.straddleLimit > this.players.length -2) {
            return this.players.length - 2;
        }
        // straddleLimit < -1
        console.log(`Invalid straddleLimit value ${this.straddleLimit}`);
        return 0;
    };

    getAvailableSeat() {
        return this.allPlayers.findIndex(elem => elem === null || elem.leavingGame);
    };
    getMaxBet() {
        return Math.max(...this.players.map(x => x.bet));
    };

    checkwin() {
        let unfoldedPlayers = this.players.filter(p=>!p.folded);
        if (unfoldedPlayers.length === 1) {
            console.log("everyone's folded!");
            return {
                everyoneFolded: true,
                pot: this.game.pot,
                winner: unfoldedPlayers[0]
            };
        }
        return {
            everyoneFolded: false,
            pot: null,
            winner: null
        };
    };
}

class Player {
    /**
     * Constructs a Player object for use with Table.
     * @param playerName Name of the player as it should appear on the front end
     * @param chips The player's initial chip stack
     * @param isStraddling If the player wants to straddle
     * @constructor
     */
    constructor(playerName, chips, isStraddling, seat, isMod) {
        this.playerName = playerName;
        this.chips = chips;
        this.checked = false;
        this.folded = false;
        this.allIn = false;
        this.talked = false;
        // If the player is in the current hand. False is they just joined and are waiting for the next hand.
        this.inHand = false;
        // If the player is standing up from the table
        this.standingUp = false;
        this.cards = [];
        this.bet = 0;
        this.isStraddling = isStraddling;
        this.seat = seat;
        this.leavingGame = false;
        // below fields used only externally
        this.isMod = isMod;
        this.showingCards = false;
    }

    showHand() {
        this.showingCards = true;
    }

    // Clear data from the previous hand.
    clearHandState() {
        this.checked = false;
        this.bet = 0;
        this.folded = false;
        this.talked = false;
        this.allIn = false;
        this.cards.splice(0, this.cards.length);
        this.showingCards = false;
    }

    get isWaiting() {
        return !this.inHand && !this.leavingGame && !this.standingUp;
    }

    getPublicInfo() {
        return {
            playerName: this.playerName,
            chips: this.chips,
            folded: this.folded,
            allIn: this.allIn,
            talked: this.talked,
            inHand: this.inHand,
            standingUp: this.standingUp,
            bet: this.bet,
            seat: this.seat,
            leavingGame: this.leavingGame,
            isMod: this.isMod,
            cards: this.showingCards? this.cards : [],
            showingCards: this.showingCards,
            checked: this.checked,
        }
    }

    GetChips(cash) {
        this.chips += cash;
    };

    // changes stack to new amount
    UpdateStackAmount(cash) {
        if (!isNaN(cash) || cash <= 0){
            this.chips = cash;
        }
    }

    // Player actions: Check(), Fold(), Bet(bet), Call(), AllIn()
    Check() {
        this.applyBet(0);
        return 0;
    };

    Fold() {
        this.bet = 0;
        this.talked = true;
        this.folded = true;
        return 0;
    };

    applyBet(bet) {
        if (bet === 0) this.checked = true
        this.chips -= bet;
        this.bet += bet;
        this.talked = true;
        if (this.chips === 0) {
            this.allIn = true;
        }
    };

    // Returns amount bet. If this.chips < (parameter) bet, return value will be this.chips.
    /**
     * @param bet Amount to bet
     * @return {number|*} Amount actually bet.
     *          bet if player has enough chips. this.chips if player must go all in. -1 if bet is invalid (< 0).
     */
    Bet(bet) {
        if (bet < 0) {
            return -1;
        }
        if (this.chips > bet) {
            this.applyBet(bet);
            return bet;
        } else {
            console.log('You don\'t have enough chips --> ALL IN !!!');
            return this.AllIn();
        }
    };

    /**
     * @return {number} Amount bet
     */
    AllIn() {
        const allInValue = this.chips;
        this.applyBet(allInValue);
        return allInValue;
    };
}

class GameState {
    constructor(smallBlind, bigBlind) {
        this.smallBlind = smallBlind;
        this.bigBlind = bigBlind;
        this.pot = 0;
        this.roundName = 'deal'; //Start the first round
        this.betName = 'bet'; //bet,raise,re-raise,cap
        this.roundBets = [];
        this.board = [];
        this.winners = [];
        this.losers = [];
    }

    getPublicInfo() {
        // everything except for this.deck
        return {
            smallBlind: this.smallBlind,
            bigBlind: this.bigBlind,
            pot: this.pot,
            roundName: this.roundName,
            roundBets: this.roundBets,
            board: this.board,
            winners: this.winners,
            losers: this.losers,
        }
    }
}

module.exports.Player = Player;
module.exports.TableState = TableState;
module.exports.GameState = GameState;