// var events = require('events');
const {fillDeck, rankHandInt, rankHand} = require('./deck');
const {TableState, Player, GameState} = require('../../sharedjs');

//Note: methods I've changed/created have been commented: EDITED

// straddleLimit values:
// -1: unlimited straddles (last player who can straddle is the dealer)
// 0: no straddling allowed
// 1: only player after big blind can straddle
// 1 < x <= players.length - 2: x players can straddle. if x == players.length -2,
//      the same behavior as -1 occurs.
// x > players.length - 2: same behavior as -1 occurs.
class Table extends TableState{
    constructor(smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn, straddleLimit) {
        let allPlayers = [];
        for (let i = 0; i < maxPlayers; i++) {
            allPlayers.push(null);
        }
        super(smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn, straddleLimit, 0, allPlayers, -1, null);
    }

    callBlind(playerName) {
        let currentPlayer = this.currentPlayer;
        const p = this.players[this.currentPlayer];
        if ( playerName !== p.playerName ) {
            console.log("wrong user has made a move");
            return -1;
        }
        console.log(`${playerName} calls blind`);

        const maxBet = this.getMaxBet();
        const bigBlindIndex = (this.dealer + 2) % this.players.length;
        const isBigBlind = currentPlayer === bigBlindIndex;
        let callAmount;
        if (isBigBlind || maxBet >= this.bigBlind) {
            callAmount = Math.min(p.chips + p.bet, maxBet) - p.bet;
        } else {
            const otherPlayersMaxStack = maxSkippingIndices(this.players.map(x => x.bet + x.chips), currentPlayer);
            // bet bigBlind if following players have a stack >= bigBlind
            // bet < bigBlind if no other player has a stack >= bigBlind
            callAmount = Math.min(otherPlayersMaxStack, this.bigBlind, p.bet + p.chips) - p.bet;
        }
        p.Bet(callAmount);
        progress(this);
        return callAmount;
    };

    // Player actions: Check(), Fold(), Bet(bet), Call(), AllIn()
    check( playerName ){
        const currentPlayer = this.currentPlayer;
        //   EDITED (primarily to deal with 'checking' to close action as bb)
        let cancheck = true;

        for (let v = 0; v < this.players.length; v++) {
            //essentially wrapping this check as a call
            if (this.game.roundName === 'deal' && this.players[v].bet === this.bigBlind && currentPlayer === v){
                if (playerName === this.players[currentPlayer].playerName) {
                    this.players[currentPlayer].Bet(0);
                    progress(this);
                    return true;
                } else {
                    console.log("wrong user has made a move 1234");
                    return false;
                }
            } else if (this.players[v].bet !== 0) {
                cancheck = false;
            }
        }
        if( playerName === this.players[ currentPlayer ].playerName){
            console.log('here!');
            if (cancheck){
                console.log(`${playerName} checks`);
                this.players[currentPlayer].Check();
                progress(this);
                // progress(this);
                return true;
            } else {
                console.log(`${playerName} unable to check`);
                return false;
            }
        } else {
            // todo: check if something went wrong ( not enough money or things )
            console.log("wrong user has made a move abcd");
            return false;
        }
    };
    fold( playerName ){
        let p = this.players[this.currentPlayer];
        if( playerName === p.playerName ){
            this.game.pot += p.bet;
            p.Fold();
            progress(this);
            console.log(`${playerName} folds`);
            return true;
        }else{
            console.log("wrong user has made a move");
            return false;
        }
    };
    call( playerName ){
        let p = this.players[this.currentPlayer];
        if( playerName === p.playerName ) {
            const maxBet = this.getMaxBet();
            console.log(`${playerName} calls`);
            if (p.chips + p.bet > maxBet) {
                console.log(`${playerName} calls`);
                // treat call as bet
                const betAmount = p.Bet(maxBet - p.bet);
                progress(this);
                return betAmount;
            } else {
                console.log(`${playerName} doesn't have enough to call, going all in.`);
                const betAmount = p.AllIn();
                progress(this);
                return betAmount;
            }
        }else{
            console.log("wrong user has made a move");
            return -1;
        }
    };

