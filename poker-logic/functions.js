//heres a list of all the functions in node-poker.js

//objects
Table(smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn)

Player(playerName, chips, table)

// fils the deck
fillDeck(deck)

//takes in the bets and returns the max bet
getMaxBet(bets)

//returns true if action has ended
checkForEndOfRound(table)

//returns a list of all in players (that won the hand)
checkForAllInPlayer(table, winners)

//handles winner 
checkForWinner(table)

//removes bankrupt player from table
checkForBankrupt(table)

//hand
Hand(cards)

//Result(float, string)
Result(rank, message)

//ranks kickers (returns float (kicker rank))
rankKickers(ranks, noOfCards)

//returns Result of hand (rank)
rankHandInt(hand)

//not really sure what this does tbh
progress(table)


//Game
function Game(smallBlind, bigBlind) {
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.pot = 0;
    this.roundName = 'Deal'; //Start the first round
    this.betName = 'bet'; //bet,raise,re-raise,cap
    this.bets = [];
    this.roundBets = [];
    this.deck = [];
    this.board = [];
    fillDeck(this.deck);
}


//table methods we should use
//returns cards for player (input is a string)
getHandForPlayerName(playerName)

//returns the game board
getDeal()

//no fucking clue
getEventEmitter()

//returns current playername (string)
getCurrentPlayer()

//returns what the previous player did (object)
getPreviousPlayerAction()

//returns winners (list of {playerName, amount, hand, chips})
getWinners()

// returns list of Players who lost (out 0)
getLosers()

// returns all hands (list of {playerName, chips, hand} )
getAllHands()

//starts a new round
initNewRound()

//starts a game (initializes a Game and calls NewRound)
StartGame()

//player methods we should use
// Player actions: Check(), Fold(), Bet(bet), Call(), AllIn()
//ex
table.players[0].Call();
table.players[1].Bet(50);
table.players[2].Fold();
table.players[1].Bet(50);

//adds chips to players stack
GetChips(cash)