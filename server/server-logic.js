/**
 * functions needed
 */

let poker = require('../poker-logic/lib/node-poker');

// could probably make this a proper db at some point
// maps sessionid -> {table, hostname, hoststack, seatsTaken, gameInProgress}
let tables = {};

// maps sessionid -> playerName -> { playerid, seat }
let playerids = {}

//track buyins/buyouts
// maps sessionid -> {[playerName, playerid, buyin, buyout]}
let trackBuyins = {}

let createNewTable = (sessionid, smallBlind, bigBlind, hostName, hostStack, hostIsStraddling, straddleLimit, playerid) => {
    let table = new poker.Table(smallBlind, bigBlind, 2, 10, 1, 500000000000, straddleLimit);
    tables[sessionid] = {
        table: table,
        hostName: hostName,
        hostStack: hostStack,
        smallBlind: smallBlind,
        bigBlind: bigBlind,
        seatsTaken: [false, false, false, false, false, false, false, false, false, false],
        leavingGame: [false, false, false, false, false, false, false, false, false, false],
        allIn: [false, false, false, false, false, false, false, false, false, false],
        gameInProgress: false 
    };
    table.AddPlayer(hostName, hostStack, getAvailableSeat(sessionid), hostIsStraddling);
    addToPlayerIds(sessionid, hostName, playerid);
    addToBuyins(sessionid, hostName, playerid, hostStack);
};

let addToPlayerIds = (sessionid, playerName, playerid) => {
    let tempObj = playerids[sessionid] || {};
    tempObj[playerName] = {
        playerid: playerid,
        seat: getAvailableSeat(sessionid)
    };
    playerids[sessionid] = tempObj;
    tables[sessionid].seatsTaken[getAvailableSeat(sessionid)] = true;
}

let addToBuyins = (sessionid, playerName, playerid, playerStack) => {
    let obj = {
        playerName: playerName,
        playerid: playerid,
        buyin: playerStack,
        time: null,
        buyout: null
    }
    let date = new Date;
    let minutes = (date.getMinutes() < 10) ? `0${date.getMinutes()}` : `${date.getMinutes()}`;
    let time = `${date.getHours()}:${minutes}`;
    obj.time = time;

    if (!Object.keys(trackBuyins).includes(sessionid)){
        trackBuyins[sessionid] = [];
    }

    let playerAlreadyInDb = false;
    for (let i = 0; i < trackBuyins[sessionid].length; i++) {
        if (trackBuyins[sessionid][i].playerName == playerName && trackBuyins[sessionid][i].playerid == playerid) {
            trackBuyins[sessionid][i].buyin = parseInt(trackBuyins[sessionid][i].buyin) + parseInt(playerStack);
            trackBuyins[sessionid][i].time = time;
            playerAlreadyInDb = true;
        }
    }
    if (!playerAlreadyInDb){
        trackBuyins[sessionid].push(obj);
    }
}

let addBuyOut = (sessionid, playerName, playerid, buyOutStack) => {
    let date = new Date;
    let minutes = (date.getMinutes() < 10) ? `0${date.getMinutes()}` : `${date.getMinutes()}`;
    let time = `${date.getHours()}:${minutes}`;
    for (let i = 0; i < trackBuyins[sessionid].length; i++) {
        if (trackBuyins[sessionid][i].playerName == playerName && trackBuyins[sessionid][i].playerid == playerid) {
            if (buyOutStack == undefined){
                buyOutStack = tables[sessionid].table.getPlayer(playerName).chips || trackBuyins[sessionid][i].buyin;
            }
            if (trackBuyins[sessionid][i].buyout != null){
                trackBuyins[sessionid][i].buyout = parseInt(buyOutStack) + parseInt(trackBuyins[sessionid][i].buyout);
            }
            else {
                trackBuyins[sessionid][i].buyout = buyOutStack;
            }
            trackBuyins[sessionid][i].time = time;
        }
    }
}

let getBuyinBuyouts = (sid) => {
    return trackBuyins[sid];
}

