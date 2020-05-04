"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Hand = Hand;
exports.Table = void 0;

var _deck = require("./deck");

var _sharedjs = require("../../sharedjs");

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function () { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

//Note: methods I've changed/created have been commented: EDITED
// straddleLimit values:
// -1: unlimited straddles (last player who can straddle is the dealer)
// 0: no straddling allowed
// 1: only player after big blind can straddle
// 1 < x <= players.length - 2: x players can straddle. if x == players.length -2,
//      the same behavior as -1 occurs.
// x > players.length - 2: same behavior as -1 occurs.
var Table = /*#__PURE__*/function (_TableState) {
  _inherits(Table, _TableState);

  var _super = _createSuper(Table);

  function Table(smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn, straddleLimit) {
    _classCallCheck(this, Table);

    var allPlayers = [];

    for (var i = 0; i < maxPlayers; i++) {
      allPlayers.push(null);
    }

    return _super.call(this, smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn, straddleLimit, 0, allPlayers, -1, null);
  }

  _createClass(Table, [{
    key: "callBlind",
    value: function callBlind(playerName) {
      var currentPlayer = this.currentPlayer;
      var p = this.players[this.currentPlayer];

      if (playerName !== p.playerName) {
        console.log("wrong user has made a move");
        return -1;
      }

      console.log("".concat(playerName, " calls blind"));
      var maxBet = this.getMaxBet();
      var bigBlindIndex = (this.dealer + 2) % this.players.length;
      var isBigBlind = currentPlayer === bigBlindIndex;
      var callAmount;

      if (isBigBlind || maxBet >= this.bigBlind) {
        callAmount = Math.min(p.chips + p.bet, maxBet) - p.bet;
      } else {
        var otherPlayersMaxStack = maxSkippingIndices(this.players.map(function (x) {
          return x.bet + x.chips;
        }), currentPlayer); // bet bigBlind if following players have a stack >= bigBlind
        // bet < bigBlind if no other player has a stack >= bigBlind

        callAmount = Math.min(otherPlayersMaxStack, this.bigBlind, p.bet + p.chips) - p.bet;
      }

      p.Bet(callAmount);
      progress(this);
      return callAmount;
    }
  }, {
    key: "check",
    // Player actions: Check(), Fold(), Bet(bet), Call(), AllIn()
    value: function check(playerName) {
      var currentPlayer = this.currentPlayer; //   EDITED (primarily to deal with 'checking' to close action as bb)

      var cancheck = true;

      for (var v = 0; v < this.players.length; v++) {
        //essentially wrapping this check as a call
        if (this.game.roundName === 'deal' && this.players[v].bet === this.bigBlind && currentPlayer === v) {
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

      if (playerName === this.players[currentPlayer].playerName) {
        console.log('here!');

        if (cancheck) {
          console.log("".concat(playerName, " checks"));
          this.players[currentPlayer].Check();
          progress(this); // progress(this);

          return true;
        } else {
          console.log("".concat(playerName, " unable to check"));
          return false;
        }
      } else {
        // todo: check if something went wrong ( not enough money or things )
        console.log("wrong user has made a move abcd");
        return false;
      }
    }
  }, {
    key: "fold",
    value: function fold(playerName) {
      var p = this.players[this.currentPlayer];

      if (playerName === p.playerName) {
        this.game.pot += p.bet;
        p.Fold();
        progress(this);
        console.log("".concat(playerName, " folds"));
        return true;
      } else {
        console.log("wrong user has made a move");
        return false;
      }
    }
  }, {
    key: "call",
    value: function call(playerName) {
      var p = this.players[this.currentPlayer];

      if (playerName === p.playerName) {
        var maxBet = this.getMaxBet();
        console.log("".concat(playerName, " calls"));

        if (p.chips + p.bet > maxBet) {
          console.log("".concat(playerName, " calls")); // treat call as bet

          var betAmount = p.Bet(maxBet - p.bet);
          progress(this);
          return betAmount;
        } else {
          console.log("".concat(playerName, " doesn't have enough to call, going all in."));

          var _betAmount = p.AllIn();

          progress(this);
          return _betAmount;
        }
      } else {
        console.log("wrong user has made a move");
        return -1;
      }
    }
  }, {
    key: "bet",

    /**
     * @param playerName Player betting
     * @param amt Amount to bet (on top of current bet)
     * @return {number|*} Actual amount bet. 0 < y <= amt if player goes all in. y =-1 if amt < 0 or it is not user's turn.
     */
    value: function bet(playerName, amt) {
      if (amt < 0) {
        console.log("".concat(playerName, " tried to bet ").concat(amt));
        return -1;
      }

      if (playerName !== this.players[this.currentPlayer].playerName) {
        console.log("wrong user has made a move");
        return -1;
      }

      console.log("".concat(playerName, " bet ").concat(amt));
      var betAmount = this.players[this.currentPlayer].Bet(amt);
      progress(this);
      return betAmount;
    }
  }, {
    key: "initNewRound",
    // getAllHands(){
    //     var all = this.losers.concat( this.players );
    //     var allHands = [];
    //     for( var i in all ){
    //         allHands.push({
    //             playerName: all[i].playerName,
    //             chips: all[i].chips,
    //             hand: all[i].cards,
    //         });
    //     }
    //     return allHands;
    // };
    value: function initNewRound() {
      this.removeAndAddPlayers();

      if (this.players.length < 2) {
        console.log('not enough players (initNewRound)');
        this.dealer = 0;
        this.currentPlayer = -1;
        this.game = null;
        return;
      }

      this.dealer = (this.dealer + 1) % this.players.length;
      this.game.pot = 0;
      this.game.roundName = 'deal'; //Start the first round

      this.game.betName = 'bet'; //bet,raise,re-raise,cap

      this.game.deck.splice(0, this.game.deck.length);
      this.game.board.splice(0, this.game.board.length);

      for (var i = 0; i < this.players.length; i += 1) {
        if (this.players[i].standingUp) {
          console.log('MASSIVE ERROR PLAYER IS STANDING UP', this.players[i]);
        }

        this.players[i].inHand = true;
        this.players[i].clearHandState();
      }

      (0, _deck.fillDeck)(this.game.deck);
      this.game.winners = [];
      this.game.losers = []; //Deal 2 cards to each player

      for (var _i = 0; _i < this.players.length; _i += 1) {
        this.players[_i].cards.push(this.game.deck.pop());

        this.players[_i].cards.push(this.game.deck.pop());

        this.players[_i].bet = 0;
        this.game.roundBets[_i] = 0;
      }

      this.initializeBlinds(); // this.eventEmitter.emit( "newRound" );
    }
  }, {
    key: "canStartGame",
    value: function canStartGame() {
      // return this.playersToAdd && this.playersToAdd.length >= 2 && this.playersToAdd.length <= 10;
      // console.log(this.playersToAdd);
      // return (!this.game && this.players.length >= 2 && this.players.length <= 10);
      return true;
    }
  }, {
    key: "StartGame",
    value: function StartGame() {
      //If there is no current game and we have enough players, start a new game.
      if (!this.game) {
        this.game = new Game(this.smallBlind, this.bigBlind);
        this.initNewRound();
      }
    }
  }, {
    key: "standUpPlayer",
    value: function standUpPlayer(playerName) {
      var p = this.allPlayers.find(function (p) {
        return p !== null && p.playerName === playerName;
      });
      if (!p) return false;
      p.standingUp = true;

      if (this.game !== null) {
        this.game.pot += p.bet;
        p.Fold();
        progress(this);
      }

      return true;
    }
  }, {
    key: "sitDownPlayer",
    value: function sitDownPlayer(playerName) {
      var p = this.allPlayers.find(function (p) {
        return p !== null && p.playerName === playerName;
      });
      if (!p) return false;
      p.standingUp = false;
      return true;
    }
  }, {
    key: "AddPlayer",
    value: function AddPlayer(playerName, chips, isStraddling) {
      // console.log(`adding player ${playerName}`);
      // Check if playerName already exists
      var ind = this.allPlayers.findIndex(function (p) {
        return p !== null && p.playerName === playerName;
      });

      if (ind !== -1) {
        var p = this.allPlayers[ind];

        if (p.leavingGame) {
          p.leavingGame = false;
          p.chips = chips;
          p.isStraddling = isStraddling;
          return true;
        }
      } else {
        var seat = this.getAvailableSeat();

        if (chips >= this.minBuyIn && chips <= this.maxBuyIn && seat !== -1) {
          var player = new _sharedjs.Player(playerName, chips, isStraddling, seat, false);
          this.allPlayers[seat] = player;
          return true;
        }
      }

      return false;
    }
  }, {
    key: "removePlayer",
    value: function removePlayer(playerName) {
      var ind = this.allPlayers.findIndex(function (p) {
        return p !== null && p.playerName === playerName;
      });
      if (ind === -1) return false; // this.playersToRemove.push(ind);

      var p = this.allPlayers[ind];
      this.allPlayers[p.seat].leavingGame = true;

      if (this.game != null) {
        this.game.pot += p.bet; // this.allPlayers[ind] = null;

        p.Fold();
        progress(this);
      }

      return true;
    }
  }, {
    key: "removeAndAddPlayers",
    value: function removeAndAddPlayers() {
      var playersToRemove = this.leavingPlayers; // TODO: possible edge case if player clicks stand up before the game starts because inHand would be false.
      //   to circumvent this, send all standing up players to the front end, not just an update with players
      //   that are newly standing up.

      var playersToStandUp = this.allPlayers.filter(function (p) {
        return p !== null && !p.leavingGame && p.inHand && p.standingUp;
      });
      var playersToAdd = this.waitingPlayers;

      var _iterator = _createForOfIteratorHelper(playersToRemove),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var p = _step.value;
          if (p.seat <= this.dealer) this.dealer--;
          this.allPlayers[p.seat] = null;
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      var _iterator2 = _createForOfIteratorHelper(playersToStandUp),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var _p = _step2.value;
          if (_p.seat <= this.dealer) this.dealer--;
          _p.inHand = false;

          _p.clearHandState(); // this will not be called in initNewRound because p.inHand is false

        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      var _iterator3 = _createForOfIteratorHelper(playersToAdd),
          _step3;

      try {
        for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
          var _p2 = _step3.value;
          if (_p2.seat <= this.dealer) this.dealer++;
          _p2.inHand = true;
        }
      } catch (err) {
        _iterator3.e(err);
      } finally {
        _iterator3.f();
      }

      if (this.players.length >= 2) {
        this.dealer = this.dealer % this.players.length;
      } else {
        this.dealer = 0;
      }
    }
  }, {
    key: "initializeBlinds",
    value: function initializeBlinds() {
      // Small and Big Blind player indexes
      var smallBlind = (this.dealer + 1) % this.players.length;
      var bigBlind = (this.dealer + 2) % this.players.length; // Force Blind Bets

      this.currentPlayer = smallBlind;
      this.postBlind(this.smallBlind);
      this.currentPlayer = bigBlind;
      this.postBlind(this.bigBlind);
      var maxStraddles = this.maxStraddles();

      for (var i = 0; i < maxStraddles; i++) {
        var nextPlayer = (this.currentPlayer + 1) % this.players.length;

        if (!this.players[nextPlayer].isStraddling) {
          break;
        }

        var straddleAmount = this.bigBlind * Math.pow(2, i + 1); // bigBlind * 2^(i+1)

        if (this.players[nextPlayer].chips < straddleAmount) {
          console.log("".concat(this.players[nextPlayer], " does not have enough to straddle"));
          break;
        }

        this.currentPlayer = nextPlayer;
        this.postBlind(straddleAmount);
      }

      this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    }
  }, {
    key: "postBlind",
    value: function postBlind(blindAmount) {
      var otherPlayersMaxStack = maxSkippingIndices(this.players.map(function (x) {
        return x.bet + x.chips;
      }), this.currentPlayer);
      var p = this.players[this.currentPlayer];
      var betAmount = Math.min(otherPlayersMaxStack, blindAmount, p.bet + p.chips);
      betAmount = p.Bet(betAmount);
      p.talked = false;
      return betAmount;
    }
  }]);

  return Table;
}(_sharedjs.TableState); // returns true if the next street should be dealt or the round is over.
// does not return false if <= 1 player folded. use checkwin for that.


exports.Table = Table;

function checkForEndOfRound(table) {
  var endOfRound = true;
  var maxBet = table.getMaxBet(); //For each player, check
  // EDITED

  var counter = 1;
  var j = table.currentPlayer;

  while (counter <= table.players.length) {
    var p = table.players[j];

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
  var winners = [];
  var maxRank = 0.000;

  for (var k = 0; k < table.players.length; k += 1) {
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
} // Calculates side pot value if any players went all in.
// If no player went all in, returns the value of the main pot.


function getSidePotBet(table, winners) {
  var part = 0;
  var allInPlayer = winners.filter(function (wi) {
    return table.players[wi].allIn;
  });

  if (allInPlayer.length > 0) {
    var minBets = table.game.roundBets[winners[0]];

    for (var j = 1; j < allInPlayer.length; j += 1) {
      if (table.game.roundBets[winners[j]] !== 0 && table.game.roundBets[winners[j]] < minBets) {
        minBets = table.game.roundBets[winners[j]];
      }
    }

    part = parseInt(minBets, 10);
  } else {
    // do not think that parseInt is necessary, but do not want to break anything by removing this line.
    part = parseInt(table.game.roundBets[winners[0]], 10);
  }

  return part;
}

function getSidePotPrize(table, part) {
  var prize = 0;

  for (var l = 0; l < table.game.roundBets.length; l += 1) {
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
  var winners = identifyWinners(table);
  var part = getSidePotBet(table, winners);
  var prize = getSidePotPrize(table, part);
  var winnerPrize = prize / winners.length; // TODO: make the next pot start with extraChips, not 0.
  // const extraChips = prize - (winnerPrize * winners.length);

  for (var i = 0; i < winners.length; i += 1) {
    var winningPlayer = table.players[winners[i]];
    winningPlayer.chips += winnerPrize;

    if (table.game.roundBets[winners[i]] === 0) {
      winningPlayer.folded = true;
      table.game.winners.push({
        playerName: winningPlayer.playerName,
        amount: winnerPrize,
        hand: winningPlayer.hand,
        chips: winningPlayer.chips,
        seat: winningPlayer.seat
      });
    }

    console.log('player ' + table.players[winners[i]].playerName + ' wins !!');
  }

  var roundEnd = table.game.roundBets.filter(function (rb) {
    return rb !== 0;
  }).length === 0;

  if (roundEnd === false) {
    checkForWinner(table);
  }
}

function checkForBankrupt(table) {
  var i;

  for (i = 0; i < table.players.length; i += 1) {
    if (table.players[i].chips === 0) {
      table.game.losers.push(table.players[i]);
      console.log('player ' + table.players[i].playerName + ' is going bankrupt'); // EDIT
      // rather than removing players here i thin it makes sense to call remove player on it
      // table.players.splice(i, 1);
    }
  }
}

function Hand(cards) {
  this.cards = cards;
}

function progress(table) {
  // table.eventEmitter.emit( "turn" );
  var i, j, cards, hand;

  if (table.game) {
    if (checkForEndOfRound(table) === true) {
      table.currentPlayer = (table.dealer + 1) % table.players.length;
      var ctr = 0;

      while (table.players[table.currentPlayer].folded && ctr < table.players.length) {
        console.log('here 123:O'); // basically we want to skip all of the folded players if they're folded when going to next round (currently sets to 0)

        table.currentPlayer = (table.currentPlayer + 1) % table.players.length;
        ctr++;
      }

      if (ctr >= table.players.length) {
        console.log('giant massive error here please come back and check on logic this is a mess');
      } // ^^done with edits
      //Move all bets to the pot


      for (i = 0; i < table.players.length; i++) {
        table.game.pot += table.players[i].bet;
        table.game.roundBets[i] += table.players[i].bet;
      }

      if (table.game.roundName === 'River') {
        table.game.roundName = 'Showdown'; //Evaluate each hand

        for (j = 0; j < table.players.length; j += 1) {
          cards = table.players[j].cards.concat(table.game.board);
          hand = new Hand(cards);
          table.players[j].hand = (0, _deck.rankHand)(hand);
        }

        checkForWinner(table);
        checkForBankrupt(table); // table.eventEmitter.emit( "gameOver" );
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
} // count is the amount of cards to turn.for flop, should be 3. for turn and river, 1.


function turnCards(table, count) {
  table.game.deck.pop(); //Burn a card

  for (var i = 0; i < count; i += 1) {
    //Turn a card <count> times
    table.game.board.push(table.game.deck.pop());
  }

  for (var _i2 = 0; _i2 < table.players.length; _i2 += 1) {
    table.players[_i2].talked = false;
    table.players[_i2].bet = 0;
  } // table.eventEmitter.emit( "deal" );

}

var Game = /*#__PURE__*/function (_GameState) {
  _inherits(Game, _GameState);

  var _super2 = _createSuper(Game);

  function Game(smallBlind, bigBlind) {
    var _this;

    _classCallCheck(this, Game);

    _this = _super2.call(this, smallBlind, bigBlind);
    _this.deck = [];
    (0, _deck.fillDeck)(_this.deck);
    return _this;
  }

  return Game;
}(_sharedjs.GameState);
/*
 * Helper Methods Public
 */


function maxSkippingIndices(arr) {
  var m = Number.NEGATIVE_INFINITY;

  for (var _len = arguments.length, ind = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    ind[_key - 1] = arguments[_key];
  }

  for (var i = 0; i < arr.length; i++) {
    if (ind.includes(i)) continue;
    m = Math.max(m, arr[i]);
  }

  return m;
}

function rankHands(hands) {
  var x, myResult;

  for (x = 0; x < hands.length; x += 1) {
    myResult = (0, _deck.rankHandInt)(hands[x]);
    hands[x].rank = myResult.rank;
    hands[x].message = myResult.message;
  }

  return hands;
}