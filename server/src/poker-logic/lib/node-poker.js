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
        super(smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn, straddleLimit, 0, allPlayers, -1);
    }
    applyAction(seat, action, amount) {
        let actualBetAmount = 0;
        if (action === 'standUp') {
            this.standUpPlayer(this.allPlayers[seat].playerName)
        } else if (action === 'sitDown') {
            this.sitDownPlayer(this.allPlayers[seat].playerName);
        } else if (action === 'removePlayer') {
            this.removePlayer(this.allPlayers[seat].playerName)
        } else if (action === 'bet') {
            actualBetAmount = this.bet(amount);
        } else if (action === 'raise') {
            actualBetAmount = this.raise(amount);
        } else if (action === 'call') {
            if (this.game.roundName.toLowerCase() === 'deal') {
                actualBetAmount = this.callBlind();
            } else {
                actualBetAmount = this.call();
            }
        } else if (action === 'fold') {
            actualBetAmount = 0;
            this.fold();
        } else if (action === 'check') {
            let canPerformAction = this.check();
            if (canPerformAction) {
                actualBetAmount = 0;
            }
        }
        return actualBetAmount;
    }

    callBlind() {
        let currentPlayer = this.currentPlayer;
        const p = this.players[this.currentPlayer];

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
    check(){
        const currentPlayer = this.currentPlayer;
        let canCheck = true;

        for (let v = 0; v < this.players.length; v++) {
            //essentially wrapping this check as a call
            if (this.game.roundName === 'deal' && this.players[v].bet === this.bigBlind && currentPlayer === v){
                this.players[currentPlayer].Bet(0);
                progress(this);
                return true;
            } else if (this.players[v].bet !== 0) {
                canCheck = false;
            }
        }
        if (canCheck){
            this.players[currentPlayer].Check();
            progress(this);
        }
        return canCheck;
    };
    foldHelper(p) {
        if (!p.folded) {
            this.game.pot += p.bet;
            this.game.roundBets[this.currentPlayer] += p.bet;
            p.Fold();
            progress(this);
        }
    }
    fold(){
        this.foldHelper(this.players[this.currentPlayer]);
        return true;
    };
    call(){
        let p = this.players[this.currentPlayer];
        const maxBet = this.getMaxBet();
        let betAmount = p.chips + p.bet > maxBet? p.Bet(maxBet - p.bet) : p.AllIn();
        progress(this);
        return betAmount;
    };

    raise(betAmount) {
        return this.bet(betAmount - this.players[this.currentPlayer].bet);
    }
    /**
     * @param amt Amount to bet (on top of current bet)
     * @return {number|*} Actual amount bet. 0 < y <= amt if player goes all in. y =-1 if amt < 0.
     */
    bet(amt){
        if (amt < 0) return -1;
        const betAmount = this.players[this.currentPlayer].Bet( amt );
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
        this.game = new Game(this.smallBlind, this.bigBlind, this.updateRng());

        //Deal 2 cards to each player
        for (let i = 0; i < this.players.length; i += 1) {
            this.players[i].cards.push(this.game.deck.pop(), this.game.deck.pop());
            this.players[i].bet = 0;
            this.game.roundBets[i] = 0;
        }
        this.initializeBlinds();
    }
    standUpPlayer(playerName) {
        const p = this.allPlayers.find(p => p !== null && p.playerName === playerName);
        if (!p) return false;
        p.standingUp = true;
        if (this.game !== null)
            this.foldHelper(p);

        return true;
    }
    sitDownPlayer(playerName) {
        const p = this.allPlayers.find(p => p !== null && p.playerName === playerName);
        if (!p) return false;
        p.standingUp = false;
        return true;
    }
    AddPlayer(playerName, chips, isStraddling, seed) {
        // console.log(`adding player ${playerName}`);
        // Check if playerName already exists
        const ind = this.allPlayers.findIndex(p => p !== null && p.playerName === playerName);
        if (ind !== -1) {
            const p = this.allPlayers[ind];
            if (p.leavingGame) {
                p.leavingGame = false;
                p.chips = chips;
                p.isStraddling = isStraddling;
                p.seed = seed;
                return true;
            }
        } else {
            const seat = this.getAvailableSeat();
            if ( chips >= this.minBuyIn && chips <= this.maxBuyIn && seat !== -1) {
                const player = new Player(playerName, chips, isStraddling, seat, false, seed);
                this.allPlayers[seat] = player;
                return true;
            }
        }
        return false;
    };
    removePlayer (playerName){
        const ind = this.allPlayers.findIndex(p => p !== null && p.playerName === playerName);
        if (ind === -1) return false;

        if (this.game !== null) {
            const p = this.allPlayers[ind];
            this.allPlayers[p.seat].leavingGame = true;
            this.foldHelper(p);
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

/**
 *
 * @param {Table} table
 * @param {Array<Hand> | undefined} handRankings undefined if all but one player folded
 * @return {[]|number[]} Array of the indices (in table.players) of players
 * in this hand who did not fold and have the highest ranking hand
 */
function identifyWinners(table, handRankings) {
    if (table.players.filter(p=>!p.folded).length === 1)
        return [table.players.findIndex(p=>!p.folded)];

    //Identify winner(s)
    let winners = [];
    let maxRank = 0.000;
    for (let k = 0; k < table.players.length; k += 1) {
        if (handRankings[k].rank === maxRank && table.players[k].folded === false) {
            winners.push(k);
        }
        if (handRankings[k].rank > maxRank && table.players[k].folded === false) {
            maxRank = handRankings[k].rank;
            winners.splice(0, winners.length);
            winners.push(k);
        }
    }
    for (let k of winners) {
        table.players[k].showHand();
    }
    return winners;
}

// Calculates side pot value if any players went all in.
// If no player went all in, returns the value of the main pot.
function getSidePotBet(table, winners) {
    let allInPlayer = winners.filter(wi => table.players[wi].allIn);
    let part = table.game.roundBets[winners[0]];
    if (allInPlayer.length > 0) {
        for (let j = 1; j < allInPlayer.length; j += 1) {
            if (table.game.roundBets[winners[j]] !== 0 && table.game.roundBets[winners[j]] < part) {
                part = table.game.roundBets[winners[j]];
            }
        }
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

/**
 *
 * @param table
 * @param {Array<Hand> | undefined} handRankings undefined if all but one player folded
 */
function checkForWinner(table, handRankings) {
    let winners = identifyWinners(table, handRankings || []);

    let part = getSidePotBet(table, winners);
    let prize = getSidePotPrize(table, part);
    table.game.winners.push(...formatWinners(table, prize, winners, handRankings || []));

    let roundEnd = table.game.roundBets.filter(rb => rb !== 0).length === 0;
    if (roundEnd === false) {
        checkForWinner(table);
    }
}

/**
 *
 * @param table
 * @param prize
 * @param winners
 * @param {Array<Hand> | undefined} handRankings undefined if all but one player folded
 * @return {[]}
 */
function formatWinners(table, prize, winners, handRankings) {
    let formattedWinners = [];
    const winnerPrize =prize / winners.length;
    // TODO: make the next pot start with extraChips, not 0.
    // const extraChips = prize - (winnerPrize * winners.length);
    for (let i = 0; i < winners.length; i += 1) {
        const winningPlayer = table.players[winners[i]];
        winningPlayer.chips += winnerPrize;
        if (table.game.roundBets[winners[i]] === 0) {
            winningPlayer.folded = true;
            let winnerData = {
                playerName: winningPlayer.playerName,
                amount: winnerPrize,
                chips: winningPlayer.chips,
                seat: winningPlayer.seat,
            };
            if (handRankings.length > winners[i]) {
                let hand = handRankings[winners[i]];
                winnerData.cards = hand.cards.join(', ');
                winnerData.handRankMessage = hand.message;
            }
            formattedWinners.push(winnerData);
        }
    }
    return formattedWinners;
}

function checkForBankrupt(table) {
    table.game.losers.push(...table.players.filter(p=>p.chips===0));
}

class Hand {
    constructor(cards) {
        this.cards = cards;
    }
}

function clearRoundState(table) {
    table.currentPlayer = (table.dealer + 1) % table.players.length;
    let ctr = 0;
    while(table.players[table.currentPlayer].folded && ctr < table.players.length){
        // basically we want to skip all of the folded players if they're folded when going to next round (currently sets to 0)
        table.currentPlayer = (table.currentPlayer + 1) % table.players.length;
        ctr++;
    }
    if (ctr >= table.players.length){
        console.log('giant massive error here please come back and check on logic this is a mess');
    }
    //Move all bets to the pot
    for (let i = 0; i < table.players.length; i++) {
        table.game.pot += table.players[i].bet;
        table.game.roundBets[i] += table.players[i].bet;
    }
}

function progress(table) {
    if (table.game) {
        let checkWinData = table.checkwin();
        if (checkWinData.everyoneFolded) {
            clearRoundState(table);
            checkForWinner(table);
            checkForBankrupt(table);
        } else if (checkForEndOfRound(table)) {
            clearRoundState(table);
            if (table.game.roundName === 'River') {
                table.game.roundName = 'Showdown';
                let handRankings = table.players.map(p=>rankHand(new Hand(p.cards.concat(table.game.board))));
                checkForWinner(table, handRankings);
                checkForBankrupt(table);
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
    constructor(smallBlind, bigBlind, rng) {
        super(smallBlind, bigBlind);
        this.deck = fillDeck([], rng);
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
