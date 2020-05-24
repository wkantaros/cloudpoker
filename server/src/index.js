const path = require('path');
require('dotenv').config({path: path.join(__dirname, '../../.env')});
const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIO = require('socket.io');

// // if you ever want to do the https stuff through express (rather than nginx, or whatever) uncomment this
// var https = require('https');
// var fs = require('fs');

// var options = {
//     cert: fs.readFileSync(__dirname + '/cert/cloudpoker_io.crt'),
//     ca: fs.readFileSync(__dirname + '/cert/cloudpoker_io.ca-bundle'),
//     key: fs.readFileSync(__dirname + '/cert/example_com.key')
// };

//instantiate server
const app = express();
const port = process.env.PORT || 8080;
app.set('port', port);

const server = http.createServer(app);
// const server = https.createServer(options, app);

//socket setup
let io = socketIO(server);
app.set('socketio', io);

//ejs
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

//middleware
app.use(cors());
app.use(express.json());
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