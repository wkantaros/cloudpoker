const socketIO = require('socket.io');
let sio;
function initializeSocket(server) {
    sio = socketIO(server);
}
module.exports.initializeSocket = initializeSocket;
module.exports.sio = sio;