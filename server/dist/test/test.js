"use strict";

var _pokerLogic = require("../poker-logic");

function _createForOfIteratorHelper(o) { if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (o = _unsupportedIterableToArray(o))) { var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var it, normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var assert = require('assert').strict;

var describe = require('mocha').describe;

var it = require('mocha').it;

describe('Table', function () {
  describe('AddPlayer', function () {
    it('should add player in first available seat', function () {
      var t = new Tab(1, 2, 2, 10, 10, 100, 0);
      t.AddPlayer('foo', 50, false);
      assert.equal(t.allPlayers[0].playerName, 'foo');
      assert.equal(t.allPlayers[0].chips, 50);
      assert.equal(t.allPlayers[0].isStraddling, false);
    });
  });
  describe('removePlayer', function () {
    it('should set leavingGame to false', function () {
      var t = new Tab(1, 2, 2, 10, 10, 100, 0);
      t.AddPlayer('p1', 50, false);
      t.AddPlayer('p2', 55, false);
      t.AddPlayer('p3', 55, false);

      var _iterator = _createForOfIteratorHelper(t.players),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var p = _step.value;
          t.allPlayers[p.seat].inHand = true;
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }

      t.removePlayer('p2');
      assert.equal(t.allPlayers[1].leavingGame, true);
    });
  });
  describe('removeAndAddPlayers', function () {
    it('sets removed players to null', function () {
      var t = new Tab(1, 2, 2, 10, 10, 100, 0);

      for (var i = 0; i < 7; i++) {
        t.AddPlayer("p".concat(i), 50, false);
      }

      var _iterator2 = _createForOfIteratorHelper(t.players),
          _step2;

      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var p = _step2.value;
          p.inHand = true;
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }

      t.dealer = 6;

      for (var _i = 0; _i < 4; _i++) {
        assert.equal(t.removePlayer("p".concat(_i * 2)), true);
      }

      for (var _i2 = 0; _i2 < 7; _i2++) {
        assert.equal(t.AddPlayer("z".concat(_i2), 50, false), true);
      }

      t.removeAndAddPlayers(); // for (let i=0; i<4; i++) {
      //     assert.equal(t.allPlayers[i*2], null);
      // }

      console.log(t.allPlayers);
      console.log(t.dealer);
    });
  });
});