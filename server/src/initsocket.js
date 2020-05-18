const socketIO = require('socket.io');
let sio;
function initializeSocket(server) {
    sio = socketIO(server);
}
function setSio(s) {
    module.exports.sio = s;
}
module.exports.setSio = setSio;
// module.exports.initializeSocket = initializeSocket;
module.exports.sio = sio;