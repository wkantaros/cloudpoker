// Dependencies
let poker = require('./poker-logic/lib/node-poker');
let express = require('express');
let http = require('http');
let path = require('path');
let socketIO = require('socket.io'); 
let app = express();
let portnumber = 6912
app.set('port', portnumber);
let server = http.Server(app);

// app.use('/static', express.static(__dirname + '/static'));
// app.use(express.static('public'));
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/login'));

// Routing
app.get('/', function (request, response) {
    console.log('made it here!');
    response.sendFile(path.join(__dirname, '/login/index.html'));
    // console.log(request);
});

// app.post('/', function (request, response) {
//     console.log('here!');
//     console.log(request);
//     // response.sendFile(path.join(__dirname, '/login/index.html'));
// });

// app.get('/login', function (request, response) {
//     response.sendFile(path.join(__dirname, '/public/login.html'));
// });

app.get('/game', function (request, response) {
    // console.log('going to game function');
    response.sendFile(path.join(__dirname, 'public/game.html'));
});

// Starts the server.
server.listen(portnumber, function () {
    console.log(`Starting server on port ${portnumber}`);
});

//socket setup
let io = socketIO(server);
// Add the WebSocket handlers
var table = new poker.Table(25, 50, 2, 10, 50, 500000);
io.on('connection', (socket) => { // this is setting up the socket on the server
    console.log('made socket connection', socket.id);

    socket.on('chat', (data) => {
        // console.log(data);
        //recieving message from socket and emmitting it back to all sockets
        io.sockets.emit('chat', data);
    });

    socket.on('typing', (handle) => {
        // console.log(handle);
        // bradcast = everyone gets it but the sender
        socket.broadcast.emit('typing', handle);
    });

    socket.on('buy-in', (data) => {
        console.log(`${data.name} buys in for ${data.stack}`);
        table.AddPlayer(data.name, data.stack);
        // console.log(table);
        player_ids[data.name] = data.id;
        io.sockets.emit('buy-in', data);
    });

    socket.on('buy-out', (data) => {
        console.log(`${data.name} buys out for ${data.stack}`);
        table.removePlayer(data.name);
        io.sockets.emit('buy-out', data);
        check_round(table.game.roundName);
    });

    socket.on('start-game', (data) => {
        // console.log(table);
        let playersInNextHand = 0; 
        if (table.playersToAdd){
            playersInNextHand += table.playersToAdd.length;
        }
        if (table.players){
            playersInNextHand += table.players.length;
        }
        console.log(`players in next hand: ${playersInNextHand}`);
        if (playersInNextHand >= 2 && playersInNextHand <= 10){
            table.StartGame();
            begin_round();
        } else {
            console.log("waiting on players");
        }
    });

    socket.on('check', (data) => {
        if (!table.game) {
            console.log('game hasn\'t started yet');
        } else if (table.getCurrentPlayer() === data.username){
            prev_round = table.game.roundName;
            let able_to_check = table.check(table.getCurrentPlayer());
            if (able_to_check){
                io.sockets.emit('check', {
                    username: data.username,
                    stack: table.getPlayer(data.username).chips,
                    pot: table.game.pot
                });
                // update client's stack size
                io.to(`${player_ids[data.username]}`).emit('update-stack', {
                    stack: table.getPlayer(data.username).chips
                });
                io.to(`${player_ids[table.getCurrentPlayer()]}`).emit('action', {
                    canCheck: able_to_check
                });
            }
            check_round(prev_round);
        }
    });

    socket.on('call', (data) => {
        if (!table.game) {
            console.log('game hasn\'t started yet');
        } else if (table.getCurrentPlayer() === data.username) {
            prev_round = table.game.roundName;
            table.call(table.getCurrentPlayer());
            // send call back to every client
            io.sockets.emit('call', {
                username: data.username,
                stack: table.getPlayer(data.username).chips,
                pot: table.game.pot
            });
            // update client's stack size
            io.to(`${player_ids[data.username]}`).emit('update-stack', {
                stack: table.getPlayer(data.username).chips
            });
            // let next client know it's his action
            io.to(`${player_ids[table.getCurrentPlayer()]}`).emit('action', {});
            // console.log(`Current player ${table.currentPlayer} (${data.username}) calls`);
            check_round(prev_round);
        }
    });

    socket.on('bet', (data) => {
        if (!table.game){
            console.log('game hasn\'t started yet');
        } else if (table.getCurrentPlayer() === data.username) {
            prev_round = table.game.roundName;
            table.bet(table.getCurrentPlayer(), data.amount);
            io.sockets.emit('bet', {
                username: data.username,
                stack: table.getPlayer(data.username).chips,
                amount: data.amount,
                pot: table.game.pot
            }); 
            // update client's stack size
            io.to(`${player_ids[data.username]}`).emit('update-stack', {
                stack: table.getPlayer(data.username).chips
            });
            io.to(`${player_ids[table.getCurrentPlayer()]}`).emit('action', {});
            // console.log(`${data.username} bets ${data.amount}`);
            check_round(prev_round);
        }
    });
    socket.on('fold', (data) => {
        if (!table.game) {
            console.log('game hasn\'t started yet');
        } else if (table.getCurrentPlayer() === data.username) {
            prev_round = table.game.roundName;
            table.fold(table.getCurrentPlayer());
            io.sockets.emit('fold', {
                username: data.username,
                stack: table.getPlayer(data.username).chips,
                pot: table.game.pot
            });
            // update client's stack size
            io.to(`${player_ids[data.username]}`).emit('update-stack', {
                stack: table.getPlayer(data.username).chips
            });
            io.to(`${player_ids[table.getCurrentPlayer()]}`).emit('action', {});
            // console.log(`Current player ${table.currentPlayer} (${data.username}) folds`);
            check_round(prev_round);
        }
    });
});

