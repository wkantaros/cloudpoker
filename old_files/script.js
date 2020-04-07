// Make connection
// this is running on the frontend 
let socket = io();
// let socket = io.connect('https://50b7f33e.ngrok.io/game');
// let socket = io.connect('https://51fe5dd4.ngrok.io');
// let socket = io.connect('http://localhost:6912');

// Query DOM
let name = document.getElementById('name'),
    stack = document.getElementById('stack'),
    poker_output = document.getElementById('poker-output'),
    update_btn = document.getElementById('update'),
    bet_size = document.getElementById('bet-size'),
    bet_btn = document.getElementById('bet'),
    check_btn = document.getElementById('check'),
    call_btn = document.getElementById('call'),
    fold_btn = document.getElementById('fold'),
    send_btn = document.getElementById('send'),
    message = document.getElementById('message'),
    message_output = document.getElementById('chat-output'),
    feedback = document.getElementById('feedback'),
    poker_feedback = document.getElementById('poker-feedback'),
    start_game = document.getElementById('start-game');

//Emit events
// poker functions--------------------------------------------------------------------------------
// login function
let loggedIn = false;
update_btn.addEventListener('click', () => {
    if (loggedIn){
        socket.emit('buy-out', {
            id: socket.id,
            name: name.value,
            stack: stack.value
        });
        stack.readOnly = false;
        name.readOnly = false;
        stack.value = null;
        name.value = null;
        update_btn.innerHTML = 'Join';
        loggedIn = false;
    }
    else {
        if (!parseInt(stack.value)){
            alert("Please enter a valid stack size");
            stack.value = null;
        }
        else {
            stack.readOnly = true;
            name.readOnly = true;
            update_btn.innerHTML = 'Quit';
            loggedIn = true;
            socket.emit('buy-in', {
                id: socket.id,
                name: name.value,
                stack: parseInt(stack.value)
            });
        }
    }
});

start_game.addEventListener('click', () => {
    socket.emit('start-game', {
        id: socket.id
    });
});


// bet function
bet_btn.addEventListener('click', () => {
    if (!parseInt(bet_size.value)){
        alert("please enter valid bet size");
    } else {
        socket.emit('bet', {
            username: name.value,
            amount: parseInt(bet_size.value)
        });
    }
});

// check functions
check_btn.addEventListener('click', () => {
    socket.emit('check', {
        username: name.value
    });
});

// call function
call_btn.addEventListener('click', () => {
    socket.emit('call', {
        username: name.value,
    });
});

// fold functions
fold_btn.addEventListener('click', () => {
    socket.emit('fold', {
        username: name.value
    });
});

//chat room functions-----------------------------------------------------------------------------
//send the contents of the message to the server
send_btn.addEventListener('click', () => {
    socket.emit('chat', {
        handle: name.value || 'guest',
        message: message.value,
    });
    message.value = null;
});

//allow user to send message with enter key
message.addEventListener("keyup", (event) => {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
        event.preventDefault();
        // if ()
        send_btn.click();
    }
});

//allow user to start writing message with m key
document.addEventListener("keyup", (event) => {
    if (event.keyCode === 77) {
        // event.preventDefault();
        // message.select();
    }
});

//let the server know somebody is typing a message
message.addEventListener('keypress', () => {
    socket.emit('typing', name.value || 'guest');
});

//Listen for events--------------------------------------------------------------------------------
//incoming chat
socket.on('chat', function (data) {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><strong>' + data.handle + ': </strong>' + data.message + '</p>';
});

//somebody is typing
socket.on('typing', function (data) {
    feedback.innerHTML = '<p><em>' + data + ' is writing a message...</em></p>';
});

//action to you
socket.on('action', function (data) {
    poker_feedback.innerHTML = '<p><em>action to you!</em></p>';
});

//somebody joined the game
socket.on('buy-in', function (data) {
    // poker_feedback.innerHTML = '';
    poker_output.innerHTML += `<p><em> ${data.name} has joined the game (starting stack: ${data.stack})</p>`;
});

//somebody left the game
socket.on('buy-out', function (data) {
    // poker_feedback.innerHTML = '';
    poker_output.innerHTML += `<p><em> ${data.name} has left the game (finishing stack: ${data.stack})</p>`;
});

//game starts
socket.on('start-hand', (data) => {
    // console.log(data);
    poker_output.innerHTML += `<p><strong>Your Hand:</strong> ${data.cards[0]}, ${data.cards[1]} (Stack: ${data.stack})</p>`;
});

//a player checks
socket.on('check', function (data) {
    poker_feedback.innerHTML = '';
    poker_output.innerHTML += `<p>${data.username} (Pot: ${data.pot}, Stack: ${data.stack}) checks</p>`;
});

//a player calls
socket.on('call', function (data) {
    poker_feedback.innerHTML = '';
    poker_output.innerHTML += `<p>${data.username} (Pot: ${data.pot}, Stack: ${data.stack}) calls</p>`;
});

//a player bets
socket.on('bet', function (data) {
    poker_feedback.innerHTML = '';
    poker_output.innerHTML += `<p>${data.username} (Pot: ${data.pot}, Stack: ${data.stack}) bets ${data.amount}</p>`;
});

//a player folds
socket.on('fold', function (data) {
    poker_feedback.innerHTML = '';
    poker_output.innerHTML += `<p>${data.username} (Pot: ${data.pot}, Stack: ${data.stack}) folds</p>`;
});

//show new card
socket.on('display-board', function (data) {
    // poker_feedback.innerHTML = '';
    poker_output.innerHTML += `<p><strong> ${data.street}</strong>: ${data.board}</p>`;
});

//update player's stack
socket.on('update-stack', function (data) {
    stack.value = data.stack;
});

//showdown
socket.on('showdown', function (data) {
    for (let i = 0; i < data.length; i++){
        poker_output.innerHTML += `<p>${data[i].playerName} wins a pot of ${data[i].amount}! ${data[i].hand.message}: ${data[i].hand.cards} </p>`;
    }
    poker_feedback.innerHTML = '';
});

//folds-through
socket.on('folds-through', function (data) {
    poker_feedback.innerHTML = '';
    poker_output.innerHTML += `<p>${data.username} wins a pot of ${data.amount}</p>`;
});

//start-hand
socket.on('new-hand', function (data) {
    poker_feedback.innerHTML = '';
    poker_output.innerHTML += `<p><strong>New Hand!</strong></p>`;
});


// need to instantiate a list of id's when user is created
// need to 