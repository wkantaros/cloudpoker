/**
 * functions needed
 */

let poker = require('../poker-logic/lib/node-poker');

// could probably make this a proper db at some point
// maps sessionid -> {table, hostname, hoststack, seatsTaken, gameInProgress}
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
    // console.log('GET DEALER');
    // console.log(tables[sid].table);
    // console.log('----------');
    if (gameInProgress(sid)) {
        // console.log(tables[sid].table.bets);
        return tables[sid].table.dealer;
    } else {
        return -1;
    }
}

let gameInProgress = (sid) => tables[sid].gameInProgress;

let getPot = (sid) => gameInProgress(sid) ? tables[sid].table.game.pot : 0;

let checkwin = (sid) => tables[sid].table.checkwin();

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

let call = (sid, playerName) => {
    // tables[sid].table.call(tables[sid].table.getCurrentPlayer());
    tables[sid].table.call(playerName);
}

let check = (sid, playerName) => {
    // return tables[sid].table.check(tables[sid].table.getCurrentPlayer());
    return tables[sid].table.check(playerName);
}

let fold = (sid, playerName) => {
    // return tables[sid].table.fold(tables[sid].table.getCurrentPlayer());
    return tables[sid].table.fold(playerName);
}

let bet = (sid, playerName, betAmount) => {
    // return tables[sid].table.bet(tables[sid].table.getCurrentPlayer(), betAmount);
    return tables[sid].table.bet(playerName, betAmount);
}

let getWinnings = (sid, prev_round) => {
    console.log('calculating winnings');
    let winnings = tables[sid].table.game.pot;
    if (prev_round === 'deal') {
        //basically check if any bets are still on the table and add them to the pot (for big blind, etc)
        for (let i = 0; i < tables[sid].table.game.bets.length; i++) {
            let bet = tables[sid].table.game.bets[i];
            winnings += bet;
        }
    }
    return winnings;
}

let updateStack = (sid, playerName, winnings) => {
    tables[sid].table.getPlayer(playerName).GetChips(winnings);
}

let getMaxBet = (sid) => {
    let maxBet = 0;
    let bets = tables[sid].table.game.bets;
    for (let i = 0; i < bets.length; i ++) {
        if (bets[i] > maxBet) {
            maxBet = bets[i];
        }
    }
    return maxBet;
}

let getNameByActionSeat = (sid) => {
    let seat = getActionSeat(sid);
    for (name in playerids[sid]) {
        if (playerids[sid][name].seat == seat) {
            return name;
        }
    }
    return 'guest';
}

// return an array of seat, bet objects
// may lead to a bug down the line still unsure
let getInitialBets = (sid) => {
    let bets = tables[sid].table.game.bets;
    let toReturn = [];
    for (let i = 0; i < bets.length; i++){
        let obj = {
            seat: 'guest',
            bet: 0
        }
        if (bets[i]){
            obj.bet = bets[i];
            let seatsTaken = getTableById(sid).seatsTaken;
            let counter = 0;
            for (let j = 0; j < seatsTaken.length; j++){
                if (seatsTaken[j]){
                    if (counter === i){
                        obj.seat = j;
                        break;
                    } else {
                        counter++;
                    }
                }
            }
            toReturn.push(obj);
        }
    }
    return toReturn;
}

let getWinners = (sid) => {
    let winners = getTableById(sid).table.getWinners();
    for (let i = 0; i < winners.length; i++){
        winners[i].seat = getPlayerSeat(sid, winners[i].playerName);
    }
    return winners;
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
module.exports.bet = bet;
module.exports.checkwin = checkwin;
module.exports.getWinnings = getWinnings;
module.exports.updateStack = updateStack;
module.exports.getMaxBet = getMaxBet;
module.exports.getNameByActionSeat = getNameByActionSeat;
module.exports.getInitialBets = getInitialBets;
module.exports.getWinners = getWinners;
