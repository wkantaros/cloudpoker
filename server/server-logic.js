/**
 * functions needed
 */

let poker = require('../poker-logic/lib/node-poker');

// could probably make this a proper db at some point
let tables = {};

let createNewTable = (id, smallBlind, bigBlind, hostName, hostStack) => {
    let table = new poker.Table(smallBlind, bigBlind, 2, 10, 1, 500000000);
    table.AddPlayer(hostName, hostStack);
    tables[id] = {
        table: table,
        hostName: hostName,
        hostStack: hostStack
    };
}

let getTableById = (id) => tables[id];

module.exports.createNewTable = createNewTable;
module.exports.getTableById = getTableById;