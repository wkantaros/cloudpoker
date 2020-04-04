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
        seatsTaken: [false, false, false, false, false, false, false, false, false, false],
        gameInProgress: false 
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
let getPlayerById = (sid, pid) => {
    // let t = tables[sid].table;
    for (name in playerids[sid]){
        if (playerids[sid][name].playerid == pid){
            return name;
        }
    }
    return 'guest';
}
let getPlayerSeat = (sid, playerName) => {
    if (playerids[sid][playerName])
        return playerids[sid][playerName].seat;
    else 
        return -1;
};

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

let startGame = (sid) => {
    tables[sid].gameInProgress = true;
    tables[sid].table.StartGame();
}

let startRound = (sid) => {
    // tables[sid].gameInProgress = true;
    tables[sid].table.initNewRound();
}

let getCardsByPlayerName = (sid, playerName) => tables[sid].table.getHandForPlayerName(playerName);

let getActionSeat = (sid) => {
    if (gameInProgress(sid)){
        let name = tables[sid].table.getCurrentPlayer();
        return playerids[sid][name].seat;
    } else {
        return -1;
    }
}

let getDealer = (sid) => {
    console.log('GET DEALER');
    console.log(tables[sid].table);
    console.log('----------');
    if (gameInProgress(sid)) {
        // console.log(tables[sid].table.bets);
        return tables[sid].table.dealer;
    } else {
        return -1;
    }
}

let gameInProgress = (sid) => tables[sid].gameInProgress;

let getPot = (sid) => gameInProgress(sid) ? tables[sid].table.pot : 0;

let checkRound = (sid, prevRound) => {
    let t = tables[sid]
    let data = t.table.checkwin();
}

let getRoundName = (sid) => {
    if (gameInProgress(sid)){
        return tables[sid].table.game.roundName.toLowerCase();
    } else {
        return 'deal';
    }
}

let getDeal = (sid) => {
    return tables[sid].table.getDeal();
}

let call = (sid) => {
    tables[sid].table.call(tables[sid].table.getCurrentPlayer());
}

let check = (sid) => {
    return tables[sid].table.check(tables[sid].table.getCurrentPlayer());
}

let fold = (sid) => {
    return tables[sid].table.fold(tables[sid].table.getCurrentPlayer());
}

module.exports.createNewTable = createNewTable;
module.exports.getTableById = getTableById;
module.exports.buyin = buyin;
module.exports.getPlayerId = getPlayerId;
module.exports.getPlayerById = getPlayerById;
module.exports.getPlayerSeat = getPlayerSeat;
module.exports.updatePlayerId = updatePlayerId;
// module.exports.getAvailableSeat = getAvailableSeat;
module.exports.playersInfo = playersInfo;
module.exports.getStack = getStack;
module.exports.startGame = startGame;
module.exports.startRound = startRound;
module.exports.getCardsByPlayerName = getCardsByPlayerName;
module.exports.getActionSeat = getActionSeat;
module.exports.getDealer = getDealer;
module.exports.gameInProgress = gameInProgress;
module.exports.getPot = getPot;
module.exports.getRoundName = getRoundName;
module.exports.getDeal = getDeal;
module.exports.call = call;
module.exports.check = check;
module.exports.fold = fold;
