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
    fold = document.getElementById('fold'),
    minBet = document.getElementById('min-bet');
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
            $('#start').hide();
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
    // let popup = document.getElementById("buyin-info");
    // if (!loggedIn) {
    //     popup.classList.add("show");
    // } 
    socket.emit('leave-game', {
        id: socket.id,
        amount: 0
    });

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
$('#bet').on('click', () => {
    console.log('here!');
    $('#myPopup1').toggleClass('show');
})

$('#bet-amount').keyup(function (e) {
    if (e.keyCode == 13) {
        console.log('bet');
        console.log(parseInt($('#bet-amount').val()))
        socket.emit('action', {
            id: socket.id,
            amount: parseInt($('#bet-amount').val()),
            action: 'bet'
        });
        $('#bet').click();
    }
});

start_btn.addEventListener('click', () => {
    console.log('starting game');
    socket.emit('start-game', {
        id: socket.id,
        amount: 0
    });
});

call.addEventListener('click', () => {
    console.log('call');
    socket.emit('action', {
        id: socket.id,
        amount: 0,
        action: 'call'
    });
});

check.addEventListener('click', () => {
    console.log('check');
    socket.emit('action', {
        id: socket.id,
        amount: 0,
        action: 'check'
    });
});

fold.addEventListener('click', () => {
    console.log('fold');
    socket.emit('action', {
        id: socket.id,
        amount: 0,
        action: 'fold'
    });
});

minBet.addEventListener('click', () => {
    console.log('min bet');
    console.log(parseInt($('#bb').html()))
    socket.emit('action', {
        id: socket.id,
        amount: parseInt($('#bb').html()),
        action: 'bet'
    });
});

$(".volume").click( function (e) {
    if ($('.volume').hasClass('on')){
        $('#volume-icon').attr('src', "../public/img/mute.svg");
        $('.volume').removeClass('on');
    } else {
        $('#volume-icon').attr('src', "../public/img/volume.svg");
        $('.volume').addClass('on');
    }
} );

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

// have start game button for mod
socket.on('mod-abilities', (data) => {
    $('#quit-btn').removeClass('hidden');
    $('#start').removeClass('hidden');
    $('#buyin').hide();
})

