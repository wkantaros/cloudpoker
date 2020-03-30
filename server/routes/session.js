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
        s.createNewTable(sid, req.body.smallBlind, req.body.bigBlind, req.body.name, req.body.stack);
    }
});

//login page for host
// note: removing the ? makes id necessary (not optional)
router.route('/:id').get((req, res) => {
    let id = req.params.id;
    let t = s.getTableById(id);
    let table = t.table;
    
    // console.log(t);
    res.render('pages/session', {
        bigBlind: table.bigBlind,
        smallBlind: table.smallBlind,
        rank: ranks[0],
        suit: suits[0],
        color: 'black',
        name: t.hostName,
        stack: t.hostStack,
        joinedGame: true
    });

    //consider uncommenting if it becomes an issue
    let socket_id = [];
    const io = req.app.get('socketio');
    io.on('connection', function (socket) {
        socket_id.push(socket.id);
        // rm connection listener for any subsequent connections with the same ID
        if (socket_id[0] === socket.id) 
            io.removeAllListeners('connection');
        console.log('a user connected at', socket.id);
        // --------------------------------------------------------------------
        //adds socket to room (actually a sick feature)
        socket.join(id);
        
        socket.on('chat', (data) => {
            console.log(data);
            io.to(id).emit('chat', data);
            // io.sockets.emit('chat', data);
        });

        socket.on('typing', (handle) => {
            socket.broadcast.to(id).emit('typing', handle);
        });
    });
});

let playerids = {}

const ranks = 'A 2 3 4 5 6 7 8 9 10 J Q K'.split(' ');
const suits = '♠︎ ♥︎ ♣︎ ♦︎'.split(' ');

module.exports = router;