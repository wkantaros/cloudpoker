require('dotenv').config();
require("regenerator-runtime/runtime");
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

//ejs
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//middleware
app.use(cors());
app.use(express.json());
app.use('/public', express.static(__dirname + '/../../public'));
app.use('/client', express.static(__dirname + '/../../client'));
app.use('/sharedjs', express.static(__dirname + '/sharedjs'));

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

// 404 pages
app.use(function (req, res) {
    res.status(404).render('pages/404');
});