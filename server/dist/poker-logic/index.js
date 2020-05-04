"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _deck = require("./lib/deck");

Object.keys(_deck).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _deck[key];
    }
  });
});

var _nodePoker = require("./lib/node-poker");

Object.keys(_nodePoker).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function get() {
      return _nodePoker[key];
    }
  });
});