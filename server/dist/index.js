"use strict";

require('dotenv').config();

require("regenerator-runtime/runtime");

var express = require('express');

var http = require('http');

var path = require('path');

var cors = require('cors');

var socketIO = require('socket.io'); // const ejs = require('ejs');
//instantiate server


var app = express();
var port = 8080;
app.set('port', port);
var server = http.Server(app); //socket setup

var io = socketIO(server);
app.set('socketio', io); //ejs

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs'); //middleware

app.use(cors());
app.use(express.json());
app.use('/public', express["static"](__dirname + '/../public'));
app.use('/sharedjs', express["static"](__dirname + '/../sharedjs')); //handling login

var loginRouter = require('./routes/login');

app.use(loginRouter); //handling sessions

var sessionRouter = require('./routes/session');

app.use('/session', sessionRouter); // Starts the server.

server.listen(port, function () {
  console.log("Starting server on port ".concat(port));
}); // 404 pages

app.use(function (req, res) {
  res.status(404).render('pages/404');
});