// adds the player to the sid -> name -> pid map
// adds the player to the table
let buyin = (sessionid, playerName, playerid, stack, isStraddling) => {
    let seat = getAvailableSeat(sessionid);
    if (getAvailableSeat(sessionid) > -1){
        addToPlayerIds(sessionid, playerName, playerid);
        addToBuyins(sessionid, playerName, playerid, stack);
        // console.log(tables[sessionid]);
        tables[sessionid].table.AddPlayer(playerName, stack, seat, isStraddling);
        console.log(`${playerName} buys in for ${stack} at seat ${seat}`);
        if (getTableById(sessionid).hostName === null){
            console.log(`transferring host to ${playerName} (pid: ${playerid})`);
            transferHost(sessionid, playerName);
        }
        return true;
    } else {
        console.log('no seats available');
        return false;
    }
}

function setPlayerStraddling(sid, playerid, isStraddling) {
    const player = tables[sid].table.getPlayer(getPlayerById(sid, playerid));
    if (player) {
        player.isStraddling = isStraddling;
    }
}

let removePlayer = (sessionid, playerName) => {
    tables[sessionid].table.removePlayer(playerName);
    tables[sessionid].leavingGame[playerids[sessionid][playerName].seat] = true;
    delete playerids[sessionid][playerName];
    if (playerName === tables[sessionid].hostName){
        // transfer host name / abilities to next player
        transferHost(sessionid, '');
    }
}

let transferHost = (sid, newHostName) => {
    console.log(playerids[sid]);
    if (newHostName in playerids[sid]){
        tables[sid].hostName = newHostName;
        tables[sid].hostStack = getStack(sid, newHostName);
        console.log('succesfully transferred host to ' + newHostName);
        return true;
    }
    for (let playerName of Object.keys(playerids[sid])) {
        // console.log(key + " -> " + playerids[sid][key]);
        tables[sid].hostName = playerName;
        tables[sid].hostStack = getStack(sid, playerName);
        console.log('transferred host to ' + playerName);
        return true;
        
    }
    tables[sid].hostName = null; 
    tables[sid].hostStack = null; 
    console.log('no player to transfer game to :(');
    return false;
}

let makeEmptySeats = (sid) => {
    for (let i = 0; i < tables[sid].leavingGame.length; i++){
        if (tables[sid].leavingGame[i]){
            tables[sid].seatsTaken[i] = false;
            tables[sid].leavingGame[i] = false;
        }
    }
}

// returns the seats of all all in players
let getAllIns = (sid) => {
    let players = tables[sid].table.players;
    for (let i = 0; i < players.length; i++){
        if (getPlayerSeat(sid, players[i].playerName) != -1){
            tables[sid].allIn[getPlayerSeat(sid, players[i].playerName)] = players[i].allIn;
        }
    }
    return tables[sid].allIn;
}

let getLosers = (sid) => {
    let losers = tables[sid].table.getLosers();
    console.log('losers!');
    console.log(losers);
    return losers;
}

let getTableById = (id) => tables[id];

const isPlayerNameUsed = (sid, playerName) => {
    return Object.keys(playerids[sid]).includes(playerName)
};

function getStraddleLimit(sid) {
    return tables[sid].table.straddleLimit;
};

let getPlayerId = (sid, playerName) => {
    if (Object.keys(playerids[sid]).includes(playerName))
        return playerids[sid][playerName].playerid;
    else
        return undefined;
}

let getModId = (sid) => {
    if (tables[sid].hostName != null){
        return getPlayerId(sid, tables[sid].hostName);
    } else {
        return null;
    }
}

const isActivePlayerId = (sid, playerid) => {
    return Object.values(playerids[sid]).map(x => x.playerid).includes(playerid);
};

let getPlayerById = (sid, pid) => {
    // console.log(playerids);
    // let t = tables[sid].table;
    for (let name of Object.keys(playerids[sid])){
        // console.log('name', name);
        if (playerids[sid][name].playerid == pid){
            return name;
        }
    }
    return 'guest';
}

