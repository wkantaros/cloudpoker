var poker = require('./lib/node-poker');

var table = new poker.Table(50,100,2,10,100,1000);

table.AddPlayer('bob',1000) //dealer
table.AddPlayer('jane',1000) //small blind
table.AddPlayer('dylan',1000) //big blind
// table.AddPlayer('john',400) //first to act preflop
// table.AddPlayer('eve',1000) //second to act preflop

let whosAction = () => console.log(`We are on the ${table.game.roundName}, it is ${table.getCurrentPlayer()}\'s action`);

table.StartGame()
// console.log(table);

//preflop
whosAction();
table.call('bob');
whosAction();
table.call('jane');
whosAction();
table.call('dylan');

//flop
whosAction();
table.check('jane');
// whosAction();
// table.call('dylan');
// whosAction();
// table.call('bob');
// whosAction();

// //preflop
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