    /**
     * @param playerName Player betting
     * @param amt Amount to bet (on top of current bet)
     * @return {number|*} Actual amount bet. 0 < y <= amt if player goes all in. y =-1 if amt < 0 or it is not user's turn.
     */
    bet( playerName, amt ){
        if (amt < 0) {
            console.log(`${playerName} tried to bet ${amt}`);
            return -1;
        }
        if( playerName !== this.players[ this.currentPlayer ].playerName ) {
            console.log("wrong user has made a move");
            return -1;
        }
        console.log(`${playerName} bet ${amt}`);
        const betAmount = this.players[ this.currentPlayer ].Bet( amt );
        progress(this);
        return betAmount;
    };

    initNewRound () {
        this.removeAndAddPlayers();
        let handNextRound = this.allPlayers.filter(p => p !== null && !p.standingUp).length >= 2;
        for (let i = 0; i < this.allPlayers.length; i += 1) {
            if (this.allPlayers[i] === null) continue;
            this.allPlayers[i].inHand = !this.allPlayers[i].standingUp && handNextRound;
            this.allPlayers[i].clearHandState();
        }
        if (this.players.length < 2) {
            console.log('not enough players (initNewRound)');
            this.dealer = 0;
            this.currentPlayer = -1;
            this.game = null;
            return;
        }
        this.dealer = (this.dealer + 1) % this.players.length;
        this.game = new Game(this.smallBlind, this.bigBlind);

        //Deal 2 cards to each player
        for (let i = 0; i < this.players.length; i += 1) {
            this.players[i].cards.push(this.game.deck.pop(), this.game.deck.pop());
            this.players[i].bet = 0;
            this.game.roundBets[i] = 0;
        }
        this.initializeBlinds();

        // this.eventEmitter.emit( "newRound" );
    }
    standUpPlayer(playerName) {
        const p = this.allPlayers.find(p => p !== null && p.playerName === playerName);
        if (!p) return false;
        p.standingUp = true;
        if (this.game !== null) {
            this.game.pot += p.bet;
            p.Fold();
            progress(this);
        }
        return true;
    }
    sitDownPlayer(playerName) {
        const p = this.allPlayers.find(p => p !== null && p.playerName === playerName);
        if (!p) return false;
        p.standingUp = false;
        return true;
    }
    AddPlayer(playerName, chips, isStraddling) {
        // console.log(`adding player ${playerName}`);
        // Check if playerName already exists
        const ind = this.allPlayers.findIndex(p => p !== null && p.playerName === playerName);
        if (ind !== -1) {
            const p = this.allPlayers[ind];
            if (p.leavingGame) {
                p.leavingGame = false;
                p.chips = chips;
                p.isStraddling = isStraddling;
                return true;
            }
        } else {
            const seat = this.getAvailableSeat();
            if ( chips >= this.minBuyIn && chips <= this.maxBuyIn && seat !== -1) {
                const player = new Player(playerName, chips, isStraddling, seat, false);
                this.allPlayers[seat] = player;
                return true;
            }
        }
        return false;
    };
    removePlayer (playerName){
        const ind = this.allPlayers.findIndex(p => p !== null && p.playerName === playerName);
        if (ind === -1) return false;
        // this.playersToRemove.push(ind);

        if (this.game !== null) {
            const p = this.allPlayers[ind];
            this.allPlayers[p.seat].leavingGame = true;
            this.game.pot += p.bet;
            // this.allPlayers[ind] = null;
            p.Fold();
            progress(this);
        } else {
            // if no game is in progress, simply remove the player
            this.allPlayers[ind] = null;
        }
        return true;
    }
    removeAndAddPlayers() {
        const playersToRemove = this.leavingPlayers;
        // TODO: possible edge case if player clicks stand up before the game starts because inHand would be false.
        //   to circumvent this, send all standing up players to the front end, not just an update with players
        //   that are newly standing up.
        const playersToStandUp = this.allPlayers.filter(p => p !== null && !p.leavingGame && p.inHand && p.standingUp);
        const playersToAdd = this.waitingPlayers;

        for (const p of playersToRemove) {
            if (p.seat <= this.dealer)
                this.dealer--;
            this.allPlayers[p.seat] = null;
        }
        for (const p of playersToStandUp) {
            if (p.seat <= this.dealer)
                this.dealer--;
            p.inHand = false;
            p.clearHandState(); // this will not be called in initNewRound because p.inHand is false
        }
        for (const p of playersToAdd) {
            if (p.seat <= this.dealer)
                this.dealer++;
            p.inHand = true;
        }
        if (this.players.length >= 2) {
            this.dealer = this.dealer % this.players.length;
        } else {
            this.dealer = 0;
        }
    }

