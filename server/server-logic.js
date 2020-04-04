/**
 * functions needed
 */

let poker = require('../poker-logic/lib/node-poker');

// could probably make this a proper db at some point
// maps sessionid -> {table, hostname, hoststack, seats}
let tables = {};

// maps sessionid -> playerName -> { playerid, seat }
let playerids = {}

let createNewTable = (sessionid, smallBlind, bigBlind, hostName, hostStack, playerid) => {
    let table = new poker.Table(smallBlind, bigBlind, 2, 10, 1, 500000000);
    table.AddPlayer(hostName, hostStack);
    tables[sessionid] = {
        table: table,
        hostName: hostName,
        hostStack: hostStack,
        seatsTaken: [false, false, false, false, false, false, false, false, false, false]
    };
    addToPlayerIds(sessionid, hostName, playerid);
}

let addToPlayerIds = (sessionid, playerName, playerid) => {
    let tempObj = playerids[sessionid] || {};
    tempObj[playerName] = {
        playerid: playerid,
        seat: getAvailableSeat(sessionid)
    };
    playerids[sessionid] = tempObj;
    tables[sessionid].seatsTaken[getAvailableSeat(sessionid)] = true;
}

// adds the player to the sid -> name -> pid map
// adds the player to the table
let buyin = (sessionid, playerName, playerid, stack) => {
    if (getAvailableSeat(sessionid) > -1){
        addToPlayerIds(sessionid, playerName, playerid);
        // console.log(tables[sessionid]);
        tables[sessionid].table.AddPlayer(playerName, stack);
        console.log(`${playerName} buys in for ${stack}`);
        return true;
    } else {
        console.log('no seats available');
        return false;
    }
}

let getTableById = (id) => tables[id];

let getPlayerId = (sid, playerName) => playerids[sid][playerName].playerid;
let getPlayerSeat = (sid, playerName) => playerids[sid][playerName].seat;

let updatePlayerId = (sid, playerName, playerid) => playerids[sid][playerName].playerid = playerid;

let getAvailableSeat = (sid) => {
    for (let i = 0; i < tables[sid].seatsTaken.length; i++){
        if (!tables[sid].seatsTaken[i]){
            return i;
        }    
    }
    return -1;
}

// returns a list of {playerName, seat, stack}
let playersInfo = (sid) => {
    let info = [];
    // console.log(playerids[sid]);
    for (name in playerids[sid]){
        // console.log(name);
        // console.log(playerids[sid][name].seat);
        // console.log(getStack(sid, name));
        info.push({
            playerName: name,
            seat: playerids[sid][name].seat,
            stack: getStack(sid, name),
            playerid: playerids[sid][name].playerid
        })
    }
    return info;
}

let getStack = (sid, playerName) => {
    let table = getTableById(sid).table;
    for (let i = 0; i < table.players.length; i++){
        if (table.players[i].playerName == playerName){
            return (table.players[i].chips);
        }
    }
    for (let i = 0; i < table.playersToAdd.length; i++){
        if (table.playersToAdd[i].playerName == playerName){
            return (table.playersToAdd[i].chips);
        }
    }
    return -1;
}

let startGame = (sid) => tables[sid].table.StartGame();

let getCardsByPlayerName = (sid, playerName) => tables[sid].table.getHandForPlayerName(playerName);

let getActionSeat = (sid) => {
    let name = tables[sid].table.getCurrentPlayer();
    return playerids[sid][name].seat;
}

module.exports.createNewTable = createNewTable;
module.exports.getTableById = getTableById;
module.exports.buyin = buyin;
module.exports.getPlayerId = getPlayerId;
module.exports.getPlayerSeat = getPlayerSeat;
module.exports.updatePlayerId = updatePlayerId;
// module.exports.getAvailableSeat = getAvailableSeat;
module.exports.playersInfo = playersInfo;
module.exports.startGame = startGame;
module.exports.getCardsByPlayerName = getCardsByPlayerName;
module.exports.getActionSeat = getActionSeat;