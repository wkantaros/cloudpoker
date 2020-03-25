// Dependencies
let express = require('express');
let http = require('http');
let path = require('path');
let socketIO = require('socket.io'); 
let app = express();
app.set('port', 5000);
let server = http.Server(app);

// app.use('/static', express.static(__dirname + '/static'));
// app.use(express.static('public'));
app.use(express.static(__dirname + '/public'));

// Routing
app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname, 'index.html'));
});

// Starts the server.
server.listen(5000, function () {
    console.log('Starting server on port 5000');
});

// Starts the server.
// let server = app.listen(5000, function () {
//     console.log('Starting server on port 5000');
// });

//socket setup
let io = socketIO(server);
// Add the WebSocket handlers

io.on('connection', (socket) => { // this is setting up the socket on the server
    console.log('made socket connection', socket.id);

    socket.on('chat', (data) => {
        console.log(data);
        //recieving message from socket and emmitting it back to all sockets
        io.sockets.emit('chat', data);
    });

    socket.on('typing', (handle) => {
        console.log(handle);
        // bradcast = everyone gets it but the sender
        socket.broadcast.emit('typing', handle);
    });

});

// setInterval(function () {
//     io.sockets.emit('message', 'hi!');
// }, 1000);