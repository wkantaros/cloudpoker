const router = require('express').Router();
const path = require('path');
const Joi = require('@hapi/joi');
const shortid = require('shortid');
const s = require('../server-logic');

// Information host submits for game (name, stack, bb, sb)
router.route('/').post((req, res) => {
    //scheme to ensure valid username
    const schema = Joi.object({
        username: Joi.string().alphanum().min(2).max(30)
    });
    const { error, value } = schema.validate({ username: req.body.name });
    if (error) {
        res.status(422);
        res.json({
            isValid: false,
            message: error.details[0].message
        });
    } else {
        let sid = shortid.generate();
        req.body.shortid = sid;
        req.body.isValid = true;
        res.json(req.body);
        console.log(`starting new table with id: ${sid}`);
        s.createNewTable(sid, req.body.smallBlind, req.body.bigBlind, req.body.name, req.body.stack, 6969);
    }
});

//login page for host
// note: removing the ? makes id necessary (not optional)
router.route('/:id').get((req, res) => {
    let sid = req.params.id;
    let t = s.getTableById(sid);
    let table = t.table;
    
    res.render('pages/game', {
        bigBlind: table.bigBlind,
        smallBlind: table.smallBlind,
        rank: ranks[0],
        suit: suits[0],
        action: false,
        color: 'black',
        name: t.hostName,
        stack: t.hostStack,
        showCards: false,
        joinedGame: true,
        waiting: true
    });

    //consider uncommenting if it becomes an issue
    let socket_id = [];
    const io = req.app.get('socketio');
    io.on('connection', function (socket) {
        // make sure host has a socketid associate with name
        if (s.getPlayerId(sid, t.hostName) == 6969) {
            s.updatePlayerId(sid, t.hostName, socket.id);
            console.log(s.getPlayerId(sid, t.hostName));
        }

        socket_id.push(socket.id);
        // rm connection listener for any subsequent connections with the same ID
        if (socket_id[0] === socket.id) 
            io.removeAllListeners('connection');
        console.log('a user connected at', socket.id);
        // --------------------------------------------------------------------
        //adds socket to room (actually a sick feature)
        socket.join(sid);
        io.sockets.to(sid).emit('render-players', s.playersInfo(sid));

        // send a message in the chatroom
        socket.on('chat', (data) => {
            console.log(data);
            io.to(sid).emit('chat', data);
            // io.sockets.emit('chat', data);
        });

        // typing
        socket.on('typing', (handle) => {
            socket.broadcast.to(sid).emit('typing', handle);
        });

        socket.on('buy-in', (data) => {
            // console.log(data);
            s.buyin(sid, data.playerName, data.id, data.stack);
            io.sockets.to(sid).emit('buy-in', data);
            io.sockets.to(sid).emit('render-players', s.playersInfo(sid));
        });

        socket.on('start-game', (data) => {
            let playersInNextHand = 0;
            if (table.playersToAdd) playersInNextHand += table.playersToAdd.length;
            if (table.players) playersInNextHand += table.players.length;
            console.log(`players in next hand: ${playersInNextHand}`);
            if (playersInNextHand >= 2 && playersInNextHand <= 10) {
                s.startGame(sid);
                begin_round();
            } else {
                console.log("waiting on players");
            }
        });
    });

    let begin_round = () => {
        io.sockets.to(sid).emit('new-hand', {});
        let data = s.playersInfo(sid);
        console.log(data);
        for (let i = 0; i < data.length; i++) {
            let name = data[i].playerName;
            let chips = data[i].chips;
            io.to(`${data[i].playerid}`).emit('start-hand', {
                username: name,
                cards: s.getCardsByPlayerName(sid, name),
                stack: chips
            });
            io.sockets.to(sid).emit('update-stack', {
                stack: table.getPlayer(name).chips
            });

        }
        io.sockets.to(sid).emit('action', {});
    }
});

let playerids = {}

const ranks = 'A 2 3 4 5 6 7 8 9 10 J Q K'.split(' ');
const suits = '♠︎ ♥︎ ♣︎ ♦︎'.split(' ');

module.exports = router;