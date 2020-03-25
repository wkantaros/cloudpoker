// Make connection
// this is running on the frontend 
let socket = io.connect('http://localhost:5000');

// Query DOM
let name = document.getElementById('name'),
    bet_size = document.getElementById('bet-size'),
    bet_btn = document.getElementById('bet'),
    check_btn = document.getElementById('check'),
    fold_btn = document.getElementById('fold'),
    send_btn = document.getElementById('send'),
    handle = document.getElementById('handle'),
    message = document.getElementById('message'),
    message_output = document.getElementById('chat-output'),
    feedback = document.getElementById('feedback');
    //  feedback = document.getElementById('feedback');

//Emit events
bet_btn.addEventListener('click', function(){
    socket.emit('bet', {
        name: name.value,
        message: message.value,
        bet_size: bet_size.value 
    });
});

//send the contents of the message to the server
send_btn.addEventListener('click', function(){
    socket.emit('chat', {
        handle: handle.value,
        message: message.value,
        // output: bet_size.value 
    });
});

//let the server know somebody is typing a message
message.addEventListener('keypress', function(){
    socket.emit('typing', handle.value);
});

//Listen for events
socket.on('chat', function (data) {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><strong>' + data.handle + ': </strong>' + data.message + '</p>';
});

socket.on('typing', function (handle) {
    feedback.innerHTML = '<p><em>' + handle + ' is writing a message...</em></p>';
    message_output.innerHTML += '<p><strong>' + data.handle + ': </strong>' + data.message + '</p>';
});