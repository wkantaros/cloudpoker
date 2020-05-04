"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var poker = _interopRequireWildcard(require("./lib/node-poker"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var table = new poker.Table(50, 100, 2, 10, 100, 1000);
table.AddPlayer('bob', 400); //dealer

table.AddPlayer('jane', 400); //small blind

table.AddPlayer('dylan', 1000); //big blind
// table.AddPlayer('john',400) //first to act preflop
// table.AddPlayer('eve',1000) //second to act preflop

var whosAction = function whosAction() {
  return console.log("We are on the ".concat(table.game.roundName, ", it is ").concat(table.getCurrentPlayer(), "'s action"));
};

console.log(table);
table.StartGame();
whosAction();
table.bet('bob', 500);
console.log(table);
whosAction();
table.call('jane');
whosAction();
table.call('dylan');
whosAction();
table.check('jane'); // console.log(table);

whosAction();
table.bet('dylan', 100);
whosAction(); // //preflop
// console.log(table.game.pot);
// whosAction();
// table.call('john');
// console.log(table.game.pot);
// whosAction();
// table.call('eve');
// whosAction();
// table.call('bob');
// whosAction();
// table.call('jane');
// whosAction();
// table.call('dylan');
// // console.log(table);
// // console.log(table.checkwin().winner.table.game.roundBets);
// let obj = table.checkwin();
// if (obj.everyoneFolded){
//     console.log(`${obj.winner.playerName} won a pot of ${obj.pot}`);
//     obj.winner.GetChips(obj.pot);
// }
// // table.initNewRound();
// // whosAction();
// // table.fold('eve');
// // whosAction();
// // console.log(table);
// // table.checkForWinner1();
// //flop
// console.log(table.getDeal());
// whosAction();
// table.check('jane');
// whosAction();
// table.check('dylan');
// whosAction();
// table.fold('john');
// whosAction();
// table.check('eve');
// whosAction();
// table.check('bob');
// //turn
// console.log(table.getDeal());
// whosAction();
// table.bet('jane', 50);
// whosAction();
// table.bet('dylan', 100);
// whosAction();
// table.call('john');
// whosAction();
// table.fold('eve');
// table.AddPlayer('kanty', 1000);
// whosAction();
// table.call('bob');
// whosAction();
// table.call('jane');
// //river
// console.log(table.getDeal());
// whosAction();
// table.check('jane');
// whosAction();
// table.bet('dylan', 100);
// whosAction();
// table.call('john');
// whosAction();
// table.call('bob');
// whosAction();
// table.fold('jane');
// whosAction();
// console.log(table.getWinners());
// // // table.initNewRound();
// // // console.log(`We are on the ${table.game.roundName}, it is ${table.getCurrentPlayer()}\'s action`);
// // // // console.log(table);
// // // // console.log(`We are on the ${table.game.roundName}, it is ${table.getCurrentPlayer()}\'s action`);