//checks if round has ended (reveals next card)
let check_round = (prev_round) => {
    // console.log(table);
    let data = table.checkwin();
    if (table.game.roundName === 'Showdown'){
        winners = table.getWinners();
        io.sockets.emit('showdown', winners);
        table.initNewRound();
        begin_round();
    } else if (data.everyoneFolded) {
        console.log(prev_round);
        let winnings = data.pot;
        if (prev_round === 'Deal'){
            if (table.game.bets[table.currentPlayer] === table.bigBlind){
                //add big blind to pot
                winnings += table.bigBlind;
            }
        }
        // console.log(data.winner);
        console.log(`${data.winner.playerName} won a pot of ${winnings}`);
        io.to(`${player_ids[data.winner.playerName]}`).emit('update-stack', {
            stack: data.winner.chips + winnings
        });
        data.winner.GetChips(winnings);
        console.log(data.winner.chips);
        io.sockets.emit('folds-through', {
            username: data.winner.playerName,
            amount: winnings
        });
        table.initNewRound();
        if (table.game){
            begin_round();
        } else {
            // console.log(table);
            console.log('waiting for more players to rejoin!');
        }
    }
    else if (prev_round !== table.game.roundName){
        io.sockets.emit('display-board', {
            street: table.game.roundName,
            board: table.getDeal()
        });
    }
}

var player_ids = {}

// let update_client_stacks = () => {

// }

let begin_round = () => {
    io.sockets.emit('new-hand', {});
    for (let i = 0; i < table.players.length; i++) {
        let name = table.players[i].playerName;
        let chips = table.players[i].chips;
        io.to(`${player_ids[name]}`).emit('start-hand', {
            username: name,
            cards: table.getHandForPlayerName(name),
            stack: chips
        });
        io.to(`${player_ids[name]}`).emit('update-stack', {
            stack: table.getPlayer(name).chips
        });

    }
    io.to(`${player_ids[table.getCurrentPlayer()]}`).emit('action', {});
}