    initializeBlinds() {
        // Small and Big Blind player indexes
        let smallBlind = (this.dealer + 1) % this.players.length;
        let bigBlind = (this.dealer + 2) % this.players.length;

        // Force Blind Bets
        this.currentPlayer = smallBlind;
        this.postBlind(this.smallBlind);
        this.currentPlayer = bigBlind;
        this.postBlind(this.bigBlind);

        const maxStraddles = this.maxStraddles();
        for (let i = 0; i < maxStraddles; i++) {
            const nextPlayer = (this.currentPlayer + 1) % this.players.length;
            if (!this.players[nextPlayer].isStraddling) { break; }
            const straddleAmount = this.bigBlind * Math.pow(2, i + 1); // bigBlind * 2^(i+1)
            if (this.players[nextPlayer].chips < straddleAmount) {
                console.log(`${this.players[nextPlayer]} does not have enough to straddle`);
                break;
            }
            this.currentPlayer = nextPlayer;
            this.postBlind(straddleAmount);
        }
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    };

    postBlind(blindAmount) {
        const otherPlayersMaxStack = maxSkippingIndices(this.players.map(x => x.bet + x.chips), this.currentPlayer);
        const p = this.players[this.currentPlayer];
        let betAmount = Math.min(otherPlayersMaxStack, blindAmount, p.bet + p.chips);
        betAmount = p.Bet(betAmount);
        p.talked = false;
        return betAmount;
    };
}

// returns true if the next street should be dealt or the round is over.
// does not return false if <= 1 player folded. use checkwin for that.
function checkForEndOfRound(table) {
    let endOfRound = true;
    const maxBet = table.getMaxBet();
    //For each player, check
    // EDITED
    let counter = 1;
    let j = table.currentPlayer;
    while (counter <= table.players.length){
        const p = table.players[j];
        if (p.inHand && !p.folded && (!p.talked || p.bet !== maxBet) && !p.allIn) {
            table.currentPlayer = j;
            endOfRound = false;
            break;
        }
        j = (j + 1) % table.players.length;
        counter++;
    }
    return endOfRound;
}

function identifyWinners(table) {
    //Identify winner(s)
    let winners = [];
    let maxRank = 0.000;
    for (let k = 0; k < table.players.length; k += 1) {
        if (table.players[k].hand.rank === maxRank && table.players[k].folded === false) {
            winners.push(k);
        }
        if (table.players[k].hand.rank > maxRank && table.players[k].folded === false) {
            maxRank = table.players[k].hand.rank;
            winners.splice(0, winners.length);
            winners.push(k);
        }
    }
    return winners;
}

// Calculates side pot value if any players went all in.
// If no player went all in, returns the value of the main pot.
function getSidePotBet(table, winners) {
    let part = 0;
    let allInPlayer = winners.filter(wi => table.players[wi].allIn);
    if (allInPlayer.length > 0) {
        let minBets = table.game.roundBets[winners[0]];
        for (let j = 1; j < allInPlayer.length; j += 1) {
            if (table.game.roundBets[winners[j]] !== 0 && table.game.roundBets[winners[j]] < minBets) {
                minBets = table.game.roundBets[winners[j]];
            }
        }
        part = parseInt(minBets, 10);
    } else {
        // do not think that parseInt is necessary, but do not want to break anything by removing this line.
        part = parseInt(table.game.roundBets[winners[0]], 10);
    }
    return part;
}

function getSidePotPrize(table, part) {
    let prize = 0;
    for (let l = 0; l < table.game.roundBets.length; l += 1) {
        if (table.game.roundBets[l] > part) {
            prize += part;
            table.game.roundBets[l] -= part;
        } else {
            prize += table.game.roundBets[l];
            table.game.roundBets[l] = 0;
        }
    }
    return prize;
}