let getPlayerBySeat = (sid, seat) => {
    // let t = tables[sid].table;
    for (name in playerids[sid]) {
        if (playerids[sid][name].seat == seat) {
            return name;
        }
    }
    return 'guest';
}


let getPlayerSeat = (sid, playerName) => {
    if (playerids[sid][playerName])
        return playerids[sid][playerName].seat;
    else {
        console.log('no seat for', playerName);
        return -1;
    }
};

let updatePlayerId = (sid, playerName, playerid) => {
    let oldplayerid = playerids[sid][playerName].playerid;
    for (let i = 0; i < trackBuyins[sid].length; i++) {
        if (trackBuyins[sid][i].playerName == playerName && trackBuyins[sid][i].playerid == oldplayerid){
            trackBuyins[sid][i].playerid = playerid;
        }
    }
    playerids[sid][playerName].playerid = playerid;
}

let getAvailableSeat = (sid) => {
    for (let i = 0; i < tables[sid].seatsTaken.length; i++){
        if (!tables[sid].seatsTaken[i]){
            return i;
        }    
    }
    return -1;
}



// returns a list of {playerName, seat, stack, playerid, waiting, betAmount}
// playerName -> { playerid, seat }
let playersInfo = (sid) => {
    let info = [];
    // console.log(getTableById(sid).table);
    // console.log(playerids[sid]);

    for (let name in playerids[sid]){
        let isWaiting = getTableById(sid).table.playersToAdd.map(x => x.playerName).includes(name);
        info.push({
            playerName: name,
            seat: playerids[sid][name].seat,
            stack: getStack(sid, name),
            playerid: playerids[sid][name].playerid,
            waiting: isWaiting,
            betAmount: getBet(sid, name), // amount that name bet so far in this street
        })
    }
    // console.log(info);
    return info;
};

const getBet = (sid, playerName) => {
    if (!gameInProgress(sid)) return 0;
    let table = getTableById(sid).table;
    for (let i = 0; i < table.players.length; i++){
        if (table.players[i].playerName === playerName){
            return table.players[i].bet;
        }
    }
    return 0;
};

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
    tables[sid].table.initNewRound();
    if (!tables[sid].table.game)
        tables[sid].gameInProgress = false;
}

let getCardsByPlayerName = (sid, playerName) => tables[sid].table.getHandForPlayerName(playerName);

let getActionSeat = (sid) => {
    if (gameInProgress(sid)){
        let name = tables[sid].table.getCurrentPlayer();
        return getPlayerSeat(sid, name);
    } else {
        return -1;
    }
}

