"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GameState = exports.Player = exports.TableState = void 0;

var _pokerLogic = require("../poker-logic");

function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var TableState = /*#__PURE__*/function () {
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
  function TableState(smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn, straddleLimit, dealer, allPlayers, currentPlayer, game) {
    _classCallCheck(this, TableState);

    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.minPlayers = minPlayers;
    this.maxPlayers = maxPlayers; // allPlayers[i].seat === i. empty seats correspond to a null element.

    this.allPlayers = allPlayers;
    this.dealer = dealer; //Track the dealer position between games

    this.currentPlayer = currentPlayer; // Initialized to 1 in initializeBlinds (called by startGame)

    this.minBuyIn = minBuyIn;
    this.maxBuyIn = maxBuyIn;
    this.straddleLimit = straddleLimit;
    this.game = game; //Validate acceptable value ranges.

    var err;

    if (minPlayers < 2) {
      //require at least two players to start a game.
      err = new Error(101, 'Parameter [minPlayers] must be a postive integer of a minimum value of 2.');
    } else if (maxPlayers > 10) {
      //hard limit of 10 players at a table.
      err = new Error(102, 'Parameter [maxPlayers] must be a positive integer less than or equal to 10.');
    } else if (minPlayers > maxPlayers) {
      //Without this we can never start a game!
      err = new Error(103, 'Parameter [minPlayers] must be less than or equal to [maxPlayers].');
    }

    if (err) {
      return err;
    }
  }

  _createClass(TableState, [{
    key: "getPublicInfo",
    value: function getPublicInfo() {
      return {
        smallBlind: this.smallBlind,
        bigBlind: this.bigBlind,
        allPlayers: this.playerStates,
        dealer: this.dealer,
        currentPlayer: this.currentPlayer,
        minBuyIn: this.minBuyIn,
        maxBuyIn: this.maxBuyIn,
        straddleLimit: this.straddleLimit,
        game: this.game ? this.game.getPublicInfo() : null
      };
    }
  }, {
    key: "playerPublicInfo",
    value: function playerPublicInfo(p) {
      var info = p.getPublicInfo();
      info.handRankMessage = p.cards.length > 0 ? (0, _pokerLogic.rankHandInt)(new _pokerLogic.Hand(p.cards.concat(this.game.board))).message : '';
      info.isDealer = this.game !== null && this.players[this.dealer] && this.players[this.dealer].playerName === p.seat;
      info.isActionSeat = this.game !== null && this.players[this.currentPlayer] && this.actionSeat === p.seat;
      info.earnings = 0;
      return info;
    }
  }, {
    key: "getWinners",
    value: function getWinners() {
      return this.game.winners;
    }
  }, {
    key: "getLosers",
    value: function getLosers() {
      return this.game.losers;
    }
  }, {
    key: "getHandForPlayerName",
    value: function getHandForPlayerName(playerName) {
      var p = this.getPlayer(playerName);
      if (p !== null) return p.cards || [];
      return [];
    }
  }, {
    key: "getPlayer",

    /**
     * @return {Player|null}
     */
    value: function getPlayer(playerName) {
      return this.allPlayers.find(function (elem) {
        return elem !== null && elem.playerName === playerName;
      }) || null;
    }
  }, {
    key: "getDeal",
    value: function getDeal() {
      return this.game.board;
    }
  }, {
    key: "getCurrentPlayer",
    value: function getCurrentPlayer() {
      return this.players[this.currentPlayer].playerName;
    }
  }, {
    key: "canPlayerRaise",
    value: function canPlayerRaise(playerName) {
      var p = this.getPlayer(playerName);

      if (p === null || !p.inHand || p.folded) {
        return false;
      }

      return p.bet + p.chips > this.getMaxBet() && !this.isEveryoneAllIn();
    }
  }, {
    key: "isEveryoneAllIn",
    value: function isEveryoneAllIn() {
      var playersIn = this.players.filter(function (p) {
        return !p.folded;
      });
      var playersWhoCanAct = playersIn.filter(function (p) {
        return !p.allIn;
      });
      return playersIn.length >= 2 && playersWhoCanAct.length <= 1;
    } // Precondition: A game is in progress.

  }, {
    key: "canPlayersRevealHands",
    value: function canPlayersRevealHands() {
      return this.game.roundName.toLowerCase() === 'showdown' || this.players.filter(function (p) {
        return !p.folded;
      }).length <= 1;
    } // Precondition: A game is in progress.

  }, {
    key: "getAvailableActions",
    value: function getAvailableActions(playerName) {
      var availableActions = {
        'min-bet': false,
        'bet': false,
        'raise': false,
        'fold': false,
        'call': false,
        'start': false,
        'check': false,
        'your-action': false,
        'show-hand': false
      };
      var canPerformPremoves = false;
      var p = this.getPlayer(playerName);
      availableActions['show-hand'] = p !== null && !p.showingCards && p.inHand && this.canPlayersRevealHands(); // no action can be performed if players can show hands because betting is over

      if (availableActions['show-hand'] || p === null || !p.inHand || p.showingCards) {
        return {
          availableActions: availableActions,
          canPerformPremoves: canPerformPremoves
        };
      } // if (p === null || !p.inHand || p.folded || this.canPlayersRevealHands())
      //     return {availableActions, canPerformPremoves};
      // cases where it's the player's action


      if (this.players[this.currentPlayer].playerName === playerName) {
        availableActions['fold'] = true;
        availableActions['your-action'] = true; // TODO: this.getMaxBet() === this.bigBlind will be false if it's heads up
        //   and one player went all in with < this.bigBlind
        // player is in big blind

        if (this.actionSeat === this.bigBlindSeat && this.getMaxBet() === this.bigBlind && this.game.roundName.toLowerCase() === 'deal') {
          availableActions['check'] = true;
          availableActions['raise'] = this.canPlayerRaise(playerName);
        } // bet on table
        else if (this.getMaxBet() > 0) {
            availableActions['call'] = true;
            console.log(p);
            console.log(this.getMaxBet());
            availableActions['raise'] = this.canPlayerRaise(playerName);
          } // no bets yet
          else {
              availableActions['check'] = true;
              availableActions['bet'] = true;
              availableActions['min-bet'] = true;
            }
      } // cases where its not the players action
      else if (!p.folded && !p.allIn) {
          canPerformPremoves = true;
        }

      return {
        availableActions: availableActions,
        canPerformPremoves: canPerformPremoves
      };
    }
  }, {
    key: "minimumBetAllowed",
    value: function minimumBetAllowed(playerName) {
      var player = this.getPlayer(playerName);
      if (player === null) return 0;

      if (player.bet + player.chips >= this.bigBlind) {
        // min should be < bb if (1) a player’s stack > bb but all players in the hand have a stack < bb
        return Math.min(this.otherPlayersMaxStack(playerName), this.bigBlind);
      } // (2) a player’s stack < bb


      return Math.min(player.bet + player.chips, this.otherPlayersMaxStack(playerName));
    }
  }, {
    key: "otherPlayersMaxStack",
    value: function otherPlayersMaxStack(playerName) {
      return Math.max.apply(Math, _toConsumableArray(this.players.filter(function (p) {
        return p.playerName !== playerName && !p.folded;
      }).map(function (x) {
        return x.bet + x.chips;
      })));
    }
    /**
     * Calculates the maximum that a player can bet (total) as limited
     * by his going all in or making everyone else at the table go all in
     * if he has the biggest stack
     */

  }, {
    key: "maxBetPossible",
    value: function maxBetPossible(playerName) {
      var player = this.getPlayer(playerName);
      if (player === null) return 0;
      return Math.min(player.bet + player.chips, this.otherPlayersMaxStack(playerName));
    }
  }, {
    key: "maxStraddles",
    // straddleLimit values:
    // -1: unlimited straddles (last player who can straddle is the dealer)
    // 0: no straddling allowed
    // 1: only player after big blind can straddle
    // 1 < x <= players.length - 2: x players can straddle. if x == players.length -2,
    //      the same behavior as -1 occurs.
    // x > players.length - 2: same behavior as -1 occurs.
    // Up to this.players.length -2 players can straddle because
    //      the last player that is able to is the dealer
    value: function maxStraddles() {
      if (this.players.length <= 2) return 0;

      if (this.straddleLimit >= 0 && this.straddleLimit <= this.players.length - 2) {
        return this.straddleLimit;
      }

      if (this.straddleLimit === -1 || this.straddleLimit > this.players.length - 2) {
        return this.players.length - 2;
      } // straddleLimit < -1


      console.log("Invalid straddleLimit value ".concat(this.straddleLimit));
      return 0;
    }
  }, {
    key: "getAvailableSeat",
    value: function getAvailableSeat() {
      return this.allPlayers.findIndex(function (elem) {
        return elem === null || elem.leavingGame;
      });
    }
  }, {
    key: "getMaxBet",
    value: function getMaxBet() {
      return Math.max.apply(Math, _toConsumableArray(this.players.map(function (x) {
        return x.bet;
      })));
    }
  }, {
    key: "checkwin",
    value: function checkwin() {
      var unfoldedPlayers = this.players.filter(function (p) {
        return !p.folded;
      });

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
    }
  }, {
    key: "playerStates",
    get: function get() {
      var _this = this;

      var states = this.allPlayers.map(function (p) {
        return p === null ? null : _this.playerPublicInfo(p);
      });

      if (this.game) {
        var _iterator = _createForOfIteratorHelper(this.game.winners),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var winnerInfo = _step.value;
            states[winnerInfo.seat].earnings = winnerInfo.amount;
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }

      return states;
    }
  }, {
    key: "players",
    get: function get() {
      return this.allPlayers.filter(function (p) {
        return p !== null && p.inHand;
      });
    }
  }, {
    key: "waitingPlayers",
    get: function get() {
      return this.allPlayers.filter(function (p) {
        return p !== null && p.isWaiting;
      });
    }
  }, {
    key: "leavingPlayers",
    get: function get() {
      return this.allPlayers.filter(function (p) {
        return p !== null && p.leavingGame;
      });
    }
  }, {
    key: "actionSeat",
    get: function get() {
      return this.players[this.currentPlayer].seat;
    }
  }, {
    key: "bigBlindSeat",
    get: function get() {
      return this.players[(this.dealer + 2) % this.players.length].seat;
    }
  }]);

  return TableState;
}();