function checkForWinner(table) {
    let winners = identifyWinners(table);

    let part = getSidePotBet(table, winners);
    let prize = getSidePotPrize(table, part);

    const winnerPrize =prize / winners.length;
    // TODO: make the next pot start with extraChips, not 0.
    // const extraChips = prize - (winnerPrize * winners.length);
    for (let i = 0; i < winners.length; i += 1) {
        const winningPlayer = table.players[winners[i]];
        winningPlayer.chips += winnerPrize;
        if (table.game.roundBets[winners[i]] === 0) {
            winningPlayer.folded = true;
            table.game.winners.push( {
                playerName: winningPlayer.playerName,
                amount: winnerPrize,
                hand: winningPlayer.hand,
                chips: winningPlayer.chips,
                seat: winningPlayer.seat,
            });
        }
        console.log('player ' + table.players[winners[i]].playerName + ' wins !!');
    }

    let roundEnd = table.game.roundBets.filter(rb => rb !== 0).length === 0;
    if (roundEnd === false) {
        checkForWinner(table);
    }
}

function checkForBankrupt(table) {
    var i;
    for (i = 0; i < table.players.length; i += 1) {
        if (table.players[i].chips === 0) {
          table.game.losers.push( table.players[i] );
            console.log('player ' + table.players[i].playerName + ' is going bankrupt');
            // EDIT
            // rather than removing players here i thin it makes sense to call remove player on it
            // table.players.splice(i, 1);
        }
    }
}

class Hand {
    constructor(cards) {
        this.cards = cards;
    }
}
// const Hand = function(cards) {
//     this.cards = cards;
// }

function progress(table) {
    // table.eventEmitter.emit( "turn" );
    var i, j, cards, hand;
    if (table.game) {
        if (checkForEndOfRound(table) === true) {
          table.currentPlayer = (table.dealer + 1) % table.players.length;
          let ctr = 0;
          while(table.players[table.currentPlayer].folded && ctr < table.players.length){
              console.log('here 123:O');
              // basically we want to skip all of the folded players if they're folded when going to next round (currently sets to 0)
              table.currentPlayer = (table.currentPlayer + 1) % table.players.length;
              ctr++;
          }
          if (ctr >= table.players.length){
              console.log('giant massive error here please come back and check on logic this is a mess');
          }
          // ^^done with edits
            //Move all bets to the pot
            for (i = 0; i < table.players.length; i++) {
                table.game.pot += table.players[i].bet;
                table.game.roundBets[i] += table.players[i].bet;
            }
            if (table.game.roundName === 'River') {
                table.game.roundName = 'Showdown';
                //Evaluate each hand
                for (j = 0; j < table.players.length; j += 1) {
                    cards = table.players[j].cards.concat(table.game.board);
                    hand = new Hand(cards);
                    table.players[j].hand = rankHand(hand);
                }
                checkForWinner(table);
                checkForBankrupt(table);
                // table.eventEmitter.emit( "gameOver" );
            } else if (table.game.roundName === 'Turn') {
                console.log('effective turn');
                table.game.roundName = 'River';
                turnCards(table, 1);
            } else if (table.game.roundName === 'Flop') {
                console.log('effective flop');
                table.game.roundName = 'Turn';
                turnCards(table, 1);
            } else if (table.game.roundName === 'deal') {
                console.log('effective deal');
                table.game.roundName = 'Flop';
                turnCards(table, 3);
            }
        }
    }
}

// count is the amount of cards to turn.for flop, should be 3. for turn and river, 1.
function turnCards(table, count) {
    table.game.deck.pop(); //Burn a card
    for (let i = 0; i < count; i += 1) { //Turn a card <count> times
        table.game.board.push(table.game.deck.pop());
    }
    for (let i = 0; i < table.players.length; i += 1) {
        table.players[i].talked = false;
        table.players[i].checked = false;
        table.players[i].bet = 0;
    }
    // table.eventEmitter.emit( "deal" );
}

class Game extends GameState {
    constructor(smallBlind, bigBlind) {
        super(smallBlind, bigBlind);
        this.deck = [];
        fillDeck(this.deck);
    }
}

/*
 * Helper Methods Public
 */

function maxSkippingIndices(arr, ...ind) {
    let m = 0;
    for (let i = 0; i < arr.length; i++) {
        if (ind.includes(i)) continue;
        m = Math.max(m, arr[i])
    }
    return m;
}

function rankHands(hands) {
    var x, myResult;

    for (x = 0; x < hands.length; x += 1) {
        myResult = rankHandInt(hands[x]);
        hands[x].rank = myResult.rank;
        hands[x].message = myResult.message;
    }

    return hands;
}

module.exports.Table = Table;
module.exports.Hand = Hand;
