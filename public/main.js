let socket = io();

let host = document.getElementById('host'),
    send_btn = document.getElementById('send'),
    message = document.getElementById('message'),
    message_output = document.getElementById('chat-output'),
    feedback = document.getElementById('feedback'),
    newPlayer = document.getElementById('new-playerName'),
    newStack = document.getElementById('new-stack'),
    buyinSubmit = document.getElementById('buyin-btn'),
    buyin = document.getElementById('buyin'),
    quit = document.getElementById('quit-btn'),
    start_btn = document.getElementById('start');
    // standup = document.getElementById('standup-btn');


//header functions--------------------------------------------------------------------------------
let loggedIn = false;
buyinSubmit.addEventListener('click', () => {
    if (loggedIn) {
        console.log('quits');
        socket.emit('buy-out', {
            id: socket.id,
            name: newPlayer.value,
            stack: newStack.value
        });
        document.getElementById('txt').innerHTML = 'Join Game';
        loggedIn = false;
    } else {
        if (!parseInt(newStack.value) || !newPlayer.value) {
            alert("Please enter valid information");
            // newStack.value = null;
            // newPlayer.value = null;
        } else {
            document.getElementById('txt').innerHTML = 'Game joined!';
            socket.emit('buy-in', {
                id: socket.id,
                playerName: newPlayer.value,
                stack: parseInt(newStack.value)
            });
            let popup = document.getElementById("buyin-info");
            console.log(popup);
            popup.classList.remove("show");
            loggedIn = true;
            quit.classList.remove("hidden");
            // standup.classList.remove("hidden");
            // buyin.classList.add("hidden");
        }
    }
});

buyin.addEventListener('click', () => {
    let popup = document.getElementById("buyin-info");
    if (!loggedIn) {
        console.log(popup);
        popup.classList.add("show");
    } 
})

quit.addEventListener('click', () => {
    let popup = document.getElementById("buyin-info");
    if (!loggedIn) {
        console.log(popup);
        popup.classList.add("show");
    } 
})
// let myFunction = () => {
//     let popup = document.getElementById("buyin-info");
//     console.log(popup);
//     // popup.classList.toggle("show");
//     if (!loggedIn) popup.classList.add("show");
//     // var buyinbtn = document.getElementById('buyin-btn')
// }

let copyLink = () => {
    copyStringToClipboard(window.location.href);
    let link = document.getElementById('getLink');
    console.log(link.innerHTML);
    link.innerHTML = 'link copied!';
    setTimeout(() => {
        link.innerHTML = 'get sharable link'
    }, 2000);
}

function copyStringToClipboard(str) {
    // Create new element
    var el = document.createElement('textarea');
    // Set value (string to be copied)
    el.value = str;
    // Set non-editable to avoid focus and move outside of view
    el.setAttribute('readonly', '');
    el.style = {
        position: 'absolute',
        left: '-9999px'
    };
    document.body.appendChild(el);
    // Select text inside element
    el.select();
    // Copy text to clipboard
    document.execCommand('copy');
    // Remove temporary element
    document.body.removeChild(el);
}

//action buttons ---------------------------------------------------------------------------------

start_btn.addEventListener('click', () => {
    console.log('starting game');
    socket.emit('start-game', {
        id: socket.id
    });
});

//chat room functions-----------------------------------------------------------------------------
//send the contents of the message to the server
send_btn.addEventListener('click', () => {
    // console.log(name.getElementsByClassName('username')[0].innerHTML);
    // console.log(name.innerText);
    socket.emit('chat', {
        handle: me.getElementsByClassName('username')[0].innerHTML || 'guest',
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
    socket.emit('typing', me.getElementsByClassName('username')[0].innerHTML || 'guest');
});

//Listen for events--------------------------------------------------------------------------------
//incoming chat
socket.on('chat', (data) => {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><strong>' + data.handle + ': </strong>' + data.message + '</p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
});

//somebody is typing
socket.on('typing', (data) => {
    feedback.innerHTML = '<p><em>' + data + ' is writing a message...</em></p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
});

// player buys in
socket.on('buy-in', (data) => {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><em>' + data.playerName + ' buys in for ' + data.stack +'</em></p>';
});

// render players at a table
socket.on('render-players', (data) => {
    for (let i = 0; i < data.length; i++){
        let hand = document.getElementById(data[i].seat);
        hand.classList.remove('hidden');
        hand.querySelector('.username').innerHTML = data[i].playerName;
        hand.querySelector('.stack').innerHTML = data[i].stack;
        console.log(hand.querySelector('.username'));
        console.log(hand.querySelector('.stack'));
    }
});

//helper functions--------------------------------------------------------------------------------
const cleanInput = (input) => {
    return $('<div/>').text(input).html();
}

//add hands (for sure a cleaner way to do but will work for now) ---------------------------------
function createHands() {
    $('.field').remove();
    var table = $('#table');
    for (var i = 0; i < 10; i++) {
        $('<div/>', {
            'class': 'field',
            'text': i + 1
        }).appendTo(table);
    }
}

function distributeHands(firstRender) {
    var radius = 200;
    let fields = $('.field'),
        table = $('.ovalparent'),
        width = table.width(),
        height = table.height(),
        angle = 0,
        step = (2 * Math.PI) / fields.length;
    fields.each(function () {
        var x = Math.round(width / 2 + radius * (2.5 * Math.cos(angle)) - $(this).width() / 2);
        var y = Math.round(height / 2 + radius * (1.25 * Math.sin(angle)) - $(this).height() / 2);
        // if (window.console) {
        //     console.log($(this).text(), x, y);
        // }
        $(this).css({
            left: x + 'px',
            top: y + 'px'
        }); angle += step;
        // this.append(document.getElementsByName('1')[0]);
    });
    if (firstRender){
        for (let i = 0; i < 10; i++) {
            let position = document.getElementsByClassName('field')[i]
            let hand = document.getElementsByClassName(i)[0];
            // console.log(position);
            // console.log(hand.innerHTML);
            position.innerHTML = `<div class="hand hidden" id="${i}"> ${hand.innerHTML} </div>`;
            hand.remove();
        }
    }
}

createHands();
distributeHands(true);

$(window).resize(function () {
    // createHands();
    distributeHands(false);
});
