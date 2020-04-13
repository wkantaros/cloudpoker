var events = require('events');
const {fillDeck, rankHandInt, rankHand} = require('./deck');

//Note: methods I've changed/created have been commented: EDITED

function Table(smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn) {
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.minPlayers = minPlayers;
    this.maxPlayers =  maxPlayers;
    this.players = [];
    this.dealer = 0; //Track the dealer position between games
    this.minBuyIn = minBuyIn;
    this.maxBuyIn = maxBuyIn;
    this.playersToRemove = [];
    this.playersToAdd = [];
    this.eventEmitter = new events.EventEmitter();
    this.gameWinners = [];
    this.gameLosers = [];

    //Validate acceptable value ranges.
    var err;
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

function Player(playerName, chips, table) {
    this.playerName = playerName;
    this.chips = chips;
    this.folded = false;
    this.allIn = false;
    this.talked = false;
    // this.table = table; //Circular reference to allow reference back to parent object.
    this.cards = [];
    this.bet = 0;
}

function checkForEndOfRound(table) {
    let endOfRound = true;
    const maxBet = table.getMaxBet();
    //For each player, check
    // EDITED
    let counter = 1;
    let j = table.currentPlayer;
    while (counter <= table.players.length){
        // console.log(`Current player: ${j}`);
        if (table.players[j].folded === false) {
            if (table.players[j].talked === false || table.players[j].bet !== maxBet) {
                if (table.players[j].allIn === false) {
                    table.currentPlayer = j;
                    endOfRound = false;
                    break;
                }
            }
        }
        j = (j + 1) % table.players.length;
        counter++;
    }
    return endOfRound;
}

function checkForAllInPlayer(table, winners) {
    var i, allInPlayer;
    allInPlayer = [];
    for (i = 0; i < winners.length; i += 1) {
        if (table.players[winners[i]].allIn === true) {
            allInPlayer.push(winners[i]);
        }
    }
    return allInPlayer;
}

function checkForWinner(table) {
    var i, j, k, l, maxRank, winners, part, prize, allInPlayer, minBets, roundEnd;
    //Identify winner(s)
    winners = [];
    maxRank = 0.000;
    for (k = 0; k < table.players.length; k += 1) {
        if (table.players[k].hand.rank === maxRank && table.players[k].folded === false) {
            winners.push(k);
        }
        if (table.players[k].hand.rank > maxRank && table.players[k].folded === false) {
            maxRank = table.players[k].hand.rank;
            winners.splice(0, winners.length);
            winners.push(k);
        }
    }

    part = 0;
    prize = 0;
    allInPlayer = checkForAllInPlayer(table, winners);
    if (allInPlayer.length > 0) {
        minBets = table.game.roundBets[winners[0]];
        for (j = 1; j < allInPlayer.length; j += 1) {
            if (table.game.roundBets[winners[j]] !== 0 && table.game.roundBets[winners[j]] < minBets) {
                minBets = table.game.roundBets[winners[j]];
            }
        }
        part = parseInt(minBets, 10);
    } else {
        part = parseInt(table.game.roundBets[winners[0]], 10);

    }
    for (l = 0; l < table.game.roundBets.length; l += 1) {
        if (table.game.roundBets[l] > part) {
            prize += part;
            table.game.roundBets[l] -= part;
        } else {
            prize += table.game.roundBets[l];
            table.game.roundBets[l] = 0;
        }
    }

    for (i = 0; i < winners.length; i += 1) {
      var winnerPrize = prize / winners.length;
      var winningPlayer = table.players[winners[i]];
      winningPlayer.chips += winnerPrize;
        if (table.game.roundBets[winners[i]] === 0) {
            winningPlayer.folded = true;
            table.gameWinners.push( {
              playerName: winningPlayer.playerName,
              amount: winnerPrize,
              hand: winningPlayer.hand,
              chips: winningPlayer.chips
            });
        }
        console.log('player ' + table.players[winners[i]].playerName + ' wins !!');
    }

    roundEnd = true;
    for (l = 0; l < table.game.roundBets.length; l += 1) {
        if (table.game.roundBets[l] !== 0) {
            roundEnd = false;
        }
    }
    if (roundEnd === false) {
        checkForWinner(table);
    }
}

function checkForBankrupt(table) {
    var i;
    for (i = 0; i < table.players.length; i += 1) {
        if (table.players[i].chips === 0) {
          table.gameLosers.push( table.players[i] );
            console.log('player ' + table.players[i].playerName + ' is going bankrupt');
            // EDIT
            // rather than removing players here i thin it makes sense to call remove player on it
            // table.players.splice(i, 1);
        }
    }
}

function Hand(cards) {
    this.cards = cards;
}

function sortNumber(a, b) {
    return b - a;
}

function Result(rank, message) {
    this.rank = rank;
    this.message = message;
}

function progress(table) {
    table.eventEmitter.emit( "turn" );
    var i, j, cards, hand;
    if (table.game) {
        if (checkForEndOfRound(table) === true) {
            // EDITED
        //   table.currentPlayer = (table.currentPlayer >= table.players.length-1) ? (table.currentPlayer-table.players.length+1) : (table.currentPlayer + 1 );
          table.currentPlayer = (table.dealer + 1) % table.players.length;
          let ctr = 0;
          console.log(`TABLE!!! ${table}`);
        //   console.log(table);
          while(table.players[table.currentPlayer].folded && ctr < table.players.length){
              console.log('here 123:O');
              // basically we want to skip all of the folded players if they're folded when going to next round (currently sets to 0)
              table.currentPlayer = (table.currentPlayer + 1 >= table.players.length) ? 0 : table.currentPlayer + 1;
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
                // table.game.bets.splice(0, table.game.bets.length);
                //Evaluate each hand
                for (j = 0; j < table.players.length; j += 1) {
                    cards = table.players[j].cards.concat(table.game.board);
                    hand = new Hand(cards);
                    table.players[j].hand = rankHand(hand);
                }
                checkForWinner(table);
                checkForBankrupt(table);
                table.eventEmitter.emit( "gameOver" );
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
    };
    for (let i = 0; i < table.players.length; i += 1) {
        table.players[i].talked = false;
        table.players[i].bet = 0;
    }
    table.eventEmitter.emit( "deal" );
}

function Game(smallBlind, bigBlind) {
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.pot = 0;
    this.roundName = 'deal'; //Start the first round
    this.betName = 'bet'; //bet,raise,re-raise,cap
    this.bets = [];
    this.roundBets = [];
    this.deck = [];
    this.board = [];
    fillDeck(this.deck);
}

/*
 * Helper Methods Public
 */
// newRound helper
Table.prototype.getHandForPlayerName = function( playerName ){
  for( var i in this.players ){
    if( this.players[i].playerName === playerName ){
      return this.players[i].cards;
    }
  }
  return [];
};

// EDITED (I made it)
Table.prototype.getPlayer = function( playerName ){
  for( var i in this.players ){
    if( this.players[i].playerName === playerName ){
      return this.players[i];
    }
  }
  return [];
};
Table.prototype.getDeal = function(){
  return this.game.board;
};
Table.prototype.getEventEmitter = function() {
  return this.eventEmitter;
};
Table.prototype.getCurrentPlayer = function(){
  return this.players[ this.currentPlayer ].playerName;
};

function maxSkippingIndices(arr, ...ind) {
    let m = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < arr.length; i++) {
        if (ind.includes(i)) continue;
        m = Math.max(m, arr[i])
    }
    return m;
}

Table.prototype.callBlind = function(playerName) {
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
Table.prototype.check = function( playerName ){
  const currentPlayer = this.currentPlayer;
    //   EDITED (primarily to deal with 'checking' to close action as bb)
  let cancheck = true;

  for (let v = 0; v < this.players.length; v++) {
      //essentially wrapping this check as a call
      if (this.game.roundName === 'deal' && this.players[v].bet === this.bigBlind && currentPlayer === v){
          if (playerName === this.players[currentPlayer].playerName) {
              //
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
        this.players[currentPlayer].Check();
          progress(this);
        console.log(`${playerName} checks`);
          progress(this);
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
Table.prototype.fold = function( playerName ){
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
Table.prototype.call = function( playerName ){
  let p = this.players[this.currentPlayer];
  if( playerName === p.playerName ) {
      const maxBet = this.getMaxBet();
      console.log(`${playerName} calls`);
      if (p.chips > maxBet) {
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
Table.prototype.bet = function( playerName, amt ){
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
Table.prototype.getWinners = function(){
  return this.gameWinners;
};
Table.prototype.getLosers = function(){
  return this.gameLosers;
};
Table.prototype.getAllHands = function(){
  var all = this.losers.concat( this.players );
  var allHands = [];
  for( var i in all ){
    allHands.push({
      playerName: all[i].playerName,
      chips: all[i].chips,
      hand: all[i].cards,
    });
  }
  return allHands;
};

Table.prototype.initNewRound = function () {
    this.dealer += 1;
    if (this.dealer >= this.players.length) {
        this.dealer = 0;
    }
    this.game.pot = 0;
    this.game.roundName = 'deal'; //Start the first round
    this.game.betName = 'bet'; //bet,raise,re-raise,cap
    this.game.deck.splice(0, this.game.deck.length);
    this.game.board.splice(0, this.game.board.length);
    for (let i = 0; i < this.players.length; i += 1) {
        this.players[i].bet = 0;
        this.players[i].folded = false;
        this.players[i].talked = false;
        this.players[i].allIn = false;
        this.players[i].cards.splice(0, this.players[i].cards.length);
    }
    fillDeck(this.game.deck);
    this.NewRound();
};

Table.prototype.canStartGame = () => {
    // return this.playersToAdd && this.playersToAdd.length >= 2 && this.playersToAdd.length <= 10;
    // console.log(this.playersToAdd);
    // return (!this.game && this.players.length >= 2 && this.players.length <= 10);
    return true;
}

Table.prototype.StartGame = function () {
    //If there is no current game and we have enough players, start a new game.
    if (!this.game) {
        this.game = new Game(this.smallBlind, this.bigBlind);
        this.NewRound();
    }
};

// Table.prototype.AddPlayer = function (playerName, chips) {
//     console.log(`adding player ${playerName}`);
//   if ( chips >= this.minBuyIn && chips <= this.maxBuyIn) {
//     var player = new Player(playerName, chips, this);
//     this.playersToAdd.push( player );
//   }
//  if (this.players.length === 0 && this.playersToAdd.length >= this.minPlayers) {
//     this.StartGame();
//  }
// }
// EDITED
Table.prototype.AddPlayer = function (playerName, chips, seat) {
    console.log(`adding player ${playerName}`);
  if ( chips >= this.minBuyIn && chips <= this.maxBuyIn) {
    var player = new Player(playerName, chips, this);
    player.seat = seat;
    this.playersToAdd.push( player );
  }
//   EDITED
//   if ( this.players.length === 0 && this.playersToAdd.length >= this.minPlayers ){
//     this.StartGame();
//   }
};
Table.prototype.getMaxBet = function() {
    // console.log('pls', JSON.stringify(this.players));
    // console.log('plstadd', JSON.stringify(this.playersToAdd));
    return Math.max(...this.players.map(x => x.bet));
};
Table.prototype.removePlayer = function (playerName){
  for( var i in this.players ){
    if( this.players[i].playerName === playerName ){
      this.playersToRemove.push( i );
      // EDITED
      if (this.game != null) {
          this.game.pot += this.players[i].bet;
          this.players[i].Fold();
          progress(this);
      }
    }
  }
  for( var i in this.playersToAdd ){
    if( this.playersToAdd[i].playerName === playerName ){
      this.playersToAdd.splice(i, 1);
    }
  }
}
Table.prototype.NewRound = function() {
  // Add players in waiting list
    // EDITED
    // make sure its all in order (note this works bc numbers can only be between 0 and 9)
    if (this.playersToRemove.length > 0) {
        this.playersToRemove.sort();
    }
    console.log('sorted toRemove:');
    console.log(this.playersToRemove);
    // done editing
    console.log('init players', JSON.stringify(this.players));
    console.log('to add players', JSON.stringify(this.playersToAdd));
  for(let i = 0; i < this.playersToAdd.length; i++){
    // new
        let seat = this.playersToAdd[i].seat;
        if (seat < this.players.length){
            this.players.splice(seat, 0, this.playersToAdd[i]);
            for (let p = 0; p < this.playersToRemove.length; p++){
                let oldIndex = parseInt(this.playersToRemove[p]);
                if (oldIndex >= seat){
                    let newIndex = oldIndex + 1;
                    this.playersToRemove[p] = `${newIndex}`;
                }
            }
            for (let p = 0; p < this.playersToAdd.length; p++){
                let oldIndex = this.playersToAdd[p].seat;
                if (oldIndex >= seat){
                    let newIndex = oldIndex + 1;
                    this.playersToAdd[p].seat = newIndex;
                }
            }
        } else {
            this.players.push(this.playersToAdd[i]);
        }
    }
  console.log('p to add', JSON.stringify(this.players));
  // Remove players
  // EDITED
  for (let removeIndex = 0; removeIndex < this.playersToRemove.length; removeIndex++){
      let indexval = parseInt(this.playersToRemove[removeIndex]);
      this.players.splice(this.playersToRemove[removeIndex], 1);
      // iterate rest of removeIndeces and subtract one from them (since length ahs decreased by one)
      for (let q = removeIndex + 1; q < this.playersToRemove.length; q++){
          let oldIndex = parseInt(this.playersToRemove[q]);
          let newIndex = oldIndex - 1;
          this.playersToRemove[q] = `${newIndex}`;
      }
      console.log('index val:' + indexval);
      console.log(`OLD DEALER SPOT: ${this.dealer}`);
      if (indexval < this.dealer){
          this.dealer--;
          console.log('696969')
      }
      else if (indexval == this.dealer){
            let playersLength = this.players.length;
            if (indexval = playersLength){
                this.dealer--;
            } 
      } 
      console.log(`NEW DEALER SPOT: ${this.dealer}`);
  }
  //done editing
  this.playersToRemove = [];
  this.playersToAdd = [];
  this.gameWinners = [];
  this.gameLosers = [];

  // EDITED
  if (this.players.length < 2){
      console.log('not enough players :(');
      this.game = null;
      return;
  }

  let i, smallBlind, bigBlind;
  //Deal 2 cards to each player
  for (i = 0; i < this.players.length; i += 1) {
      this.players[i].cards.push(this.game.deck.pop());
      this.players[i].cards.push(this.game.deck.pop());
      this.players[i].bet = 0;
      this.game.roundBets[i] = 0;
  }
  //Identify Small and Big Blind player indexes
  smallBlind = (this.dealer + 1) % this.players.length;
  bigBlind = (this.dealer + 2) % this.players.length;
  //Force Blind Bets
    // TODO: the next lines can give players negative stacks. must check that this doesn't happen.
    //  force them all-in if their balance <= their bland.
    this.currentPlayer = smallBlind;
    this.postBlind(this.smallBlind);
    this.currentPlayer = bigBlind;
    this.postBlind(this.bigBlind);

  // get currentPlayer
  this.currentPlayer = (this.dealer + 3) % this.players.length;

  this.eventEmitter.emit( "newRound" );
};

Table.prototype.postBlind = function(blindAmount) {
    const otherPlayersMaxStack = maxSkippingIndices(this.players.map(x => x.bet + x.chips), this.currentPlayer);
    const p = this.players[this.currentPlayer];
    let betAmount = Math.min(otherPlayersMaxStack, blindAmount, p.bet + p.chips);
    betAmount = p.Bet(betAmount);
    p.talked = false;
    return betAmount;
};

Player.prototype.GetChips = function(cash) {
    this.chips += cash;
};

// Player actions: Check(), Fold(), Bet(bet), Call(), AllIn()
Player.prototype.Check = function() {
    this.applyBet(0);
    return 0;
};

Player.prototype.Fold = function() {
    this.bet = 0;
    this.talked = true;
    this.folded = true;
    return 0;
};

Player.prototype.applyBet = function(bet) {
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
Player.prototype.Bet = function(bet) {
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
Player.prototype.AllIn = function() {
    const allInValue = this.chips;
    this.applyBet(allInValue);
    return allInValue;
};

function rankHands(hands) {
    var x, myResult;

    for (x = 0; x < hands.length; x += 1) {
        myResult = rankHandInt(hands[x]);
        hands[x].rank = myResult.rank;
        hands[x].message = myResult.message;
    }

    return hands;
}

// EDITED (i made it)
Table.prototype.checkwin = function() {
    let numPlayers = 0;
    let pwinner;
    for (let i = 0; i < this.players.length; i++){
        if (!this.players[i].folded) {
            numPlayers++;
            pwinner = this.players[i];
        }
    }
    if (numPlayers === 1) {
        console.log("everyone's folded!");
        return {
            everyoneFolded: true, 
            pot: this.game.pot, 
            winner: pwinner
        };
    }
    return {
        everyoneFolded: false, 
        pot: null, 
        winner: null
    };
};

exports.Table = Table;