//incoming chat
socket.on('chat', (data) => {
    let date = new Date;
    let minutes = (date.getMinutes() < 10) ? `0${date.getMinutes()}` : `${date.getMinutes()}`;
    let time = `${date.getHours()}:${minutes} ~ `
    feedback.innerHTML = '';
    message_output.innerHTML += '<p>' + time + '<strong>' + data.handle + ': </strong>' + data.message + '</p>';
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

//somebody left the game
socket.on('buy-out', (data) => {
    feedback.innerHTML = '';
    message_output.innerHTML += `<p><em> ${data.playerName} has left the game (finishing stack: ${data.stack})</p>`;
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
    // if ($('.volume').hasClass('on')) {
    //     createjs.Sound.play('fold');
    // }
    // outHand(data.seat);
    $(`#${data.seat}`).addClass('out');
});


// render players at a table
socket.on('render-players', (data) => {
    for (let i = 0; i < data.length; i++){
        let hand = document.getElementById(data[i].seat);
        hand.classList.remove('hidden');
        hand.querySelector('.username').innerHTML = data[i].playerName;
        hand.querySelector('.stack').innerHTML = data[i].stack;
        if (data[i].waiting){
            $(`#${data[i].seat}`).find('.back-card').addClass('waiting');
        }
    }
});

// makes all the cards gray
socket.on('waiting', (data) => {
    for (let i = 0; i < 10; i++){
        outHand(i);
    }
});

// removes old players (that have busted or quit)
socket.on('remove-out-players', (data) => {
    console.log('has out class!!');
    $('.out').addClass('hidden').removeClass('out');
    // $(`#${data[i].seat}`).removeClass('hidden');
});

// renders the board (flop, turn, river)
socket.on('render-board', (data) => {
    $('.player-bet').html(0);
    $('.player-bet').addClass('hidden');
    if (data.street == 'deal'){
        $('#flop').addClass('hidden');
        $('#turn').addClass('hidden');
        $('#river').addClass('hidden');
        $('#cards').find('.back-card').removeClass('hidden');
        $('#cards').find('.card-topleft').addClass('hidden');
        $('#cards').find('.card-bottomright').addClass('hidden');
        if ($('.volume').hasClass('on') && data.sound){
            createjs.Sound.play('deal');
        }
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
        if ($('.volume').hasClass('on')){
            createjs.Sound.play('flop');
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
        if ($('.volume').hasClass('on')){
            createjs.Sound.play('turn');
        }
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
        // if ($('.volume').hasClass('on')){
        //     createjs.Sound.play('river');
        // }
        flipCard('river');
    }
});

// renders a players hand
socket.on('render-hand', (data) => {
    console.log(data.cards);
    renderHand(data.seat, data.cards);
});

// removes the waiting tag from player
socket.on('game-in-progress', (data) => {
    console.log(data.waiting);
    if (!data.waiting) $('.back-card').removeClass('waiting');
});

// updates stack when a bet is placed, for example
socket.on('update-stack', (data) => {
    let hand = document.getElementById(data.seat);
    hand.querySelector('.stack').innerHTML = data.stack;
});

// updates pot at beginning of each new street
socket.on('update-pot', (data) => {
    if (data.amount) {
        $('#pot-amount').html(data.amount);
    } else {
        $('#pot-amount').empty();
    }
});

// start game (change all cards to red)
socket.on('start-game', (data) => {
    $('.back-card').removeClass('waiting');
    loadSounds();
    $('#start').hide();
});

// changes that person to the person who has the action
socket.on('action', (data) => {
    $('.name').removeClass('action');
    $(`#${data.seat} > .name`).addClass('action');
});

// adds dealer chip to seat of dealer
socket.on('new-dealer', (data) => {
    $('.dealer').remove();
    if (data.seat != -1){
        $(`#${data.seat} > .name`).append('<span class="dealer">D</span>');
    }
});

// changes color of players not in last hand to red (folded, buying in, etc)
// also flips hands back to red if they werent
socket.on('nobody-waiting', (data) => {
    inHand();
});

// calls
socket.on('call', (data) => {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><em>' + data.username + ' calls</em></p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
    if ($('.volume').hasClass('on')){
        createjs.Sound.play('bet');
    }
    $('.player-bet').eq(data.seat).html(data.amount);
    $('.player-bet').eq(data.seat).removeClass('hidden');
});

// check
socket.on('check', (data) => {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><em>' + data.username + ' checks</em></p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
    if ($('.volume').hasClass('on')){
        createjs.Sound.play('check');
    }
});

// fold
socket.on('fold', (data) => {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><em>' + data.username + ' folds</em></p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
    if ($('.volume').hasClass('on')){
        createjs.Sound.play('fold');
    }
    outHand(data.seat);
});

// bet
socket.on('bet', (data) => {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p><em>' + data.username + ' bets ' + data.amount + '</em></p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
    if ($('.volume').hasClass('on')){
        createjs.Sound.play('bet');
    }
    let prevAmount = parseInt($('.player-bet').eq(data.seat).html());
    $('.player-bet').eq(data.seat).html(data.amount + prevAmount);
    $('.player-bet').eq(data.seat).removeClass('hidden');
});

//showdown
socket.on('showdown', function (data) {
    for (let i = 0; i < data.length; i++) {
        renderHand(data[i].seat, data[i].hand.cards);
        feedback.innerHTML = '';
        message_output.innerHTML += `<p>${data[i].playerName} wins a pot of ${data[i].amount}! ${data[i].hand.message}: ${data[i].hand.cards} </p>`;
        $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
        showWinnings(data[i].amount, data[i].seat);
    }
});

//folds-through
socket.on('folds-through', function (data) {
    feedback.innerHTML = '';
    message_output.innerHTML += `<p>${data.username} wins a pot of ${data.amount}</p>`;
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
    showWinnings(data.amount, data.seat);
});

//remove earnings span from previous hand
socket.on('clear-earnings', function (data) {
    $('.earnings').empty();
    $('.earnings').addClass('hidden');
});

// user's action (alert with sound)
socket.on('players-action', function(data){
    if ($('.volume').hasClass('on')){
        createjs.Sound.play('action');
    }
});

// user's action (alert with sound)
socket.on('initial-bets', function(data){
    console.log(data);
    let seats = data.seats;
    for (let i = 0; i < seats.length; i++){
        $('.player-bet').eq(seats[i].seat).html(seats[i].bet);
        $('.player-bet').eq(seats[i].seat).removeClass('hidden');
    }
});

//helper functions--------------------------------------------------------------------------------
const loadSounds = () => {
    createjs.Sound.registerSound("../public/audio/fold1.wav", 'fold');
    createjs.Sound.registerSound("../public/audio/deal.wav", 'deal');
    createjs.Sound.registerSound("../public/audio/check.wav", 'check');
    createjs.Sound.registerSound("../public/audio/chipsStack4.wav", 'bet');
    createjs.Sound.registerSound("../public/audio/flop.wav", 'flop');
    createjs.Sound.registerSound("../public/audio/turn.wav", 'turn');
    createjs.Sound.registerSound("../public/audio/cardPlace1.wav", 'river');
    createjs.Sound.registerSound("../public/audio/action.ogg", 'action');
    createjs.Sound.volume = 0.25;
}

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
    }, 250);
}

