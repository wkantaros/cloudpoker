"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TableManager = exports.TableStateManager = void 0;

var _pokerLogic = require("./poker-logic");

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function () { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var TableStateManager = /*#__PURE__*/function () {
  /**
   *
   * @param {TableState} table
   * @param {boolean} gameInProgress
   */
  function TableStateManager(table, gameInProgress) {
    _classCallCheck(this, TableStateManager);

    this.table = table;
    this.gameInProgress = gameInProgress;
  }

  _createClass(TableStateManager, [{
    key: "playersInNextHand",
    value: function playersInNextHand() {
      return this.table.allPlayers.filter(function (elem) {
        return elem !== null && !elem.leavingGame && !elem.standingUp;
      });
    }
  }, {
    key: "getStraddleLimit",
    value: function getStraddleLimit() {
      return this.table.straddleLimit;
    }
  }, {
    key: "getRoundName",
    value: function getRoundName() {
      if (this.gameInProgress) {
        return this.table.game.roundName.toLowerCase();
      } else {
        return 'deal';
      }
    }
  }, {
    key: "getDeal",
    value: function getDeal() {
      return this.table.getDeal();
    }
  }, {
    key: "getDealerSeat",
    value: function getDealerSeat() {
      // console.log('GET DEALER');
      // console.log(this.table);
      // console.log('----------');
      if (this.gameInProgress) {
        var t = this.table;
        return t.players[t.dealer].seat;
      } else {
        return -1;
      }
    }
  }, {
    key: "getPot",
    value: function getPot() {
      return this.gameInProgress ? this.table.game.pot : 0;
    }
  }, {
    key: "checkwin",
    value: function checkwin() {
      return this.table.checkwin();
    }
  }, {
    key: "getLosers",
    value: function getLosers() {
      var losers = this.table.getLosers();
      console.log('losers!');
      console.log(losers);
      return losers;
    }
  }, {
    key: "getPlayer",
    value: function getPlayer(playerName) {
      return this.table.getPlayer(playerName);
    }
  }, {
    key: "getPlayerBySeat",
    value: function getPlayerBySeat(seat) {
      var p = this.table.allPlayers[seat];
      if (p) return p.playerName;
      return 'guest';
    }
  }, {
    key: "getPlayerSeat",
    value: function getPlayerSeat(playerName) {
      var p = this.table.getPlayer(playerName);
      if (p) return p.seat;
      return -1;
    }
  }, {
    key: "isPlayerStandingUp",
    value: function isPlayerStandingUp(playerName) {
      var p = this.table.getPlayer(playerName);
      if (p) return p.standingUp;
      return false;
    }
  }, {
    key: "getBet",
    value: function getBet(playerName) {
      if (!this.gameInProgress) return 0;
      return this.table.getPlayer(playerName).bet;
    }
  }, {
    key: "getStack",
    value: function getStack(playerName) {
      var p = this.table.getPlayer(playerName);
      if (!p) return -1;
      return p.chips;
    }
  }, {
    key: "getNameByActionSeat",
    value: function getNameByActionSeat() {
      var seat = this.actionSeat;
      if (seat === -1) return 'guest';
      return this.table.allPlayers[seat].playerName;
    }
  }, {
    key: "canPlayersRevealHand",
    value: function canPlayersRevealHand() {
      return this.gameInProgress && this.table.canPlayersRevealHands();
    }
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
      var p = this.getPlayer(playerName); // if player is at the table

      if (p) {
        if (this.gameInProgress) {
          return this.table.getAvailableActions(playerName);
        } // case where game hasnt started yet, player is mod and there are enough players
        else if (!this.gameInProgress && p.isMod && this.playersInNextHand().length >= 2) {
            console.log('game can start');
            availableActions['start'] = true;
          }
      }

      return {
        availableActions: availableActions,
        canPerformPremoves: false
      };
    }
  }, {
    key: "gameState",
    get: function get() {
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
  }, {
    key: "playerStates",
    get: function get() {
      return this.table.playerStates;
    }
  }, {
    key: "bigBlindSeat",
    get: function get() {
      return this.table.bigBlindSeat;
    }
  }, {
    key: "actionSeat",
    get: function get() {
      if (this.gameInProgress) {
        return this.table.actionSeat;
      } else {
        return -1;
      }
    }
  }, {
    key: "allIn",
    get: function get() {
      return this.table.allPlayers.map(function (p) {
        return p != null && p.inHand && p.allIn;
      });
    }
  }]);

  return TableStateManager;
}();

exports.TableStateManager = TableStateManager;

var TableManager = /*#__PURE__*/function (_TableStateManager) {
  _inherits(TableManager, _TableStateManager);

  var _super = _createSuper(TableManager);

  /**
   *
   * @param {Table} table
   * @param {string} hostName
   * @param {number} hostStack
   * @param {boolean} hostIsStraddling
   * @param {*} playerid
   */
  function TableManager(table, hostName, hostStack, hostIsStraddling, playerid) {
    var _this;

    _classCallCheck(this, TableManager);

    _this = _super.call(this, table, false);
    _this.hostName = hostName;
    _this.hostStack = hostStack;
    _this.trackBuyins = [];
    _this.playerids = {};
    table.AddPlayer(hostName, hostStack, hostIsStraddling);
    table.getPlayer(hostName).isMod = true;

    _this.addToPlayerIds(hostName, playerid);

    _this.addToBuyins(hostName, playerid, hostStack);

    _this.bigBlindNextHand = undefined;
    _this.smallBlindNextHand = undefined;
    _this.playerStacksNextHand = [];
    return _this;
  } // let(\s*)(\S*)(\s*)=(\s*)\((.*)\)(\s*)=>
  // $2($5)


  _createClass(TableManager, [{
    key: "addToPlayerIds",
    value: function addToPlayerIds(playerName, playerid) {
      this.playerids[playerName] = {
        playerid: playerid
      };
    }
  }, {
    key: "isPlayerNameUsed",
    value: function isPlayerNameUsed(playerName) {
      return Object.keys(this.playerids).includes(playerName);
    }
  }, {
    key: "addToBuyins",
    value: function addToBuyins(playerName, playerid, playerStack) {
      var obj = {
        playerName: playerName,
        playerid: playerid,
        buyin: playerStack,
        time: null,
        buyout: null
      };
      var date = new Date();
      var minutes = date.getMinutes() < 10 ? "0".concat(date.getMinutes()) : "".concat(date.getMinutes());
      var time = "".concat(date.getHours(), ":").concat(minutes);
      obj.time = time;
      var playerAlreadyInDb = false;

      for (var i = 0; i < this.trackBuyins.length; i++) {
        if (this.trackBuyins[i].playerName === playerName && this.trackBuyins[i].playerid === playerid) {
          this.trackBuyins[i].buyin = parseInt(this.trackBuyins[i].buyin) + parseInt(playerStack);
          this.trackBuyins[i].time = time;
          playerAlreadyInDb = true;
        }
      }

      if (!playerAlreadyInDb) {
        this.trackBuyins.push(obj);
      }
    }
  }, {
    key: "addBuyOut",
    value: function addBuyOut(playerName, playerid, buyOutStack) {
      var date = new Date();
      var minutes = date.getMinutes() < 10 ? "0".concat(date.getMinutes()) : "".concat(date.getMinutes());
      var time = "".concat(date.getHours(), ":").concat(minutes);

      for (var i = 0; i < this.trackBuyins.length; i++) {
        if (this.trackBuyins[i].playerName === playerName && this.trackBuyins[i].playerid === playerid) {
          if (buyOutStack === undefined) {
            buyOutStack = this.table.getPlayer(playerName).chips || this.trackBuyins[i].buyin;
          }

          if (this.trackBuyins[i].buyout != null) {
            this.trackBuyins[i].buyout = parseInt(buyOutStack) + parseInt(this.trackBuyins[i].buyout);
          } else {
            this.trackBuyins[i].buyout = buyOutStack;
          }

          this.trackBuyins[i].time = time;
        }
      }
    }
  }, {
    key: "updateBuyIn",
    value: function updateBuyIn(playerName, playerid, amountChange) {
      var date = new Date();
      var minutes = date.getMinutes() < 10 ? "0".concat(date.getMinutes()) : "".concat(date.getMinutes());
      var time = "".concat(date.getHours(), ":").concat(minutes);

      for (var i = 0; i < this.trackBuyins.length; i++) {
        if (this.trackBuyins[i].playerName === playerName && this.trackBuyins[i].playerid === playerid) {
          this.trackBuyins[i].buyin = parseInt(this.trackBuyins[i].buyin) + amountChange;
          this.trackBuyins[i].time = time;
        }
      }
    }
  }, {
    key: "getBuyinBuyouts",
    value: function getBuyinBuyouts() {
      return this.trackBuyins;
    }
  }, {
    key: "buyin",
    // adds the player to this.playerids
    // adds the player to the table
    value: function buyin(playerName, playerid, stack, isStraddling) {
      var addedPlayer = this.table.AddPlayer(playerName, stack, isStraddling);

      if (addedPlayer) {
        this.addToPlayerIds(playerName, playerid);
        this.addToBuyins(playerName, playerid, stack);
        console.log("".concat(playerName, " buys in for ").concat(stack));

        if (this.hostName === null) {
          console.log("transferring host to ".concat(playerName, " (pid: ").concat(playerid, ")"));
          this.transferHost(playerName);
          this.hostStack = stack;
        }

        return true;
      } else {
        console.log('no seats available');
        return false;
      }
    }
  }, {
    key: "setPlayerStraddling",
    value: function setPlayerStraddling(playerid, isStraddling) {
      var player = this.table.getPlayer(this.getPlayerById(playerid));

      if (player) {
        if (this.getStraddleLimit() !== 0) {
          player.isStraddling = isStraddling;
        } else {
          player.isStraddling = false;
        }
      }
    }
  }, {
    key: "standUpPlayer",
    value: function standUpPlayer(playerName) {
      return this.table.standUpPlayer(playerName);
    }
  }, {
    key: "sitDownPlayer",
    value: function sitDownPlayer(playerName) {
      return this.table.sitDownPlayer(playerName);
    }
  }, {
    key: "removePlayer",
    value: function removePlayer(playerName) {
      this.table.removePlayer(playerName);
      delete this.playerids[playerName];

      if (playerName === this.hostName) {
        // transfer host name / abilities to next player
        this.transferHost('');
      }
    }
  }, {
    key: "transferHost",
    value: function transferHost(newHostName) {
      var previousHost = this.getPlayer(this.hostName);

      if (previousHost !== null) {
        previousHost.isMod = false;
      }

      if (newHostName in this.playerids) {
        this.setHost(newHostName);
        console.log('successfully transferred host to ' + newHostName);
        return true;
      } else if (Object.keys(this.playerids).length > 0) {
        var playerName = Object.keys(this.playerids)[0];
        this.setHost(playerName);
        console.log('transferred host to ' + playerName);
        return true;
      } else {
        this.hostName = null;
        this.hostStack = null;
        console.log('no player to transfer game to :(');
      }

      return false;
    } // private method

  }, {
    key: "setHost",
    value: function setHost(playerName) {
      this.hostName = playerName;
      this.hostStack = this.getStack(playerName);
      this.table.getPlayer(playerName).isMod = true;
    }
  }, {
    key: "getPlayerId",
    value: function getPlayerId(playerName) {
      if (Object.keys(this.playerids).includes(playerName)) return this.playerids[playerName].playerid;else return undefined;
    }
  }, {
    key: "getModId",
    value: function getModId() {
      if (this.hostName != null) {
        return this.getPlayerId(this.hostName);
      } else {
        return null;
      }
    }
  }, {
    key: "isModPlayerId",
    value: function isModPlayerId(pid) {
      if (this.hostName === null) return false;
      return this.getPlayerId(this.hostName) === pid;
    }
  }, {
    key: "isActivePlayerId",
    value: function isActivePlayerId(playerid) {
      return Object.values(this.playerids).map(function (x) {
        return x.playerid;
      }).includes(playerid);
    }
  }, {
    key: "getPlayerById",
    value: function getPlayerById(pid) {
      // console.log(playerids);
      // let t = this.table;
      for (var _i = 0, _Object$keys = Object.keys(this.playerids); _i < _Object$keys.length; _i++) {
        var name = _Object$keys[_i];

        // console.log('name', name);
        if (this.playerids[name].playerid === pid) {
          return name;
        }
      }

      return 'guest';
    }
  }, {
    key: "updatePlayerId",
    value: function updatePlayerId(playerName, playerid) {
      var oldplayerid = this.playerids[playerName].playerid;

      for (var i = 0; i < this.trackBuyins.length; i++) {
        if (this.trackBuyins[i].playerName === playerName && this.trackBuyins[i].playerid === oldplayerid) {
          this.trackBuyins[i].playerid = playerid;
        }
      }

      this.playerids[playerName].playerid = playerid;
    }
  }, {
    key: "playerHandState",
    value: function playerHandState(playerName) {
      var p = this.table.getPlayer(playerName);
      if (!p) return null;
      var result = {
        cards: this.table.getHandForPlayerName(playerName),
        handRankMessage: ''
      };

      if (this.gameInProgress && p.inHand) {
        var playableCards = p.cards.concat(this.table.game.board);
        result.handRankMessage = (0, _pokerLogic.rankHandInt)(new _pokerLogic.Hand(playableCards)).message;
      }

      return result;
    }
  }, {
    key: "getAvailableSeat",
    value: function getAvailableSeat() {
      return this.table.getAvailableSeat();
    }
  }, {
    key: "playersInfo",
    // returns a list of {playerName, seat, stack, playerid, waiting, betAmount}
    // playerName -> { playerid, seat }
    value: function playersInfo() {
      var info = [];
      var waitingPlayerNames = this.table.waitingPlayers.map(function (x) {
        return x.playerName;
      });

      for (var name in this.playerids) {
        if (this.playerids.hasOwnProperty(name)) {
          var isWaiting = waitingPlayerNames.includes(name);
          info.push({
            playerName: name,
            seat: this.getPlayerSeat(name),
            stack: this.getStack(name),
            playerid: this.playerids[name].playerid,
            waiting: isWaiting,
            standingUp: this.isPlayerStandingUp(name),
            betAmount: this.getBet(name) // amount that name bet so far in this street

          });
        }
      } // console.log(info);


      return info;
    }
  }, {
    key: "startGame",
    value: function startGame() {
      this.gameInProgress = true;
      this.updateBlinds();
      this.updateQueuedStackChanges();
      this.table.StartGame();
    }
  }, {
    key: "startRound",
    value: function startRound() {
      this.updateBlinds();
      this.updateQueuedStackChanges();
      this.table.initNewRound();
      if (!this.table.game) this.gameInProgress = false;
    }
  }, {
    key: "getCardsByPlayerName",
    value: function getCardsByPlayerName(playerName) {
      return this.table.getHandForPlayerName(playerName);
    }
  }, {
    key: "callBlind",
    value: function callBlind(playerName) {
      return this.table.callBlind(playerName);
    }
  }, {
    key: "call",
    value: function call(playerName) {
      // this.table.call(this.table.getCurrentPlayer());
      // console.log(this.table);
      return this.table.call(playerName);
    }
  }, {
    key: "check",
    value: function check(playerName) {
      // return this.table.check(this.table.getCurrentPlayer());
      return this.table.check(playerName);
    }
  }, {
    key: "fold",
    value: function fold(playerName) {
      // return this.table.fold(this.table.getCurrentPlayer());
      return this.table.fold(playerName);
    }
  }, {
    key: "bet",
    value: function bet(playerName, betAmount) {
      // return this.table.bet(this.table.getCurrentPlayer(), betAmount);
      return this.table.bet(playerName, betAmount);
    } // allows user to raise to a number
    // (such that node-poker doenst have him bet that number + his previous bet)

  }, {
    key: "raise",
    value: function raise(playerName, betAmount) {
      var playersLastBet = this.getBet(playerName);
      var realBetAmount = betAmount - playersLastBet; // let addedBetSize = betAmount - getBet
      // return this.table.bet(this.table.getCurrentPlayer(), betAmount);

      console.log("player ".concat(playerName, " is betting ").concat(realBetAmount, " on top of his last bet of ").concat(playersLastBet));
      return this.bet(playerName, realBetAmount);
    }
  }, {
    key: "getWinnings",
    value: function getWinnings(prev_round) {
      console.log('calculating winnings');
      var winnings = this.table.game.pot;

      if (prev_round === 'deal') {
        //basically check if any bets are still on the table and add them to the pot (for big blind, etc)
        var _iterator = _createForOfIteratorHelper(this.table.players),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var p = _step.value;
            winnings += p.bet;
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }

      return winnings;
    }
  }, {
    key: "updateStack",
    value: function updateStack(playerName, winnings) {
      this.table.getPlayer(playerName).GetChips(winnings);
    } // different than update stack as it changes stack entirely, doesn't add on

  }, {
    key: "updateStackBuyIn",
    value: function updateStackBuyIn(playerName, stackAmount, change) {
      this.table.getPlayer(playerName).UpdateStackAmount(stackAmount);
      this.updateBuyIn(playerName, this.getPlayerId(playerName), change);
    } // Idk why this returns bigBlind if game is not in progress. I don't want to break anything.

  }, {
    key: "getInitialBets",
    // return an array of seat, bet objects
    // may lead to a bug down the line still unsure
    value: function getInitialBets() {
      return this.table.players.filter(function (p) {
        return p.bet > 0;
      }).map(function (p) {
        return {
          seat: p.seat,
          bet: p.bet
        };
      });
    }
  }, {
    key: "getWinners",
    value: function getWinners() {
      return this.table.getWinners();
    } // if thats the case, just call and move forward with game

  }, {
    key: "actionOnAllInPlayer",
    value: function actionOnAllInPlayer() {
      var actionSeat = this.actionSeat;

      if (this.allIn[actionSeat]) {
        console.log('action on all in player, moving game forward');
        this.check(this.getPlayerBySeat(actionSeat));
        return true;
      } else {
        return false;
      }
    }
  }, {
    key: "isEveryoneAllIn",
    value: function isEveryoneAllIn() {
      return this.table.isEveryoneAllIn();
    }
  }, {
    key: "hasPlayerFolded",
    value: function hasPlayerFolded(playerName) {
      return this.table.getPlayer(playerName).folded;
    }
  }, {
    key: "getPlayerIds",
    value: function getPlayerIds() {
      return Object.values(this.playerids).map(function (x) {
        return x.playerid;
      });
    }
  }, {
    key: "updateBlindsNextHand",
    value: function updateBlindsNextHand(smallBlind, bigBlind) {
      if (this.gameInProgress) {
        this.smallBlindNextHand = smallBlind;
        this.bigBlindNextHand = bigBlind;
      } else {
        this.table.bigBlind = bigBlind;
        this.table.smallBlind = smallBlind;
      }
    }
  }, {
    key: "updateBlinds",
    value: function updateBlinds() {
      if (this.smallBlindNextHand) {
        this.table.smallBlind = this.smallBlindNextHand;
        this.smallBlindNextHand = undefined;
      }

      if (this.bigBlindNextHand) {
        this.table.bigBlind = this.bigBlindNextHand;
        this.bigBlindNextHand = undefined;
      }
    }
  }, {
    key: "updateStraddleLimit",
    value: function updateStraddleLimit(straddleLimit) {
      // quit out of any current straddles
      for (var _i2 = 0, _Object$keys2 = Object.keys(this.playerids); _i2 < _Object$keys2.length; _i2++) {
        var name = _Object$keys2[_i2];
        this.setPlayerStraddling(this.playerids[name].playerid, false);
      }

      this.table.straddleLimit = straddleLimit;
    }
  }, {
    key: "queueUpdatePlayerStack",
    value: function queueUpdatePlayerStack(playerName, amount) {
      if (!this.gameInProgress) {
        var curAmount = this.getPlayer(playerName).chips || 0;
        var change = amount - curAmount;
        this.updateStackBuyIn(playerName, amount, change);
      } else {
        var obj = {
          name: playerName,
          stack: amount
        };
        this.playerStacksNextHand.push(obj);
      }
    }
  }, {
    key: "updateQueuedStackChanges",
    value: function updateQueuedStackChanges() {
      while (this.playerStacksNextHand.length > 0) {
        var playerName = this.playerStacksNextHand[0].name;
        var playerStack = this.playerStacksNextHand[0].stack;

        if (this.isActivePlayerId(this.getPlayerId(playerName))) {
          var curAmount = this.getPlayer(playerName).chips;
          var change = playerStack - curAmount;
          this.updateStackBuyIn(playerName, playerStack, change);
        } // remove element from list


        this.playerStacksNextHand.shift();
      }
    }
  }, {
    key: "maxBet",
    get: function get() {
      if (this.gameInProgress) return this.table.getMaxBet();else return this.table.bigBlind;
    }
  }]);

  return TableManager;
}(TableStateManager);

exports.TableManager = TableManager;