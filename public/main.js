let socket = io();

let name = document.getElementById('me'),
    send_btn = document.getElementById('send'),
    message = document.getElementById('message'),
    message_output = document.getElementById('chat-output'),
    feedback = document.getElementById('feedback');


//header functions--------------------------------------------------------------------------------
function myFunction() {
    var popup = document.getElementById("buyin");
    // popup.classList.toggle("show");
    popup.classList.add("show");
    var buyinbtn = document.getElementById('buyin-btn')
    buyinbtn.addEventListener('click', () => {
        popup.classList.remove("show");
    })
}
//chat room functions-----------------------------------------------------------------------------
//send the contents of the message to the server
send_btn.addEventListener('click', () => {
    console.log(name.innerText);
    socket.emit('chat', {
        handle: name.innerText || 'guest',
        message: message.value,
    });
    message.value = null;
});

//allow user to send message with enter key
message.addEventListener("keyup", (event) => {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
        if (message.value) {
            event.preventDefault();
            send_btn.click();
        }
    }
});

//let the server know somebody is typing a message
message.addEventListener('keypress', () => {
    socket.emit('typing', name.innerText || 'guest');
});

//Listen for events--------------------------------------------------------------------------------
//incoming chat
socket.on('chat', function (data) {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><strong>' + data.handle + ': </strong>' + data.message + '</p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
});

//somebody is typing
socket.on('typing', function (data) {
    feedback.innerHTML = '<p><em>' + data + ' is writing a message...</em></p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
});

//helper functions--------------------------------------------------------------------------------
const cleanInput = (input) => {
    return $('<div/>').text(input).html();
}