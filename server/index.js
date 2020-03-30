const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const socketIO = require('socket.io');
// const ejs = require('ejs');

//instantiate server
const app = express();
const port = 8080;
app.set('port', port);
const server = http.Server(app);

//socket setup
let io = socketIO(server);
app.set('socketio', io);

// could use if I want to be a bum
// global.io = socketIO(server);

//ejs
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//middleware
app.use(cors());
app.use(express.json());

//might need to delete later, unsure
app.use('/public1', express.static(__dirname + '/../login'));
app.use('/public2', express.static(__dirname + '/../public'));

//handling login
const loginRouter = require('./routes/login');
app.use(loginRouter); 

//handling sessions
const sessionRouter = require('./routes/session');
app.use('/session', sessionRouter);

// Starts the server.
server.listen(port, function () {
    console.log(`Starting server on port ${port}`);
});

// Login page for host
// app.get('/', (req, res) => {
//     // app.get('/login/');
//     res.sendFile(path.join(__dirname, '/../login/login.html'));
// });

// Information host submits for game (name, stack, bb, sb)
// app.post('/session', (req, res) => {
//     //scheme to ensure valid username
//     const schema = Joi.object({
//         username: Joi.string().alphanum().min(2).max(30)
//     });
//     const { error, value } = schema.validate({ username: req.body.name });
//     if (error){
//         res.status(422);
//         res.json({
//             isValid: false,
//             message: error.details[0].message
//         });
//     } else {
//         let sid = shortid.generate();
//         req.body.shortid = sid;
//         req.body.isValid = true;
//         res.json(req.body);
//         console.log(`starting new table with id: ${sid}`);
//         s.createNewTable(sid, req.body.smallBlind, req.body.bigBlind, req.body.name, req.body.stack);
//     }
// });

// // //login page for host
// // note: removing the ? makes id necessary (not optional)
// app.get('/session/:id', (req, res) => {
//     // console.log(req.params.id);
//     res.sendFile(path.join(__dirname, '/../public/game.html'));
// });

// let playerids = {}

// io.on('connection', function (socket) {
//     console.log('a user connected at', socket.id);

//     socket.on('chat', (data) => {
//         // console.log(data);
//         //recieving message from socket and emmitting it back to all sockets
//         io.sockets.emit('chat', data);
//     });

//     socket.on('typing', (handle) => {
//         // console.log(handle);
//         // bradcast = everyone gets it but the sender
//         socket.broadcast.emit('typing', handle);
//     });
// });