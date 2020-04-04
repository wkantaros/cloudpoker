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
    start_btn = document.getElementById('start'),
    call = document.getElementById('call'),
    check = document.getElementById('check'),
    fold = document.getElementById('fold');
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
        popup.classList.add("show");
    } else {
        $('#buyin').remove();
    }
})

quit.addEventListener('click', () => {
    let popup = document.getElementById("buyin-info");
    if (!loggedIn) {
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

call.addEventListener('click', () => {
    console.log('call');
    socket.emit('call', {
        id: socket.id
    });
});

check.addEventListener('click', () => {
    console.log('check');
    socket.emit('check', {
        id: socket.id
    });
});

fold.addEventListener('click', () => {
    console.log('fold');
    socket.emit('fold', {
        id: socket.id
    });
});

//chat room functions-----------------------------------------------------------------------------
//send the contents of the message to the server
send_btn.addEventListener('click', () => {
    // console.log(name.getElementsByClassName('username')[0].innerHTML);
    // console.log(name.innerText);
    socket.emit('chat', {
        id: socket.id,
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
    }
});

// renders the board (flop, turn, river)
socket.on('render-board', (data) => {
    if (data.street == 'deal'){
        $('#flop').addClass('hidden');
        $('#turn').addClass('hidden');
        $('#river').addClass('hidden');
        $('#cards').find('.back-card').removeClass('hidden');
        $('#cards').find('.card-topleft').addClass('hidden');
        $('#cards').find('.card-bottomright').addClass('hidden');
    }
    else if (data.street == 'flop'){
        $('#flop').removeClass('hidden');
        for (let i = 0; i < 3; i++){
            let cardRank = data.board[i].charAt(0);
            let cardSuit = getSuitSymbol(data.board[i].charAt(1));
            let cardColor = getColor(data.board[i].charAt(1));
            $(`#flop .card:nth-child(${i+1})`).removeClass('black').addClass(cardColor);
            $(`#flop .card:nth-child(${i+1})`).find('.card-corner-rank').html(cardRank);
            $(`#flop .card:nth-child(${i+1})`).find('.card-corner-suit').html(cardSuit);
        }
        flipCard('flop');
    }
    else if (data.street == 'turn'){
        $('#turn').removeClass('hidden');
        let cardRank = data.board[3].charAt(0);
        let cardSuit = getSuitSymbol(data.board[3].charAt(1));
        let cardColor = getColor(data.board[3].charAt(1));
        $(`#turn .card`).removeClass('black').addClass(cardColor);
        $(`#turn .card`).find('.card-corner-rank').html(cardRank);
        $(`#turn .card`).find('.card-corner-suit').html(cardSuit);
        flipCard('turn');
    }
    else if (data.street == 'river'){
        $('#river').removeClass('hidden');
        let cardRank = data.board[4].charAt(0);
        let cardSuit = getSuitSymbol(data.board[4].charAt(1));
        let cardColor = getColor(data.board[4].charAt(1));
        $(`#river .card`).removeClass('black').addClass(cardColor);
        $(`#river .card`).find('.card-corner-rank').html(cardRank);
        $(`#river .card`).find('.card-corner-suit').html(cardSuit);
        flipCard('river');
    }
});

// renders a players hand
socket.on('render-hand', (data) => {
    console.log(data.cards);
    let leftCardRank = data.cards[0].charAt(0);
    let leftCardSuit = getSuitSymbol(data.cards[0].charAt(1));
    let leftCardColor = getColor(data.cards[0].charAt(1));
    let rightCardRank = data.cards[1].charAt(0);
    let rightCardSuit = getSuitSymbol(data.cards[1].charAt(1));
    let rightCardColor = getColor(data.cards[1].charAt(1));
    $(`#${data.seat}`).find('.back-card').addClass('hidden');
    $(`#${data.seat} > .left-card > .card`).removeClass('black').addClass(leftCardColor);
    $(`#${data.seat} > .left-card`).find('.card-corner-rank').html(leftCardRank);
    $(`#${data.seat} > .left-card`).find('.card-corner-suit').html(leftCardSuit);
    $(`#${data.seat} > .right-card > .card`).removeClass('black').addClass(rightCardColor);
    $(`#${data.seat} > .right-card`).find('.card-corner-rank').html(rightCardRank);
    $(`#${data.seat} > .right-card`).find('.card-corner-suit').html(rightCardSuit);
    $(`#${data.seat}`).find('.card-topleft').removeClass('hidden');
    $(`#${data.seat}`).find('.card-bottomright').removeClass('hidden');
});

// updates stack when a bet is placed, for example
socket.on('game-in-progress', (data) => {
    console.log(data.waiting);
    if (!data.waiting) $('.back-card').removeClass('waiting');
});

// updates stack when a bet is placed, for example
socket.on('update-stack', (data) => {
    let hand = document.getElementById(data.seat);
    hand.querySelector('.stack').innerHTML = data.stack;
});

// start game (change all cards to red)
socket.on('start-game', (data) => {
    $('.back-card').removeClass('waiting');
});

// changes that person to the person who has the action
socket.on('action', (data) => {
    $('.name').removeClass('action');
    $(`#${data.seat} > .name`).addClass('action');
});

// adds dealer chip to seat of dealer
socket.on('new-dealer', (data) => {
    $('.dealer').remove();
    $(`#${data.seat} > .name`).append('<span class="dealer">D</span>');
});

// calls
socket.on('call', (data) => {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><em>' + data.username + ' calls</em></p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
});

// check
socket.on('check', (data) => {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><em>' + data.username + ' checks</em></p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
});

// fold
socket.on('fold', (data) => {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><em>' + data.username + ' folds</em></p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
});

//updates pot
socket.on('update-pot', (data) => {
    if (data.pot) {
        $('#pot-amount').html(data.pot);
    }
    else {
        $('#pot-amount').empty();
    }
});

//helper functions--------------------------------------------------------------------------------
const cleanInput = (input) => {
    return $('<div/>').text(input).html();
}

const getSuitSymbol = (input) => {
    const suits = '♠︎ ♥︎ ♣︎ ♦︎'.split(' ');
    const inputs = 'S H C D'.split(' ');
    for (let i = 0; i < 4; i++){
        if (inputs[i] == input) return suits[i];
    }
    return 'yikes';
}

const getColor = (input) => 'SC'.includes(input) ? 'black' : 'red'; 

const flipCard = (name) => {
    setTimeout(() => {
        $(`#${name}`).find('.back-card').addClass('hidden');
        $(`#${name}`).find('.card-topleft').removeClass('hidden');
        $(`#${name}`).find('.card-bottomright').removeClass('hidden');
    }, 500);
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
    console.log(width);
    fields.each(function () {
        // note consider changing width/455 to 2.5
        var x = Math.round(width / 2 + radius * ((width/400) * Math.cos(angle)) - $(this).width() / 2);
        var y = Math.round(height / 2 + radius * (1.30 * Math.sin(angle)) - $(this).height() / 2);
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