exports.TableState = TableState;

var Player = /*#__PURE__*/function () {
  /**
   * Constructs a Player object for use with Table.
   * @param playerName Name of the player as it should appear on the front end
   * @param chips The player's initial chip stack
   * @param isStraddling If the player wants to straddle
   * @constructor
   */
  function Player(playerName, chips, isStraddling, seat, isMod) {
    _classCallCheck(this, Player);

    this.playerName = playerName;
    this.chips = chips;
    this.folded = false;
    this.allIn = false;
    this.talked = false; // If the player is in the current hand. False is they just joined and are waiting for the next hand.

    this.inHand = false; // If the player is standing up from the table

    this.standingUp = false;
    this.cards = [];
    this.bet = 0;
    this.isStraddling = isStraddling;
    this.seat = seat;
    this.leavingGame = false; // below fields used only externally

    this.isMod = isMod;
    this.showingCards = false;
  }

  _createClass(Player, [{
    key: "showHand",
    value: function showHand() {
      this.showingCards = true;
    } // Clear data from the previous hand.

  }, {
    key: "clearHandState",
    value: function clearHandState() {
      this.bet = 0;
      this.folded = false;
      this.talked = false;
      this.allIn = false;
      this.cards.splice(0, this.cards.length);
      this.showingCards = false;
    }
  }, {
    key: "getPublicInfo",
    value: function getPublicInfo() {
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
        cards: this.showingCards ? this.cards : [],
        showingCards: this.showingCards
      };
    }
  }, {
    key: "GetChips",
    value: function GetChips(cash) {
      this.chips += cash;
    }
  }, {
    key: "UpdateStackAmount",
    // changes stack to new amount
    value: function UpdateStackAmount(cash) {
      if (!isNaN(cash) || cash <= 0) {
        this.chips = cash;
      }
    } // Player actions: Check(), Fold(), Bet(bet), Call(), AllIn()

  }, {
    key: "Check",
    value: function Check() {
      this.applyBet(0);
      return 0;
    }
  }, {
    key: "Fold",
    value: function Fold() {
      this.bet = 0;
      this.talked = true;
      this.folded = true;
      return 0;
    }
  }, {
    key: "applyBet",
    value: function applyBet(bet) {
      this.chips -= bet;
      this.bet += bet;
      this.talked = true;

      if (this.chips === 0) {
        this.allIn = true;
      }
    }
  }, {
    key: "Bet",
    // Returns amount bet. If this.chips < (parameter) bet, return value will be this.chips.

    /**
     * @param bet Amount to bet
     * @return {number|*} Amount actually bet.
     *          bet if player has enough chips. this.chips if player must go all in. -1 if bet is invalid (< 0).
     */
    value: function Bet(bet) {
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
    }
  }, {
    key: "AllIn",

    /**
     * @return {number} Amount bet
     */
    value: function AllIn() {
      var allInValue = this.chips;
      this.applyBet(allInValue);
      return allInValue;
    }
  }, {
    key: "isWaiting",
    get: function get() {
      return !this.inHand && !this.leavingGame && !this.standingUp;
    }
  }]);

  return Player;
}();

exports.Player = Player;

var GameState = /*#__PURE__*/function () {
  function GameState(smallBlind, bigBlind) {
    _classCallCheck(this, GameState);

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

  _createClass(GameState, [{
    key: "getPublicInfo",
    value: function getPublicInfo() {
      // everything except for this.deck
      return {
        smallBlind: this.smallBlind,
        bigBlind: this.bigBlind,
        pot: this.pot,
        roundName: this.roundName,
        roundBets: this.roundBets,
        board: this.board,
        winners: this.winners,
        losers: this.losers
      };
    }
  }]);

  return GameState;
}();

exports.GameState = GameState;