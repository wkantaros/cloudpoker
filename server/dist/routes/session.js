"use strict";

var _serverLogic = require("../server-logic");

var _persistent = require("../persistent");

var _funcs = require("../funcs");

var poker = _interopRequireWildcard(require("../poker-logic/lib/node-poker"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function () { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var router = require('express').Router();

var cookieParser = require('cookie-parser');

var xss = require("xss");

router.use('/:id', cookieParser(process.env.COOKIE_SECRET));

var path = require('path');

var Joi = require('@hapi/joi');

var shortid = require('shortid');

// import (.*) from (\S*);
// const $1 = require($2);
//
// const {TableManager} = require('../server-logic');
// const {playerIdFromRequest, newPlayerId, setPlayerIdCookie, TwoWayMap} = require('../persistent');
// const {asyncErrorHandler, sleep, asyncSchemaValidator} = require('../funcs');
// const poker = require('../../poker-logic/lib/node-poker');
// Information host submits for game (name, stack, bb, sb)
router.route('/').post((0, _funcs.asyncErrorHandler)( /*#__PURE__*/function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(req, res) {
    var schema, _schema$validate, error, value, message, sid;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            //scheme to ensure valid username
            schema = Joi.object({
              // username: Joi.string().alphanum().min(2).max(10)
              username: Joi.string().regex(/^\w+(?:\s+\w+)*$/).min(2).max(10),
              smallBlind: Joi.number().integer().min(0),
              bigBlind: Joi.number().integer().min(1),
              stack: Joi.number().integer().min(1),
              straddleLimit: Joi.number().integer().min(-1)
            });

            if (process.env.DEBUG === 'true') {
              req.body.name = req.body.name || 'debugName';
            }

            _schema$validate = schema.validate({
              username: req.body.name,
              smallBlind: req.body.smallBlind,
              bigBlind: req.body.bigBlind,
              stack: req.body.stack,
              straddleLimit: req.body.straddleLimit
            }), error = _schema$validate.error, value = _schema$validate.value;

            if (error) {
              res.status(422);
              message = error.details[0].message;
              console.log(message);

              if (message.includes("fails to match the required pattern: /^\\w+(?:\\s+\\w+)*$/")) {
                message = "\"username\" cannot have punctuation";
              }

              res.json({
                isValid: false,
                message: message
              });
            } else {
              sid = shortid.generate();
              req.body.shortid = sid;
              req.body.isValid = true;
              res.json(req.body);
              console.log("starting new table with id: ".concat(sid));
              sessionManagers.set(sid, new SessionManager(null, sid, req.body.smallBlind, req.body.bigBlind, req.body.name, req.body.stack, false, req.body.straddleLimit, 6969));
            }

          case 4:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}())); // maps sid -> SessionManager
// TODO: delete sid from sessionManagers when table finishes

var sessionManagers = new Map(); // hacky fix

var socket_ids = {};

var SessionManager = /*#__PURE__*/function (_TableManager) {
  _inherits(SessionManager, _TableManager);

  var _super = _createSuper(SessionManager);

  function SessionManager(io, sid, smallBlind, bigBlind, hostName, hostStack, hostIsStraddling, straddleLimit, playerid) {
    var _this;

    _classCallCheck(this, SessionManager);

    var table = new poker.Table(smallBlind, bigBlind, 2, 10, 1, 500000000000, straddleLimit);
    _this = _super.call(this, table, hostName, hostStack, hostIsStraddling, playerid);
    _this.io = io;
    _this.sid = sid;
    _this.socketMap = new _persistent.TwoWayMap(); // maps player id -> playerName when kicked

    _this.kickedPlayers = {};
    _this.timerDelay = -1;
    _this.timer = null;
    return _this;
  }

  _createClass(SessionManager, [{
    key: "setSocketId",
    value: function setSocketId(playerId, socketId) {
      this.socketMap.set(playerId, socketId);
    }
  }, {
    key: "getSocketId",
    value: function getSocketId(playerId) {
      // return tableSocketMap.get(this.sid).key(playerId);
      return this.socketMap.key(playerId);
    }
  }, {
    key: "canPlayerJoin",
    value: function canPlayerJoin(playerId, playerName, stack, isStraddling) {
      if (_get(_getPrototypeOf(SessionManager.prototype), "isPlayerNameUsed", this).call(this, playerName)) {
        this.io.sockets.to(this.getSocketId(playerId)).emit('alert', {
          'message': "Player name ".concat(playerName, " is already taken.")
        });
        return false;
      }

      return true;
    }
  }, {
    key: "emitAction",
    value: function emitAction(action, playerName, betAmount) {
      this.sendTableState();
      this.io.sockets.to(this.sid).emit(action, {
        username: playerName,
        stack: this.getStack(playerName),
        pot: this.getPot(),
        seat: this.getPlayerSeat(playerName),
        amount: betAmount
      }); // update client's stack size
      // this.io.sockets.to(this.sid).emit('update-stack', {
      //     seat: this.getPlayerSeat(playerName),
      //     stack: this.getStack(playerName)
      // });
    }
  }, {
    key: "sendTableState",
    value: function sendTableState() {
      // let data = {
      //     table: this.table.getPublicInfo(),
      //     gameInProgress: this.gameInProgress,
      // };
      // this.io.sockets.to(this.sid).emit('state-snapshot', data);
      // send each active player
      var _iterator = _createForOfIteratorHelper(this.table.allPlayers),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var p = _step.value;
          if (!p) continue;
          this.sendTableStateTo(this.getSocketId(this.getPlayerId(p.playerName)), p.playerName);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    } // sends playerName a snapshot that includes their private data (cards)

  }, {
    key: "sendTableStateTo",
    value: function sendTableStateTo(socketId, playerName) {
      var table = this.table.getPublicInfo();
      var p = this.table.getPlayer(playerName);

      if (p) {
        table = Object.assign({}, table); // shallow copy

        table.allPlayers = Array.from(table.allPlayers); // shallow copy

        table.allPlayers[p.seat] = p;
      }

      this.io.sockets.to(socketId).emit('state-snapshot', {
        table: table,
        gameInProgress: this.gameInProgress,
        player: p
      });
    }
  }, {
    key: "addPlayer",
    value: function addPlayer(playerName) {
      this.sendTableState();
      var socketId = this.getSocketId(this.getPlayerId(playerName));
      var newPlayer = this.table.getPlayer(playerName);
      if (newPlayer.isMod) this.io.sockets.to(socketId).emit('add-mod-abilities');
      this.io.sockets.to(this.sid).emit('buy-in', {
        playerName: playerName,
        stack: newPlayer.chips
      }); // this.io.sockets.to(this.sid).emit('render-players', this.playersInfo());

      this.renderActionSeatAndPlayerActions();
    }
  }, {
    key: "kickPlayer",
    value: function () {
      var _kickPlayer = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(playerId) {
        var playerName;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                // this.kickedPlayers[playerId] = super.getPlayerById(playerId);
                // MAY BE AN ERROR HERE CHECK AGAIN
                playerName = this.getPlayerById(playerId);
                _context2.next = 3;
                return this.performAction(playerName, 'fold', 0);

              case 3:
                _context2.next = 5;
                return this.playerLeaves(playerId);

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function kickPlayer(_x3) {
        return _kickPlayer.apply(this, arguments);
      }

      return kickPlayer;
    }()
  }, {
    key: "standUpPlayer",
    value: function () {
      var _standUpPlayer = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(playerName) {
        var prev_round;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (!this.isPlayerStandingUp(playerName)) {
                  _context3.next = 2;
                  break;
                }

                return _context3.abrupt("return");

              case 2:
                if (this.gameInProgress && this.getPlayer(playerName).inHand && !this.hasPlayerFolded(playerName)) {
                  this.emitAction('fold', playerName, 0);
                }

                prev_round = _get(_getPrototypeOf(SessionManager.prototype), "getRoundName", this).call(this);

                _get(_getPrototypeOf(SessionManager.prototype), "standUpPlayer", this).call(this, playerName); // check if round has ended


                _context3.next = 7;
                return this.check_round(prev_round);

              case 7:
                this.sendTableState();
                this.renderActionSeatAndPlayerActions(); // this.io.sockets.to(this.sid).emit('render-players', this.playersInfo());

                this.io.sockets.to(this.sid).emit('stand-up', {
                  playerName: playerName,
                  seat: this.getPlayerSeat(playerName)
                });

              case 10:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function standUpPlayer(_x4) {
        return _standUpPlayer.apply(this, arguments);
      }

      return standUpPlayer;
    }()
  }, {
    key: "sitDownPlayer",
    value: function sitDownPlayer(playerName) {
      if (!this.isPlayerStandingUp(playerName)) return;

      _get(_getPrototypeOf(SessionManager.prototype), "sitDownPlayer", this).call(this, playerName);

      this.sendTableState(); // this.io.sockets.to(this.sid).emit('render-players', this.playersInfo());

      this.io.sockets.to(this.sid).emit('sit-down', {
        playerName: playerName,
        seat: this.getPlayerSeat(playerName)
      });
      this.renderActionSeatAndPlayerActions(); // if <= 1 player is sitting down, host can now start game.
    } // horrible name. call playerLeaves. handlePlayerExit is basically a private method

  }, {
    key: "playerLeaves",
    value: function () {
      var _playerLeaves = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(playerId) {
        var playerName, stack, prev_round, actionSeatPlayerId;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                playerName = _get(_getPrototypeOf(SessionManager.prototype), "getPlayerById", this).call(this, playerId);

                if (!(!this.gameInProgress || !this.getPlayer(playerName).inHand)) {
                  _context4.next = 7;
                  break;
                }

                this.handlePlayerExit(playerName); // highlight cards of player in action seat and get available buttons for players

                this.renderActionSeatAndPlayerActions();
                console.log('waiting for more players to rejoin');
                _context4.next = 21;
                break;

              case 7:
                stack = _get(_getPrototypeOf(SessionManager.prototype), "getStack", this).call(this, playerName);
                prev_round = _get(_getPrototypeOf(SessionManager.prototype), "getRoundName", this).call(this);
                console.log("".concat(playerName, " leaves game for ").concat(stack)); // fold player
                // note: dont actually fold him (just emit folding noise)
                //super.fold(playerName);

                this.emitAction('fold', playerName, 0); // shift action to next player in hand

                if (_get(_getPrototypeOf(SessionManager.prototype), "actionOnAllInPlayer", this).call(this)) {
                  console.log('ACTION ON ALL IN PLAYER 123');
                } else {
                  // highlight cards of player in action seat and get available buttons for players
                  this.renderActionSeatAndPlayerActions();
                }

                this.handlePlayerExit(playerName);
                _context4.next = 15;
                return (0, _funcs.sleep)(250);

              case 15:
                _context4.next = 17;
                return this.check_round(prev_round);

              case 17:
                _context4.next = 19;
                return (0, _funcs.sleep)(250);

              case 19:
                // notify player its their action with sound
                actionSeatPlayerId = _get(_getPrototypeOf(SessionManager.prototype), "getPlayerId", this).call(this, _get(_getPrototypeOf(SessionManager.prototype), "getNameByActionSeat", this).call(this));

                if (actionSeatPlayerId) {
                  this.io.sockets.to(this.getSocketId(actionSeatPlayerId)).emit('players-action-sound', {});
                }

              case 21:
                this.sendTableState();

              case 22:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function playerLeaves(_x5) {
        return _playerLeaves.apply(this, arguments);
      }

      return playerLeaves;
    }() // private method
    // removes players not in the current hand

  }, {
    key: "handlePlayerExit",
    value: function handlePlayerExit(playerName) {
      var playerId = _get(_getPrototypeOf(SessionManager.prototype), "getPlayerId", this).call(this, playerName);

      var modLeavingGame = playerId === _get(_getPrototypeOf(SessionManager.prototype), "getModId", this).call(this);

      var seat = _get(_getPrototypeOf(SessionManager.prototype), "getPlayerSeat", this).call(this, playerName);

      console.log("".concat(playerName, " leaves game"));
      var stack = this.getStack(playerName);

      _get(_getPrototypeOf(SessionManager.prototype), "addBuyOut", this).call(this, playerName, playerId, stack);

      _get(_getPrototypeOf(SessionManager.prototype), "removePlayer", this).call(this, playerName);

      this.sendTableState();

      if (modLeavingGame) {
        if (_get(_getPrototypeOf(SessionManager.prototype), "getModId", this).call(this) != null) {
          this.io.sockets.to(this.getSocketId(_get(_getPrototypeOf(SessionManager.prototype), "getModId", this).call(this))).emit('add-mod-abilities');
        }
      }

      this.io.sockets.to(this.getSocketId(playerId)).emit('bust', {
        removeModAbilities: modLeavingGame
      });
      this.io.sockets.to(this.sid).emit('remove-out-players', {
        seat: seat
      });

      if (this.gameInProgress) {
        this.io.sockets.to(this.sid).emit('buy-out', {
          playerName: playerName,
          stack: stack,
          seat: seat
        });
      }
    }
  }, {
    key: "allInRace",
    value: function allInRace() {
      console.log("EVERYONE ALL IN BEFORE SHOWDOWN, TABLE THEM"); // TODO: a player doesn't have to show their cards if they were not the last person to raise

      var playersShowingCards = this.table.players.filter(function (p) {
        return p.allIn || !p.folded || p.showingCards;
      });

      var _iterator2 = _createForOfIteratorHelper(playersShowingCards),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var p = _step2.value;
          p.showHand();
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      this.renderActionSeatAndPlayerActions(); // TODO: sendTableState should include hand rank messages

      this.sendTableState(); // show players' cards
      // let prevRound = super.getRoundName();
      // let handRanks = {};
      // handRanks[prevRound] = playersShowingCards.map(p => {
      //     return {seat: p.seat, handRankMessage: this.playerHandState(p.playerName).handRankMessage};
      // });
      // TODO: this shows hand rank message from next round but card from next round has not turned over yet (but
      //  will when render-all-in is sent
      // this.io.sockets.to(this.sid).emit('turn-cards-all-in', playersShowingCards.map(p=>{
      //     return {seat: p.seat, cards: super.getCardsByPlayerName(p.playerName), handRankMessage: this.playerHandState(p.playerName).handRankMessage};
      // }));

      this.io.sockets.to(this.sid).emit('update-pot', {
        amount: _get(_getPrototypeOf(SessionManager.prototype), "getPot", this).call(this)
      });

      while (_get(_getPrototypeOf(SessionManager.prototype), "getRoundName", this).call(this) !== 'showdown') {
        _get(_getPrototypeOf(SessionManager.prototype), "call", this).call(this, _get(_getPrototypeOf(SessionManager.prototype), "getNameByActionSeat", this).call(this)); // if (super.getRoundName() !== prevRound) {
        //     prevRound = super.getRoundName();
        //     handRanks[prevRound] = playersShowingCards.map(p => {
        //         return {seat: p.seat, handRankMessage: this.playerHandState(p.playerName).handRankMessage};
        //     });
        // }

      }

      this.sendTableState(); // this.io.sockets.to(this.sid).emit('render-all-in', {
      //     street: super.getRoundName(),
      //     board: super.getDeal(),
      //     sound: true,
      //     handRanks: handRanks,
      // });
    }
  }, {
    key: "handleEveryoneFolded",
    value: function () {
      var _handleEveryoneFolded = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(prev_round, data) {
        var winnings;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                // TODO: ANYONE CAN REVEAL HAND HERE
                this.renderActionSeatAndPlayerActions();
                console.log(prev_round); // POTENTIALLY SEE IF prev_round can be replaced with super.getRoundName

                winnings = _get(_getPrototypeOf(SessionManager.prototype), "getWinnings", this).call(this, prev_round); // console.log(data.winner);

                console.log("".concat(data.winner.playerName, " won a pot of ").concat(winnings)); // TODO: the below is extremely hacky and a horrible solution. find a better way to send
                //  earnings to the client when everyone folded, ideally by having Table itself (in node-poker)
                //  edit game.winners as it does in checkForWinner in other situations.

                this.table.game.winners.push({
                  playerName: data.winner.playerName,
                  amount: data.pot,
                  hand: data.winner.hand,
                  chips: data.winner.chips,
                  seat: data.winner.seat
                });
                this.sendTableState(); // tell clients who won the pot

                this.io.sockets.to(this.sid).emit('folds-through', {
                  username: data.winner.playerName,
                  amount: winnings,
                  seat: _get(_getPrototypeOf(SessionManager.prototype), "getPlayerSeat", this).call(this, data.winner.playerName)
                });
                _context5.next = 9;
                return (0, _funcs.sleep)(3000);

              case 9:
                // update client's stack size
                this.io.sockets.to(this.sid).emit('update-stack', {
                  seat: _get(_getPrototypeOf(SessionManager.prototype), "getPlayerSeat", this).call(this, data.winner.playerName),
                  stack: data.winner.chips + winnings
                }); // update stack on the server

                console.log("Player has ".concat(_get(_getPrototypeOf(SessionManager.prototype), "getStack", this).call(this, data.winner.playerName)));
                console.log('Updating player\'s stack on the server...');

                _get(_getPrototypeOf(SessionManager.prototype), "updateStack", this).call(this, data.winner.playerName, winnings);

                console.log("Player now has ".concat(_get(_getPrototypeOf(SessionManager.prototype), "getStack", this).call(this, data.winner.playerName))); // next round

                this.startNextRoundOrWaitingForPlayers();

              case 15:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function handleEveryoneFolded(_x6, _x7) {
        return _handleEveryoneFolded.apply(this, arguments);
      }

      return handleEveryoneFolded;
    }() //checks if round has ended (reveals next card)

  }, {
    key: "check_round",
    value: function () {
      var _check_round = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(prev_round) {
        var data, winners, losers, i, time;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                data = _get(_getPrototypeOf(SessionManager.prototype), "checkwin", this).call(this);
                this.sendTableState(); // SHOWDOWN CASE

                if (!(_get(_getPrototypeOf(SessionManager.prototype), "getRoundName", this).call(this) === 'showdown')) {
                  _context6.next = 16;
                  break;
                }

                // TODO: ANYONE CAN REVEAL HAND HERE
                this.renderActionSeatAndPlayerActions(); // this.io.sockets.to(this.sid).emit('update-pot', {amount: super.getPot()});

                winners = this.getWinners();
                console.log('winners');
                console.log('LOSERS');
                losers = _get(_getPrototypeOf(SessionManager.prototype), "getLosers", this).call(this);
                this.io.sockets.to(this.sid).emit('showdown', winners);
                _context6.next = 11;
                return (0, _funcs.sleep)(3000);

              case 11:
                // handle losers
                for (i = 0; i < losers.length; i++) {
                  this.handlePlayerExit(losers[i].playerName);
                }

                this.sendTableState(); // for (let i = 0; i < winners.length; i++){
                //     // update client's stack size
                //     this.io.sockets.to(this.sid).emit('update-stack', {
                //         seat: super.getPlayerSeat(winners[i].playerName),
                //         stack: super.getStack(winners[i].playerName)
                //     });
                // }
                // start new round

                this.startNextRoundOrWaitingForPlayers();
                _context6.next = 32;
                break;

              case 16:
                if (!(_get(_getPrototypeOf(SessionManager.prototype), "isEveryoneAllIn", this).call(this) && prev_round !== _get(_getPrototypeOf(SessionManager.prototype), "getRoundName", this).call(this))) {
                  _context6.next = 26;
                  break;
                }

                // TODO: ANYONE CAN REVEAL HAND HERE
                time = 500;

                if (_get(_getPrototypeOf(SessionManager.prototype), "getRoundName", this).call(this) === 'flop') {
                  time = 4500;
                } else if (_get(_getPrototypeOf(SessionManager.prototype), "getRoundName", this).call(this) === 'turn') {
                  time = 3000;
                }

                this.allInRace();
                _context6.next = 22;
                return (0, _funcs.sleep)(time);

              case 22:
                _context6.next = 24;
                return this.check_round('showdown');

              case 24:
                _context6.next = 32;
                break;

              case 26:
                if (!data.everyoneFolded) {
                  _context6.next = 31;
                  break;
                }

                _context6.next = 29;
                return this.handleEveryoneFolded(prev_round, data);

              case 29:
                _context6.next = 32;
                break;

              case 31:
                if (prev_round !== _get(_getPrototypeOf(SessionManager.prototype), "getRoundName", this).call(this)) {
                  this.io.sockets.to(this.sid).emit('update-pot', {
                    amount: _get(_getPrototypeOf(SessionManager.prototype), "getPot", this).call(this)
                  });
                  this.updateAfterCardTurn(false);
                }

              case 32:
                this.sendTableState();

              case 33:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function check_round(_x8) {
        return _check_round.apply(this, arguments);
      }

      return check_round;
    }() // updates the board and hand rank messages after turning a card.
    // if allInRace is true, sends each hand rank message to this.sid.
    // if allInRace is false, sends each hand rank message to the respective player.

  }, {
    key: "updateAfterCardTurn",
    value: function updateAfterCardTurn(allInRace) {
      this.io.sockets.to(this.sid).emit('render-board', {
        street: _get(_getPrototypeOf(SessionManager.prototype), "getRoundName", this).call(this),
        board: _get(_getPrototypeOf(SessionManager.prototype), "getDeal", this).call(this),
        sound: true
      }); // TODO: don't think we need to send update-rank is we call this.sendTableState

      for (var i = 0; i < this.table.players.length; i++) {
        var p = this.table.players[i];
        var socketId = allInRace ? this.sid : this.getSocketId(this.getPlayerId(p.playerName));
        this.io.sockets.to(socketId).emit('update-rank', {
          seat: _get(_getPrototypeOf(SessionManager.prototype), "getPlayerSeat", this).call(this, p.playerName),
          handRankMessage: this.playerHandState(p.playerName).handRankMessage
        });
      }
    }
  }, {
    key: "resetAfterRound",
    value: function resetAfterRound() {
      this.sendTableState(); // this.io.sockets.to(this.sid).emit('remove-out-players', {});

      this.io.sockets.to(this.sid).emit('render-board', {
        street: 'deal',
        sound: this.gameInProgress
      }); // this.io.sockets.to(this.sid).emit('new-dealer', {seat: super.getDealerSeat()});

      this.io.sockets.to(this.sid).emit('update-pot', {
        amount: 0
      }); // this.io.sockets.to(this.sid).emit('clear-earnings', {});
    }
  }, {
    key: "startNextRoundOrWaitingForPlayers",
    value: function startNextRoundOrWaitingForPlayers() {
      // start new round
      _get(_getPrototypeOf(SessionManager.prototype), "startRound", this).call(this);

      if (this.gameInProgress) {
        this.begin_round();
      } else {
        this.resetAfterRound();
        this.io.sockets.to(this.sid).emit('render-action-buttons', _get(_getPrototypeOf(SessionManager.prototype), "getAvailableActions", this).call(this));
        console.log('waiting for more players to rejoin!');
      }
    }
  }, {
    key: "begin_round",
    value: function begin_round() {
      this.io.sockets.to(this.sid).emit('update-header-blinds', {
        bigBlind: this.table.bigBlind,
        smallBlind: this.table.smallBlind
      }); // this.io.sockets.to(this.sid).emit('nobody-waiting', {});

      this.resetAfterRound(); // let data = super.playersInfo();
      // for (let i = 0; i < data.length; i++) {
      //     let name = data[i].playerName;
      //     if (this.getPlayer(name).inHand) {
      //         this.io.sockets.to(this.getSocketId(`${data[i].playerid}`)).emit('render-hand', {
      //             cards: super.getCardsByPlayerName(name),
      //             seat: data[i].seat,
      //             folded: false,
      //             handRankMessage: this.playerHandState(name).handRankMessage,
      //         });
      //     }
      //     // else {
      //     //     this.io.sockets.to(this.sid).emit()
      //     // }
      //     this.io.sockets.to(this.sid).emit('update-stack', {
      //         seat: data[i].seat,
      //         stack: data[i].stack
      //     });
      //
      // }
      // highlight cards of player in action seat and get available buttons for players

      this.renderActionSeatAndPlayerActions(); // abstracting this to be able to work with bomb pots/straddles down the line

      this.io.sockets.to(this.getSocketId(_get(_getPrototypeOf(SessionManager.prototype), "getPlayerId", this).call(this, _get(_getPrototypeOf(SessionManager.prototype), "getNameByActionSeat", this).call(this)))).emit('players-action-sound', {});
    }
  }, {
    key: "renderActionSeatAndPlayerActions",
    value: function renderActionSeatAndPlayerActions() {
      // get available actions for player to act
      // TODO: allow players to premove
      for (var playerName in this.playerids) {
        if (this.playerids.hasOwnProperty(playerName)) {
          this.io.sockets.to(this.getSocketId(this.playerids[playerName].playerid)).emit('render-action-buttons', _get(_getPrototypeOf(SessionManager.prototype), "getAvailableActions", this).call(this, playerName));
        }
      }
    }
  }, {
    key: "performAction",
    value: function () {
      var _performAction = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(playerName, action, amount) {
        var prev_round, actualBetAmount, canPerformAction, everyoneFolded;
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                prev_round = this.getRoundName();
                actualBetAmount = this.performActionHelper(playerName, action, amount);
                canPerformAction = actualBetAmount >= 0;

                if (!canPerformAction) {
                  _context7.next = 16;
                  break;
                }

                this.refreshTimer();
                this.emitAction(action, playerName, actualBetAmount); // shift action to next player in hand

                if (this.actionOnAllInPlayer()) {
                  console.log('ACTION ON ALL IN PLAYER');
                } // highlight cards of player in action seat and get available buttons for players


                everyoneFolded = this.checkwin().everyoneFolded;
                _context7.next = 10;
                return this.check_round(prev_round);

              case 10:
                _context7.next = 12;
                return (0, _funcs.sleep)(250);

              case 12:
                // check if round has ended
                if (!everyoneFolded) this.renderActionSeatAndPlayerActions();
                _context7.next = 15;
                return (0, _funcs.sleep)(250);

              case 15:
                // notify player its their action with sound
                if (!everyoneFolded) this.io.sockets.to(this.getSocketId("".concat(this.getPlayerId(this.getNameByActionSeat())))).emit('players-action-sound', {});

              case 16:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function performAction(_x9, _x10, _x11) {
        return _performAction.apply(this, arguments);
      }

      return performAction;
    }()
    /**
     * @param {string} playerName
     * @param {string} action Player's action
     * @param {number} amount Player's action amount. Ignored if action === 'call', 'check', or 'fold'
     * @return {number} Amount bet. -1 if action cannot be performed
     */

  }, {
    key: "performActionHelper",
    value: function performActionHelper(playerName, action, amount) {
      if (amount < 0) {
        return -1;
      }

      var actualBetAmount = 0;

      if (action === 'bet') {
        actualBetAmount = _get(_getPrototypeOf(SessionManager.prototype), "bet", this).call(this, playerName, amount);
      } else if (action === 'raise') {
        actualBetAmount = _get(_getPrototypeOf(SessionManager.prototype), "raise", this).call(this, playerName, amount);
      } else if (action === 'call') {
        if (_get(_getPrototypeOf(SessionManager.prototype), "getRoundName", this).call(this) === 'deal') {
          actualBetAmount = _get(_getPrototypeOf(SessionManager.prototype), "callBlind", this).call(this, playerName);
        } else {
          actualBetAmount = _get(_getPrototypeOf(SessionManager.prototype), "call", this).call(this, playerName);
        }
      } else if (action === 'fold') {
        actualBetAmount = 0;

        _get(_getPrototypeOf(SessionManager.prototype), "fold", this).call(this, playerName);
      } else if (action === 'check') {
        var canPerformAction = _get(_getPrototypeOf(SessionManager.prototype), "check", this).call(this, playerName);

        if (canPerformAction) {
          actualBetAmount = 0;
        }
      }

      return actualBetAmount;
    }
  }, {
    key: "setTimer",
    value: function setTimer(delay) {
      // If a timer is not yet set, initialize one.
      var prevTimer = this.timer;

      if (prevTimer) {
        clearTimeout(prevTimer); // cancel previous timer, if it exists
      }

      if (delay > 0) {
        this.initializeTimer(delay);
      } else if (prevTimer) {
        // turn off the turn timer
        this.timer = null;
        this.timerDelay = -1;
      }

      this.io.sockets.to(this.sid).emit('render-timer', {
        seat: this.actionSeat,
        time: delay
      });
    }
  }, {
    key: "initializeTimer",
    value: function initializeTimer(delay) {
      this.timer = setTimeout(delay, this.expirePlayerTurn);
      this.timerDelay = delay;
    }
  }, {
    key: "refreshTimer",
    value: function refreshTimer() {
      if (this.timer) this.timer.refresh();
    }
  }, {
    key: "expirePlayerTurn",
    value: function () {
      var _expirePlayerTurn = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8() {
        var playerName, availableActions, action;
        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                playerName = _get(_getPrototypeOf(SessionManager.prototype), "getPlayerBySeat", this).call(this, _get(_getPrototypeOf(SessionManager.prototype), "actionSeat", this));
                availableActions = _get(_getPrototypeOf(SessionManager.prototype), "getAvailableActions", this).call(this, playerName).availableActions;
                action = availableActions['check'] ? 'check' : 'fold';
                _context8.next = 5;
                return this.performAction(playerName, action, 0);

              case 5:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));

      function expirePlayerTurn() {
        return _expirePlayerTurn.apply(this, arguments);
      }

      return expirePlayerTurn;
    }()
  }, {
    key: "canSendMessage",
    value: function canSendMessage(playerId, message) {
      return message.length > 0;
    }
  }]);

  return SessionManager;
}(_serverLogic.TableManager);

router.route('/:id').get((0, _funcs.asyncErrorHandler)(function (req, res) {
  var sid = req.params.id;
  var s = sessionManagers.get(sid);

  if (!s) {
    res.redirect('/');
    return;
  }

  var io = req.app.get('socketio');
  s.io = io;
  var playerId = (0, _persistent.playerIdFromRequest)(req);
  console.log('playerIdFromRequest', playerId, 'is active', s.isActivePlayerId(playerId)); // isActivePlayerId is false if the player previously quit the game

  var isNewPlayer = playerId === undefined || !s.isActivePlayerId(playerId);
  console.log('inp', isNewPlayer);

  if (isNewPlayer) {
    // Create new player ID and set it as a cookie in user's browser
    playerId = (0, _persistent.newPlayerId)();
    (0, _persistent.setPlayerIdCookie)(playerId, req, res);
  }

  res.render('pages/game', {
    bigBlind: s.table.bigBlind,
    smallBlind: s.table.smallBlind,
    rank: 'A',
    suit: 'S',
    action: false,
    actionSeat: s.actionSeat,
    dealer: s.getDealerSeat(),
    color: 'black',
    showCards: false,
    joinedGame: s.isActivePlayerId(playerId),
    waiting: !s.gameInProgress,
    pot: s.getPot(),
    roundName: s.getRoundName(),
    callAmount: s.maxBet,
    standingUp: s.isActivePlayerId(playerId) && s.isPlayerStandingUp(s.getPlayerById(playerId)) // todo soon

  }); // hacky

  var socket_id = [];
  io.once('connection', /*#__PURE__*/function () {
    var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee12(socket) {
      var chatSchema, isActivePlayerIdValidator, isModValidator, playerName, buyInSchema, straddleSwitchSchema, kickPlayerSchema, setTurnTimerSchema, actionSchema, updateBlindsSchema, updateStraddleSchema, transferHostSchema, updatePlayerStackSchema;
      return regeneratorRuntime.wrap(function _callee12$(_context12) {
        while (1) {
          switch (_context12.prev = _context12.next) {
            case 0:
              console.log('socket id!:', socket.id, 'player id', playerId);

              if (!socket_ids[socket.id]) {
                socket_id.push(socket.id); // rm connection listener for any subsequent connections with the same ID

                if (socket_id[0] === socket.id) {
                  io.removeAllListeners('connection');
                }

                console.log('a user connected at', socket.id); // added this because of duplicate sockets being sent with (when using ngrok, not sure why)

                socket_ids[socket_id[0]] = true;
                s.setSocketId(playerId, socket.id);
                socket.on('disconnect', function (reason) {
                  console.log('pid', playerId, 'socket ID', socket.id, 'disconnect reason', reason);
                  io.sockets.to(sid).emit('player-disconnect', {
                    playerName: s.getPlayerById(playerId)
                  }); // io.removeAllListeners('connection');
                }); // make sure host has a socketid associate with name (player who sent in login form)

                if (s.getModId() != null && s.getModId() === 6969) {
                  s.updatePlayerId(s.getPlayerById(s.getModId()), playerId);
                  console.log('updating hostname playerid to:', playerId);
                }

                console.log('a user connected at', socket.id, 'with player ID', playerId); //adds socket to room (actually a sick feature)

                socket.join(sid);

                if (s.getModId(sid) != null) {
                  io.sockets.to(s.getSocketId(s.getModId())).emit('add-mod-abilities');
                } // io.sockets.to(sid).emit('render-players', s.playersInfo());
                // highlight cards of player in action seat and get available buttons for players


                s.renderActionSeatAndPlayerActions();
                chatSchema = Joi.object({
                  message: Joi.string().trim().min(1).external(xss).required()
                }); // chatroom features
                // send a message in the chatroom

                socket.on('chat', (0, _funcs.asyncSchemaValidator)(chatSchema, function (data) {
                  io.sockets.to(sid).emit('chat', {
                    handle: s.getPlayerById(playerId),
                    message: data.message
                  });
                })); // typing

                socket.on('typing', function () {
                  socket.broadcast.to(sid).emit('typing', s.getPlayerById(playerId));
                });
                s.sendTableStateTo(socket.id, s.getPlayerById(playerId));

                if (s.gameInProgress) {
                  io.sockets.to(s.getSocketId(playerId)).emit('sync-board', {
                    logIn: !isNewPlayer,
                    // only log in if player is returning (not new). otherwise, player is a guest.
                    street: s.getRoundName(),
                    board: s.getDeal(),
                    sound: false
                  });
                }

                isActivePlayerIdValidator = function isActivePlayerIdValidator(value) {
                  if (!s.isActivePlayerId(playerId)) throw new Error('inactive player id');
                  return value;
                };

                isModValidator = function isModValidator(value) {
                  if (!s.isModPlayerId(playerId)) throw new Error('not a mod player id');
                  return value;
                };

                if (!isNewPlayer && s.gameInProgress) {
                  // TODO: get returning player in sync with hand.
                  //  render his cards, etc.
                  console.log("syncing ".concat(s.getPlayerById(playerId)));
                  io.sockets.to(sid).emit('player-reconnect', {
                    playerName: s.getPlayerById(playerId)
                  }); // render player's hand

                  playerName = s.getPlayerById(playerId);

                  if (s.getPlayer(playerName).inHand) {
                    io.sockets.to(s.getSocketId(playerId)).emit('render-hand', {
                      cards: s.getCardsByPlayerName(playerName),
                      seat: s.getPlayerSeat(playerName),
                      folded: s.hasPlayerFolded(playerName),
                      handRankMessage: s.playerHandState(playerName).handRankMessage
                    }); // highlight cards of player in action seat and get available buttons for players

                    s.renderActionSeatAndPlayerActions(); // Play sound for action seat player

                    if (s.getPlayerId(s.getNameByActionSeat()) === playerId) {
                      io.sockets.to(s.getSocketId(playerId)).emit('players-action-sound', {});
                    }
                  }
                }

                buyInSchema = Joi.object({
                  playerName: Joi.string().trim().min(2).external(xss).required(),
                  stack: Joi.number().min(0).required(),
                  isStraddling: Joi["boolean"]()
                });
                socket.on('buy-in', (0, _funcs.asyncSchemaValidator)(buyInSchema, function (data) {
                  if (!s.canPlayerJoin(playerId, data.playerName, data.stack, data.isStraddling === true)) {
                    return;
                  }

                  var addedPlayer = s.buyin(data.playerName, playerId, data.stack, data.isStraddling === true);

                  if (addedPlayer) {
                    s.addPlayer(data.playerName);
                  } else {
                    console.log('buyin returned false for data:', JSON.stringify(data));
                  }

                  s.sendTableState();
                }));
                straddleSwitchSchema = Joi.object({
                  isStraddling: Joi["boolean"]().required()
                }).external(isActivePlayerIdValidator);
                socket.on('straddle-switch', (0, _funcs.asyncSchemaValidator)(straddleSwitchSchema, function (data) {
                  s.setPlayerStraddling(playerId, data.isStraddling);
                  s.sendTableState();
                }));
                kickPlayerSchema = Joi.object({
                  seat: Joi.number().integer().min(0).required()
                }).external(isModValidator);
                socket.on('kick-player', (0, _funcs.asyncSchemaValidator)(kickPlayerSchema, /*#__PURE__*/function () {
                  var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee9(data) {
                    var playerName;
                    return regeneratorRuntime.wrap(function _callee9$(_context9) {
                      while (1) {
                        switch (_context9.prev = _context9.next) {
                          case 0:
                            playerName = s.getPlayerBySeat(data.seat);
                            console.log('kicking player', playerName);
                            _context9.next = 4;
                            return s.kickPlayer(s.getPlayerId(playerName));

                          case 4:
                          case "end":
                            return _context9.stop();
                        }
                      }
                    }, _callee9);
                  }));

                  return function (_x13) {
                    return _ref3.apply(this, arguments);
                  };
                }()));
                socket.on('leave-game', /*#__PURE__*/function () {
                  var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee10(data) {
                    return regeneratorRuntime.wrap(function _callee10$(_context10) {
                      while (1) {
                        switch (_context10.prev = _context10.next) {
                          case 0:
                            if (s.isActivePlayerId(playerId)) {
                              _context10.next = 3;
                              break;
                            }

                            console.log("playerid ".concat(playerId, " emitted leave-game but is not an active player"));
                            return _context10.abrupt("return");

                          case 3:
                            _context10.next = 5;
                            return s.playerLeaves(playerId);

                          case 5:
                          case "end":
                            return _context10.stop();
                        }
                      }
                    }, _callee10);
                  }));

                  return function (_x14) {
                    return _ref4.apply(this, arguments);
                  };
                }());
                socket.on('stand-up', function () {
                  if (!s.isActivePlayerId(playerId)) {
                    console.log("playerid ".concat(playerId, " emitted stand-up but is not an active player"));
                    return;
                  }

                  s.standUpPlayer(s.getPlayerById(playerId));
                });
                socket.on('sit-down', function () {
                  if (!s.isActivePlayerId(playerId)) {
                    console.log("playerid ".concat(playerId, " emitted sit-down but is not an active player"));
                    return;
                  }

                  s.sitDownPlayer(s.getPlayerById(playerId));
                });
                setTurnTimerSchema = Joi.object({
                  delay: Joi.number().integer().required()
                }).external(isModValidator);
                socket.on('set-turn-timer', (0, _funcs.asyncSchemaValidator)(setTurnTimerSchema, function (data) {
                  // delay
                  s.setTimer(data.delay);
                }));
                socket.on('start-game', function (data) {
                  if (!s.isModPlayerId(playerId)) {
                    console.log("".concat(s.getPlayerById(playerId), " cannot start the game because they are not a mod."));
                    return;
                  }

                  var playersInNextHand = s.playersInNextHand().length;
                  console.log("players in next hand: ".concat(playersInNextHand));

                  if (playersInNextHand >= 2 && playersInNextHand <= 10) {
                    s.startGame();
                    s.begin_round();
                    s.sendTableState();
                    io.sockets.to(sid).emit('start-game');
                  } else {
                    console.log("waiting on players");
                  }
                });
                socket.on('show-hand', function () {
                  if (!s.isActivePlayerId(playerId)) {
                    console.log("playerid ".concat(playerId, " emitted show-hand but is not an active player"));
                    return;
                  }

                  var playerName = s.getPlayerById(playerId);
                  var p = s.getPlayer(playerName);

                  if (!p || !p.inHand || !s.canPlayersRevealHand()) {
                    return;
                  }

                  p.showHand();
                  io.sockets.to(sid).emit('render-hand', {
                    cards: s.getCardsByPlayerName(playerName),
                    seat: s.getPlayerSeat(playerName),
                    folded: s.hasPlayerFolded(playerName),
                    handRankMessage: s.playerHandState(playerName).handRankMessage
                  });
                });
                socket.on('get-buyin-info', function () {
                  io.sockets.to(sid).emit('get-buyin-info', s.getBuyinBuyouts());
                });
                actionSchema = Joi.object({
                  action: Joi.string().min(1).required(),
                  amount: Joi.number()
                }).external(isActivePlayerIdValidator);
                socket.on('action', (0, _funcs.asyncSchemaValidator)(actionSchema, /*#__PURE__*/function () {
                  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee11(data) {
                    var playerName;
                    return regeneratorRuntime.wrap(function _callee11$(_context11) {
                      while (1) {
                        switch (_context11.prev = _context11.next) {
                          case 0:
                            // console.log(`data:\n${JSON.stringify(data)}`);
                            playerName = s.getPlayerById(playerId);

                            if (s.gameInProgress) {
                              _context11.next = 5;
                              break;
                            }

                            console.log('game hasn\'t started yet');
                            _context11.next = 12;
                            break;

                          case 5:
                            if (!(s.actionSeat === s.getPlayerSeat(playerName))) {
                              _context11.next = 11;
                              break;
                            }

                            console.log('action data', JSON.stringify(data));
                            _context11.next = 9;
                            return s.performAction(playerName, data.action, data.amount);

                          case 9:
                            _context11.next = 12;
                            break;

                          case 11:
                            console.log("not ".concat(playerName, "'s action"));

                          case 12:
                          case "end":
                            return _context11.stop();
                        }
                      }
                    }, _callee11);
                  }));

                  return function (_x15) {
                    return _ref5.apply(this, arguments);
                  };
                }()));
                updateBlindsSchema = Joi.object({
                  smallBlind: Joi.number().min(0).required(),
                  bigBlind: Joi.number().min(0).required()
                }).external(isModValidator);
                socket.on('update-blinds-next-round', (0, _funcs.asyncSchemaValidator)(updateBlindsSchema, function (data) {
                  if (data && data.smallBlind && data.bigBlind) {
                    if (data.smallBlind <= data.bigBlind) {
                      console.log('updating blinds next hand');
                      s.updateBlindsNextHand(data.smallBlind, data.bigBlind); // if game isnt in progress change blinds in header immediately

                      if (!s.gameInProgress) {
                        io.sockets.to(sid).emit('update-header-blinds', {
                          bigBlind: s.table.bigBlind,
                          smallBlind: s.table.smallBlind
                        });
                      }

                      s.sendTableState();
                    } else {
                      console.log('big blind must be greater than small blind');
                    }
                  }
                }));
                updateStraddleSchema = Joi.object({
                  straddleLimit: Joi.number().required()
                }).external(isModValidator);
                socket.on('update-straddle-next-round', (0, _funcs.asyncSchemaValidator)(updateStraddleSchema, function (data) {
                  console.log('setting straddle limit to ', data.straddleLimit);
                  s.updateStraddleLimit(data.straddleLimit);
                  s.sendTableState();
                }));
                transferHostSchema = Joi.object({
                  seat: Joi.number().integer().min(0).required()
                }).external(isModValidator);
                socket.on('transfer-host', (0, _funcs.asyncSchemaValidator)(transferHostSchema, function (data) {
                  var newHostName = s.getPlayerBySeat(data.seat);

                  if (newHostName === s.getPlayerById(playerId)) {
                    console.log('attempting to transfer host to oneself');
                  } else {
                    console.log('transferring host to ', newHostName);

                    if (s.transferHost(newHostName)) {
                      var newHostSocketId = s.getSocketId(s.getPlayerId(newHostName));
                      io.sockets.to(s.getSocketId(playerId)).emit('remove-mod-abilities');
                      io.sockets.to(newHostSocketId).emit('add-mod-abilities');
                      s.sendTableState();
                    } else {
                      console.log('unable to transfer host');
                      s.sendTableState();
                    }
                  }
                }));
                updatePlayerStackSchema = Joi.object({
                  seat: Joi.number().integer().min(0).required(),
                  newStackAmount: Joi.number().integer().min(0).required()
                }).external(isModValidator);
                socket.on('update-player-stack', (0, _funcs.asyncSchemaValidator)(updatePlayerStackSchema, function (data) {
                  var pName = s.getPlayerBySeat(data.seat);
                  var newStack = data.newStackAmount;

                  if (!pName || pName === 'guest') {
                    console.log('player at seat ' + data.seat + ' doesnt exist');
                  } else {
                    if (!newStack || isNaN(newStack) || newStack <= 0) {
                      console.log('error with newStackAmountInput');
                    } else {
                      console.log("queuing to update ".concat(pName, "'s stack to ").concat(newStack));
                      s.queueUpdatePlayerStack(pName, newStack); // if game isnt in progress update players stack immediately

                      if (!s.gameInProgress) {
                        s.sendTableState(); // io.sockets.to(sid).emit('update-stack', {
                        //     seat: data.seat,
                        //     stack: newStack
                        // });
                      }
                    }
                  }
                })); // this if else statement is a nonsense fix need to find a better one
              } else {
                console.log('already connected');
              }

            case 2:
            case "end":
              return _context12.stop();
          }
        }
      }, _callee12);
    }));

    return function (_x12) {
      return _ref2.apply(this, arguments);
    };
  }());
}));
module.exports = router;