const outHand = (seat) => {
    $(`#${seat}`).find('.back-card').removeClass('hidden').addClass('waiting');
    $(`#${seat} > .left-card > .card`).removeClass('black').addClass('black');
    $(`#${seat} > .left-card`).find('.card-corner-rank').html('A');
    $(`#${seat} > .left-card`).find('.card-corner-suit').html('S');
    $(`#${seat} > .right-card > .card`).removeClass('black').addClass('black');
    $(`#${seat} > .right-card`).find('.card-corner-rank').html('A');
    $(`#${seat} > .right-card`).find('.card-corner-suit').html('S');
    $(`#${seat}`).find('.card-topleft').addClass('hidden');
    $(`#${seat}`).find('.card-bottomright').addClass('hidden');
}

const inHand = () => {
    $('.hand').find('.back-card').removeClass('waiting');
    $('.hand').find('.back-card').removeClass('waiting');
    $('.card').removeClass('red').addClass('black');
    $('.card-corner-rank').html('A');
    $('.card-corner-suit').html('S');
    $('.card-topleft').addClass('hidden');
    $('.card-bottomright').addClass('hidden');
    $('.back-card').removeClass('hidden');
}

const renderHand = (seat, cards) => {
        let leftCardRank = cards[0].charAt(0);
        let leftCardSuit = getSuitSymbol(cards[0].charAt(1));
        let leftCardColor = getColor(cards[0].charAt(1));
        let rightCardRank = cards[1].charAt(0);
        let rightCardSuit = getSuitSymbol(cards[1].charAt(1));
        let rightCardColor = getColor(cards[1].charAt(1));
        $(`#${seat}`).find('.back-card').addClass('hidden');
        $(`#${seat} > .left-card > .card`).removeClass('black').addClass(leftCardColor);
        $(`#${seat} > .left-card`).find('.card-corner-rank').html(leftCardRank);
        $(`#${seat} > .left-card`).find('.card-corner-suit').html(leftCardSuit);
        $(`#${seat} > .right-card > .card`).removeClass('black').addClass(rightCardColor);
        $(`#${seat} > .right-card`).find('.card-corner-rank').html(rightCardRank);
        $(`#${seat} > .right-card`).find('.card-corner-suit').html(rightCardSuit);
        $(`#${seat}`).find('.card-topleft').removeClass('hidden');
        $(`#${seat}`).find('.card-bottomright').removeClass('hidden');
}

const hideHand = (seat) => {
    $(`#${seat}`).find('.back-card').removeClass('hidden');
    $(`#${seat} > .left-card > .card`).removeClass('black').addClass('black');
    $(`#${seat} > .left-card`).find('.card-corner-rank').html('A');
    $(`#${seat} > .left-card`).find('.card-corner-suit').html('S');
    $(`#${seat} > .right-card > .card`).removeClass('black').addClass('black');
    $(`#${seat} > .right-card`).find('.card-corner-rank').html('A');
    $(`#${seat} > .right-card`).find('.card-corner-suit').html('S');
    $(`#${seat}`).find('.card-topleft').addClass('hidden');
    $(`#${seat}`).find('.card-bottomright').addClass('hidden');
}

const showWinnings = (winnings, seat) => {
    console.log('show winnings');
    console.log(winnings);
    console.log(seat);
    $(`#${seat}`).find('.earnings').html(`+${winnings}`);
    $(`#${seat}`).find('.earnings').removeClass('hidden');
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

function createBets() {
    $('.player-bet').remove();
    var table = $('#table');
    for (var i = 0; i < 10; i++) {
        $('<div/>', {
            'class': 'player-bet hidden',
            'text': 69
        }).appendTo(table);
    }
}

function distributeBets() {
    var radius = 175;
    let betFields = $('.player-bet'),
        table = $('.ovalparent'),
        width = table.width(),
        height = table.height(),
        angle = 0,
        step = (2 * Math.PI) / betFields.length;
    console.log(width);
    betFields.each(function () {
        // note consider changing width/455 to 2.5
        var x = Math.round(width / 2 + radius * ((width/450) * Math.cos(angle)) - $(this).width() / 2) - 20;
        var y = Math.round(height / 2 + radius * (1 * Math.sin(angle)) - $(this).height() / 2) - 10;
        // if (window.console) {
        //     console.log($(this).text(), x, y);
        // }
        $(this).css({
            left: x + 'px',
            top: y + 'px'
        }); angle += step;
        // this.append(document.getElementsByName('1')[0]);
    });
}

createHands();
distributeHands(true);
createBets();
distributeBets();

$(window).resize(function () {
    // createHands();
    distributeHands(false);
    distributeBets();
});