let getDealerSeat = (sid) => {
    // console.log('GET DEALER');
    // console.log(tables[sid].table);
    // console.log('----------');
    if (gameInProgress(sid)) {
        let dealerIndex = tables[sid].table.dealer;
        let seat = 0;
        for (let i = 0; i < tables[sid].seatsTaken.length; i++){
            if (tables[sid].seatsTaken[i] && seat == dealerIndex){
                console.log(`DEALER INDEX: ${dealerIndex}, SEAT: ${i}`);
                return i;
            } else if (tables[sid].seatsTaken[i]){
                seat++;
            }
        } 
        // console.log(tables[sid].table.bets);
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

const callBlind = (sid, playerName) => {
    return tables[sid].table.callBlind(playerName);
};

let call = (sid, playerName) => {
    // tables[sid].table.call(tables[sid].table.getCurrentPlayer());
    // console.log(tables[sid].table);
    return tables[sid].table.call(playerName);
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


// allows user to raise to a number 
// (such that node-poker doenst have him bet that number + his previous bet)
let raise = (sid, playerName, betAmount) => {
    // console.log(tables[sid]);
    let betIndex = 0;
    for (let i = 0; i < getPlayerSeat(sid, playerName); i++){
        if (tables[sid].seatsTaken[i]){
            betIndex++;
        }
    }
    let playersLastBet = tables[sid].table.players[betIndex].bet;
    let realBetAmount = betAmount - playersLastBet; 
    // let addedBetSize = betAmount - getBet
    // return tables[sid].table.bet(tables[sid].table.getCurrentPlayer(), betAmount);
    console.log(`player ${playerName} is betting ${realBetAmount} on top of his last bet of ${playersLastBet}`);
    return bet(sid, playerName, realBetAmount);
}

let getWinnings = (sid, prev_round) => {
    console.log('calculating winnings');
    let winnings = tables[sid].table.game.pot;
    if (prev_round === 'deal') {
        //basically check if any bets are still on the table and add them to the pot (for big blind, etc)
        for (let i = 0; i < tables[sid].table.players.length; i++) {
            winnings += tables[sid].table.players[i].bet;
        }
    }
    return winnings;
}

let updateStack = (sid, playerName, winnings) => {
    tables[sid].table.getPlayer(playerName).GetChips(winnings);
}

let getMaxBet = (sid) => {
    if (gameInProgress(sid))
        return getTableById(sid).table.getMaxBet();
    else 
        return getTableById(sid).bigBlind;
};

let getNameByActionSeat = (sid) => {
    let seat = getActionSeat(sid);
    for (let name in playerids[sid]) {
        if (playerids[sid][name].seat == seat) {
            return name;
        }
    }
    return 'guest';
}

// return an array of seat, bet objects
// may lead to a bug down the line still unsure
let getInitialBets = (sid) => {
    let bets = tables[sid].table.players.map(x => x.bet);
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

let getBigBlindSeat = (sid) => {
    let seat = getDealerSeat(sid);
    let seats = getTableById(sid).seatsTaken;
    let counter = 0; 
    while (counter < 2){
        if (seat + 1 >= seats.length) {
            seat = 0;
        } else {
            seat++;
        }
        if (seats[seat]) counter++;
    }
    return seat;
}

let getAvailableActions = (sid, playerid) => {
    let availableActions = {
        'min-bet': false,
        'bet': false,
        'raise': false,
        'fold': false,
        'call': false,
        'start': false,
        'check': false,
        'your-action': false,
        'straddle-switch': getStraddleLimit(sid) !== 0,
    };

    let canPerformPremoves = false;
    // if player is at the table
    if (isActivePlayerId(sid, playerid)){
        console.log('player at table');
        // case where game hasnt started yet, player is mod and there are enough players
        let seatsTaken = getTableById(sid).seatsTaken.filter(isTaken => isTaken).length;
        if (!gameInProgress(sid) && (getModId(sid) == playerid) && seatsTaken >= 2) {
            console.log('game can start');
            availableActions['start'] = true;
        }
        // cases where it's the player's action and game is in progress
        else if (gameInProgress(sid) && (getActionSeat(sid) == getPlayerSeat(sid, getPlayerById(sid, playerid)))) {
            // player is in big blind
            if (getActionSeat(sid) == getBigBlindSeat(sid) && getMaxBet(sid) == getTableById(sid).bigBlind && getRoundName(sid) == 'deal') {
                availableActions['check'] = true;
                availableActions['raise'] = true;
                availableActions['fold'] = true;
                availableActions['your-action'] = true;
            }
            // bet on table
            else if (getMaxBet(sid)){
                availableActions['call'] = true;
                availableActions['raise'] = true;
                availableActions['fold'] = true;
                availableActions['your-action'] = true;
            }
            // no bets yet
            else {
                availableActions['check'] = true;
                availableActions['bet'] = true;
                availableActions['min-bet'] = true;
                availableActions['fold'] = true;
                availableActions['your-action'] = true;
            }
        }
        // cases where its not the players action and game is in progress
        else if (gameInProgress(sid)) {
            let playerName = getPlayerById(sid, playerid);
            let playerFolded = getTableById(sid).table.getPlayer(playerName).folded;
            let playerAllIn = getTableById(sid).allIn[getPlayerSeat(sid, playerName)];
            if (!playerFolded && !playerAllIn){
                canPerformPremoves = true;
            }
        }
    }
    return {availableActions, canPerformPremoves};
}

// if thats the case, just call and move forward with game
let actionOnAllInPlayer = (sid) => {
    let actionSeat = getActionSeat(sid);
    if (getTableById(sid).allIn[actionSeat]){
        console.log('action on all in player, moving game forward');
        check(sid, getPlayerSeat(sid, actionSeat));
        return true;
    } else {
        return false;
    }
}

let everyoneAllIn = (sid) => {
    let playersInfos = playersInfo(sid);
    let playersWhoCanAct = 0;
    let allInPlayer = false;
    let allInSeats = getTableById(sid).allIn;
    for (let i = 0; i < 10; i++){
        allInPlayer = allInPlayer || allInSeats[i];
    }
    for (let i = 0; i < playersInfos.length; i++){
        // if the player is currently in the hand
        if (!playersInfos[i].waiting) {
            // if player is not all in
            if (!getTableById(sid).allIn[playersInfos[i].seat]){
                // if player hasnt folded
                if (!playerFolded(sid, playersInfos[i].playerName)){
                    // the number of players in the hand who can act ++
                    playersWhoCanAct++;
                }
            }
        }
    }
    console.log(`Number of players who can act: ${playersWhoCanAct}`);
    console.log(`All in player: ${allInPlayer}`);
    let everyoneFolded = getTableById(sid).table.checkwin().everyoneFolded;
    return !everyoneFolded && (playersWhoCanAct <= 1) && allInPlayer;
}

let playerFolded = (sid, playerName) => {
    let table = getTableById(sid).table;
    return table.getPlayer(playerName).folded;
}

let getPlayerIds = (sid) => {
    return Object.values(playerids[sid]).map(x => x.playerid);
}

module.exports.createNewTable = createNewTable;
module.exports.getTableById = getTableById;
module.exports.buyin = buyin;
module.exports.removePlayer = removePlayer;
module.exports.makeEmptySeats = makeEmptySeats;
module.exports.getPlayerId = getPlayerId;
module.exports.getPlayerById = getPlayerById;
module.exports.isActivePlayerId = isActivePlayerId;
module.exports.isPlayerNameUsed = isPlayerNameUsed;
module.exports.getBet = getBet;
module.exports.getPlayerBySeat = getPlayerBySeat;
// need to change name to getSeatByPlayer eventually
module.exports.getPlayerSeat = getPlayerSeat;
module.exports.updatePlayerId = updatePlayerId;
// module.exports.getAvailableSeat = getAvailableSeat;
module.exports.playersInfo = playersInfo;
module.exports.getStack = getStack;
module.exports.startGame = startGame;
module.exports.startRound = startRound;
module.exports.getCardsByPlayerName = getCardsByPlayerName;
module.exports.getActionSeat = getActionSeat;
module.exports.getDealerSeat = getDealerSeat;
module.exports.gameInProgress = gameInProgress;
module.exports.getPot = getPot;
module.exports.getRoundName = getRoundName;
module.exports.getDeal = getDeal;
module.exports.callBlind = callBlind;
module.exports.call = call;
module.exports.check = check;
module.exports.fold = fold;
module.exports.bet = bet;
module.exports.raise = raise;
module.exports.checkwin = checkwin;
module.exports.getWinnings = getWinnings;
module.exports.updateStack = updateStack;
module.exports.getMaxBet = getMaxBet;
module.exports.getNameByActionSeat = getNameByActionSeat;
module.exports.getInitialBets = getInitialBets;
module.exports.getWinners = getWinners;
module.exports.getLosers = getLosers;
module.exports.getModId = getModId;
module.exports.getAllIns = getAllIns;
module.exports.getAvailableActions = getAvailableActions;
module.exports.actionOnAllInPlayer = actionOnAllInPlayer;
module.exports.everyoneAllIn = everyoneAllIn;
module.exports.getPlayerIds = getPlayerIds;
module.exports.setPlayerStraddling = setPlayerStraddling;
module.exports.getStraddleLimit = getStraddleLimit;
module.exports.getBuyinBuyouts = getBuyinBuyouts;
module.exports.addBuyOut = addBuyOut;
