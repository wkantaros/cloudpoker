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


//resize page (to fit)

var $el = $("#page-contents");
var elHeight = $el.outerHeight();
var elWidth = $el.outerWidth();

var $wrapper = $("#scaleable-wrapper");

$wrapper.resizable({
  resize: doResize
});

function doResize(event, ui) {
  
  var scale, origin;
    
  scale = Math.min(
    ui.size.width / elWidth,    
    ui.size.height / elHeight
  );
  
  $el.css({
    transform: "translate(-50%, -50%) " + "scale(" + scale + ")"
  });
  
}

var starterData = { 
  size: {
    width: $wrapper.width(),
    height: $wrapper.height()
  }
}
doResize(null, starterData);



//header functions--------------------------------------------------------------------------------
$(document).mouseup(function (e) {
    let buyinInfo = $('#buyin-info');
    let betConsole =$('#myPopup1');
    let raiseConsole =$('#myPopup2');

    // if the target of the click isn't the container nor a descendant of the container
    if (!buyinInfo.is(e.target) && buyinInfo.has(e.target).length === 0) {
        buyinInfo.removeClass('show');
    }

    // if the target of the click isn't the container nor a descendant of the container
    if (!betConsole.is(e.target) && betConsole.has(e.target).length === 0) {
        betConsole.removeClass('show');
    }

    // if the target of the click isn't the container nor a descendant of the container
    if (!raiseConsole.is(e.target) && raiseConsole.has(e.target).length === 0) {
        raiseConsole.removeClass('show');
    }
});

let loggedIn = false;
$('#buyin').on('click', () => {
    if (!loggedIn)
        $('#buyin-info').addClass('show');
})

/**
 * logIn hides buyin-info ("Join Game") button in header and replaces it with the quit button
 */
const logIn = () => {
    loggedIn = true;
    $('#buyin-info').removeClass('show');
    $('#quit-btn').removeClass('collapse');
    $('#buyin').addClass('collapse');
};

const logOut = () => {
    loggedIn = false;
    $('#quit-btn').addClass('collapse');
    $('#buyin').removeClass('collapse');
}

$('#buyin-btn').on('click', () => {
    console.log('here!');
    regex = RegExp(/^\w+(?:\s+\w+)*$/);
    let playerName = newPlayer.value.trim();
    if (playerName.length < 2 || playerName.length > 10) {
        alert('name must be between 2 and 10 characters');
    } else if (!regex.test(playerName)){
        alert('no punctuation in username');
    } else if (playerName == 'guest'){
        alert("'guest' cannot be a username");
    } else if (alreadyExistingName(playerName)){
        alert('please enter a username that is not already at the table')
    } else if (!parseInt(newStack.value) && (parseInt(newStack.value) > 0)) {
        alert("Please enter valid stackinformation");
    } else {
        logIn();
        let playerName = newPlayer.value;
        let stack = parseInt(newStack.value);
        socket.emit('buy-in', {
            playerName: playerName,
            stack: stack
        });
    }
})

$('#buyin-info').keydown(function (e){
    e.stopPropagation();
})

quit.addEventListener('click', () => {
    socket.emit('leave-game', {
        amount: 0
    });
    logOut();
});

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
    let submit = !$('#bet-actions').hasClass('collapse');
    if (submit) {
        placeBet();
        $('#bet-actions').toggleClass('collapse');
        $('#back').toggleClass('collapse');
        $('#fold').toggleClass('collapse');
        $('#check').toggleClass('collapse');
        $('#min-bet').toggleClass('collapse');
        $('#c').toggleClass('collapse');
    } else {
        $('#bet-actions').toggleClass('collapse');
        $('#back').toggleClass('collapse');
        $('#fold').toggleClass('collapse');
        $('#check').toggleClass('collapse');
        $('#min-bet').toggleClass('collapse');
        $('#c').toggleClass('collapse');
        let slider = document.getElementById("betRange");
        let output = document.getElementById("bet-input-val");
        slider.value = output.value;
        output.focus();
        output.value = parseInt($('#bb').html()); // Display the default slider value
        slider.min = parseInt($('#bb').html());
        slider.max = parseInt($('.action > .stack').html());
        
        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function () {
            output.value = this.value;
            output.focus();
        } 
    }
})

$('#betplus').on('click', () => {
    let output = document.getElementById("bet-input-val");
    let bb = parseInt($('#bb').html());
    let maxval = parseInt($('.action > .stack').html());
    handleBetSliderButtons(Math.min(parseInt(output.value) + bb, maxval));
})

$('#betminus').on('click', () => {
    let output = document.getElementById("bet-input-val");
    let bb = parseInt($('#bb').html());
    handleBetSliderButtons(Math.max(parseInt(output.value) - bb, bb));

})

$('#bai').on('click', () => {
    handleBetSliderButtons(parseInt($('.action > .stack').html()));
})

$('#bp').on('click', () => {
    handleBetSliderButtons(getPotSize());
})

$('#btqp').on('click', () => {
    handleBetSliderButtons(Math.floor(3 * getPotSize() / 4));
})

$('#bhp').on('click', () => {
    handleBetSliderButtons(Math.floor(getPotSize() / 2));
})

$('#bqp').on('click', () => {
    handleBetSliderButtons(Math.max(Math.floor(getPotSize() / 4), parseInt($('#bb').html())));
})

$('#mb').on('click', () => {
    handleBetSliderButtons(parseInt($('#bb').html()));
})

let closingPreflopAction = false;
$('#back').on('click', () => {
    if (!$('#bet').hasClass('collapse')){
        $('#fold').toggleClass('collapse');
        $('#check').toggleClass('collapse');
        $('#min-bet').toggleClass('collapse');
        $('#bet-actions').toggleClass('collapse');
        $('#back').toggleClass('collapse');
        $('#c').toggleClass('collapse');
    }
    else if (!$('#raise').hasClass('collapse')){
        $('#fold').toggleClass('collapse');
        // TODO
        if (closingPreflopAction) {
            $('#check').toggleClass('collapse')
        } else {
            $('#call').toggleClass('collapse');
        }
        $('#raise-actions').toggleClass('collapse');
        $('#back').toggleClass('collapse');
        $('#c').toggleClass('collapse');
    }
})

$('#bet-input-val').keydown(function (e) {
    e.stopPropagation();
    // enter key
    if (e.keyCode == 13) {
        if (placeBet()) {
            $('#bet').click();
        }
    }
    // b key (back)
    if (event.keyCode === 66 && !$('#back').hasClass('collapse')) {
        $('#back').click();
    }
});

const handleBetSliderButtons = (outputVal) => {
    let slider = document.getElementById("betRange");
    let output = document.getElementById("bet-input-val");
    output.value = outputVal;
    slider.value = output.value;
    output.focus();
}

const handleRaiseSliderButtons = (outputVal) => {
    let slider = document.getElementById("raiseRange");
    let output = document.getElementById("raise-input-val");
    output.value = outputVal;
    slider.value = output.value;
    output.focus();
}

const placeBet = () => {
    console.log('bet');
    let betAmount = parseInt($('#bet-input-val').val());
    let minBetAmount = parseInt($('#bb').html());
    let maxBetAmount = parseInt($('.action > .stack').html());
    if (betAmount > maxBetAmount) {
        betAmount = maxBetAmount;
    }
    if (!betAmount || betAmount < minBetAmount) {
        alert(`minimum bet size is ${minBetAmount}`);
    } else {
        socket.emit('action', {
            amount: betAmount,
            action: 'bet'
        });
        return true;
    }
    return false;
}

// hacky global variable
$('#raise').on('click', () => {
    let submit = !$('#raise-actions').hasClass('collapse');
    if (submit) {
        placeRaise();
        $('#raise-actions').toggleClass('collapse');
        $('#back').toggleClass('collapse');
        $('#fold').toggleClass('collapse');
        if (closingPreflopAction) {
            $('#check').toggleClass('collapse')
        } else {
            $('#call').toggleClass('collapse');
        }
        $('#c').toggleClass('collapse');
    } else {
        $('#raise-actions').toggleClass('collapse');
        $('#back').toggleClass('collapse');
        $('#fold').toggleClass('collapse');
        closingPreflopAction = !$('#check').hasClass('collapse');
        if (closingPreflopAction) {
            $('#check').toggleClass('collapse')
        } else {
            $('#call').toggleClass('collapse');
        }
        $('#c').toggleClass('collapse');
        let slider = document.getElementById("raiseRange");
        let output = document.getElementById("raise-input-val");
        slider.value = output.value;
        output.focus();
        output.value = getMinRaiseAmount(); // Display the default slider value
        slider.min = getMinRaiseAmount();
        slider.max = parseInt($('.action > .stack').html());

        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function () {
            output.value = this.value;
            output.focus();
        }
    }
})

$('#raiseplus').on('click', () => {
    let output = document.getElementById("raise-input-val");
    let bb = parseInt($('#bb').html());
    let maxval = parseInt($('.action > .stack').html());
    handleRaiseSliderButtons(Math.min(parseInt(output.value) + bb, maxval));
})

$('#raiseminus').on('click', () => {
    let output = document.getElementById("bet-input-val");
    let bb = parseInt($('#bb').html());
    handleRaiseSliderButtons(Math.max(parseInt(output.value) - bb, getMinRaiseAmount()));

})

$('#rai').on('click', () => {
    handleRaiseSliderButtons(parseInt($('.action > .stack').html()));
})

$('#rthp').on('click', () => { 
    let valormr = Math.max(Math.floor(3 * getPotSize()), getMinRaiseAmount());
    let totalStack = parseInt($('.action > .stack').html());
    handleRaiseSliderButtons(Math.min(valormr, totalStack));
})

$('#rtp').on('click', () => {
    let valormr = Math.max(Math.floor(2 * getPotSize()), getMinRaiseAmount());
    let totalStack = parseInt($('.action > .stack').html());
    handleRaiseSliderButtons(Math.min(valormr, totalStack));
})

$('#rsqp').on('click', () => {
    let valormr = Math.max(Math.floor(6 * getPotSize() / 4), getMinRaiseAmount());
    let totalStack = parseInt($('.action > .stack').html());
    handleRaiseSliderButtons(Math.min(valormr, totalStack));
})

$('#rp').on('click', () => {
    let valormr = Math.max(Math.floor(getPotSize()), getMinRaiseAmount());
    let totalStack = parseInt($('.action > .stack').html());
    handleRaiseSliderButtons(Math.min(valormr, totalStack));
})

$('#mr').on('click', () => {
    // min raise or all in
    handleRaiseSliderButtons(Math.min(getMinRaiseAmount(), parseInt($('.action > .stack').html())));
})

$('#raise-input-val').keydown(function (e) {
    e.stopPropagation()
    if (e.keyCode == 13) {
        if (placeRaise()) {
            $('#raise').click();
        }
    }
    // b key (back)
    if (event.keyCode === 66 && !$('#back').hasClass('collapse')) {
        $('#back').click();
    }
});

let placeRaise = () => {
    console.log('raise');
    let raiseAmount = parseInt($('#raise-input-val').val());
    console.log(raiseAmount);
    let minRaiseAmount = getMinRaiseAmount();
    let maxRaiseAmount = parseInt($('.action > .stack').html());
    console.log(maxRaiseAmount);
    if (raiseAmount > maxRaiseAmount) {
        raiseAmount = maxRaiseAmount;
    }

    if (raiseAmount == maxRaiseAmount && maxRaiseAmount < minRaiseAmount) {
        console.log('all in player');
        socket.emit('action', {
            id: socket.id,
            amount: raiseAmount,
            action: 'call'
        });
        return true;
    } else if (!raiseAmount || raiseAmount < minRaiseAmount) {
        alert(`minimum raise amount is ${minRaiseAmount}`);
    } else if (raiseAmount == maxRaiseAmount) { // player is going all in
        console.log('all in mothafucka');
        socket.emit('action', {
            id: socket.id,
            amount: raiseAmount,
            action: 'bet'
        });
        return true;
    } else {
        socket.emit('action', {
            id: socket.id,
            amount: raiseAmount,
            action: 'raise'
        });
        return true;
    }
    return false;
}

start_btn.addEventListener('click', () => {
    console.log('starting game');
    socket.emit('start-game', {
        amount: 0
    });
});

call.addEventListener('click', () => {
    console.log('call');
    socket.emit('action', {
        amount: 0,
        action: 'call'
    });
});

check.addEventListener('click', () => {
    console.log('check');
    socket.emit('action', {
        amount: 0,
        action: 'check'
    });
});

fold.addEventListener('click', () => {
    console.log('fold');
    socket.emit('action', {
        amount: 0,
        action: 'fold'
    });
});

minBet.addEventListener('click', () => {
    console.log('min bet');
    console.log(parseInt($('#bb').html()))
    socket.emit('action', {
        amount: parseInt($('#bb').html()),
        action: 'bet'
    });
});

// keyboard shortcuts for all events
$(document).keydown(function (event) {
    // m key
    if (event.keyCode === 77) {
        event.preventDefault();
        message.select();
    }
    // k key (check)
    if (event.keyCode === 75 && !$('#check').hasClass('collapse')){
        check.click();
    }
    // c key (call)
    if (event.keyCode === 67 && !$('#call').hasClass('collapse')){
        call.click();
    }
    // c key (min bet)
    if (event.keyCode === 67 && !$('#min-bet').hasClass('collapse')){
        minBet.click();
    }
    // r key (raise)
    if (event.keyCode === 82 && !$('#raise').hasClass('collapse')){
        raise.click();
    }
    // r key (bet)
    if (event.keyCode === 82 && !$('#bet').hasClass('collapse')){
        bet.click();
    }
    // b key (back)
    if (event.keyCode === 66 && !$('#back').hasClass('collapse')){
        $('#back').click();
    }
    // f key (fold)
    if (event.keyCode === 70 && !$('#fold').hasClass('collapse')){
        console.log('here!!');
        fold.click();
    }
});

function isVolumeOn() {
    return $('.volume').hasClass('on');
}

$(".volume").click( function (e) {
    if (isVolumeOn()){
        $('#volume-icon').attr('src', "../public/img/mute.svg");
        $('.volume').removeClass('on');
    } else {
        $('#volume-icon').attr('src', "../public/img/volume.svg");
        $('.volume').addClass('on');
    }
} );


function playSoundIfVolumeOn(soundName) {
    if (isVolumeOn()){
        createjs.Sound.play(soundName);
    }
}

//chat room functions-----------------------------------------------------------------------------
//send the contents of the message to the server
send_btn.addEventListener('click', () => {
    // console.log(name.getElementsByClassName('username')[0].innerHTML);
    // console.log(name.innerText);
    socket.emit('chat', {
        message: message.value,
    });
    message.value = null;
});

//allow user to send message with enter key
message.addEventListener("keydown", (event) => {
    // Number 13 is the "Enter" key on the keyboard
    event.stopPropagation()
    if (event.keyCode === 13) {
        if (message.value) {
            $('#message').blur();
            event.preventDefault();
            send_btn.click();
        }
    }
});

//let the server know somebody is typing a message
message.addEventListener('keypress', () => {
    socket.emit('typing', socket.id);
});

//Listen for events--------------------------------------------------------------------------------

// add additional abilities for mod
socket.on('add-mod-abilities', (data) => {
    $('#quit-btn').removeClass('collapse');
    $('#buyin').addClass('collapse');
    $('#bomb-pot').removeClass('collapse');
});

socket.on('bust', (data) => {
    logOut();
    // remove additional abilities for mod when mod leaves
    if (data.removeModAbilities) {
        $('#bomb-pot').addClass('collapse');
        $('#start').addClass('collapse');
    }
});

// remove additional abilities for mod when mod leaves
socket.on('remove-mod-abilities', (data) => {
    $('#bomb-pot').addClass('collapse');
    $('#start').addClass('collapse');
});

//incoming chat
socket.on('chat', (data) => {
    let date = new Date;
    let minutes = (date.getMinutes() < 10) ? `0${date.getMinutes()}` : `${date.getMinutes()}`;
    let time = `${date.getHours()}:${minutes} ~ `;
    outputMessage(`<span class='info'>${time}${data.handle}</span> ${data.message}`);
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
    outputEmphasizedMessage(` ${data.playerName} has left the game (finishing stack: ${data.stack})`);
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
        } else if (data[i].betAmount <= 0) {
            hideBet(data[i].seat)
        } else if (data[i].betAmount > 0) {
            showBet(data[i].seat, data[i].betAmount);
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
    $('.out').each(function(){
        $(this).find('.username').text('guest');
        $(this).find('.stack').text('stack');
    })
    $('.out').addClass('hidden').removeClass('out');
    // if seat passed in remove it
    if (data.hasOwnProperty('seat')){
        $(`#${data.seat}`).addClass('hidden');
        $(`#${data.seat}`).find('.username').text('guest');
        $(`#${data.seat}`).find('.stack').text('stack');
    }
});

const showCard = (card, locator) => {
    let cardRank = card.charAt(0);
    let cardSuit = getSuitSymbol(card.charAt(1));
    let cardColor = getColor(card.charAt(1));
    $(locator).removeClass('black').addClass(cardColor);
    $(locator).find('.card-corner-rank').html(cardRank);
    $(locator).find('.card-corner-suit').html(cardSuit);
};

const showFlop = (board) => {
    $('#flop').removeClass('hidden');
    for (let i = 0; i < 3; i++){
        showCard(board[i], `#flop .card:nth-child(${i+1})`);
    }
    flipCard('flop');
};

const showTurn = (board) => {
    $('#turn').removeClass('hidden');
    showCard(board[3], `#turn .card`);
    flipCard('turn');
};

const showRiver = (board) => {
    $('#river').removeClass('hidden');
    showCard(board[4], `#river .card`);
    flipCard('river');
};

const hideBoardPreFlop = () => {
    $('#flop').addClass('hidden');
    $('#turn').addClass('hidden');
    $('#river').addClass('hidden');
    $('#cards').find('.back-card').removeClass('hidden');
    $('#cards').find('.card-topleft').addClass('hidden');
    $('#cards').find('.card-bottomright').addClass('hidden');
};

// when the players joins in the middle of a hand
// data: {street, board, sound}
socket.on('sync-board', (data) => {
    logIn();
    console.log('syncing board', JSON.stringify(data));
    hideBoardPreFlop();
    if (data.street === 'deal') return;
    showFlop(data.board);
    if (data.street === 'flop') return;
    showTurn(data.board);
    if (data.street === 'turn') return;
    showRiver(data.board);
});

// renders the board (flop, turn, river)
socket.on('render-board', (data) => {
    hideAllBets();
    if (data.street == 'deal'){
        hideBoardPreFlop();
        if (data.sound) {
            playSoundIfVolumeOn('deal');
        }
    }
    else if (data.street == 'flop'){
        showFlop(data.board);
        playSoundIfVolumeOn('flop');
    }
    else if (data.street == 'turn'){
        showTurn(data.board);
        playSoundIfVolumeOn('turn');
    }
    else if (data.street == 'river'){
        showRiver(data.board);
        // playSoundIfVolumeOn('river');
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
    $('#start').addClass('collapse');
});

// changes that person to the person who has the action
socket.on('action', (data) => {
    $('.name').removeClass('action');
    $(`#${data.seat} > .name`).addClass('action');
});

// renders available buttons for player
socket.on('render-action-buttons', (data) => {
    displayButtons(data.availableActions);
})


// changes that person to the person who has the action
socket.on('available-actions', (data) => {
    displayButtons(data.availableActions);
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
    outputEmphasizedMessage(data.username + ' calls');
    playSoundIfVolumeOn('bet');
    showBet(data.seat, data.amount);
});

// check
socket.on('check', (data) => {
    outputEmphasizedMessage(data.username + ' checks');
    playSoundIfVolumeOn('check');
    if ($('#flop').hasClass('hidden') && !$('.player-bet').eq(data.seat).hasClass('hidden')) {
        console.log('big blind player closing action');
    }
    else {
        showBet(data.seat, 'check');
    }
});

// fold
socket.on('fold', (data) => {
    outputEmphasizedMessage(data.username + ' folds');
    playSoundIfVolumeOn('fold');
    outHand(data.seat);
});

function outputMessage(s) {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p>' + s + '</p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
}

function outputEmphasizedMessage(s) {
    // feedback\.innerHTML\s*=\s*['"]['"];\s*message_output\.innerHTML\s*\+=\s*['"]<p><em>['"]\s*\+(.+?)\+\s*['"]<\/em><\/p>['"];\s*\$\(['"]#chat-window['"]\)\.scrollTop\(\$\(['"]#chat-window['"]\)\[0\]\.scrollHeight\);
    outputMessage('<em>' + s + '</em>');
}

// bet
socket.on('bet', (data) => {
    outputEmphasizedMessage(data.username + ' bets ' + data.amount);
    playSoundIfVolumeOn('bet');
    let prevAmount = parseInt($('.player-bet').eq(data.seat).html());
    console.log(`prev amount: ${prevAmount}`);
    showBet(data.seat, data.amount + prevAmount);
});

function hideAllBets() {
    $('.player-bet').html(0);
    $('.player-bet').addClass('hidden');
}

function hideBet(seat) {
    $('.player-bet').eq(seat).html(0);
    $('.player-bet').eq(seat).addClass('hidden');
}

function showBet(seat, amount) {
    $('.player-bet').eq(seat).html(amount);
    $('.player-bet').eq(seat).removeClass('hidden');
}

// raise
socket.on('raise', (data) => {
    outputEmphasizedMessage(data.username + ' raises ' + data.amount);
    if ($('.volume').hasClass('on')){
        createjs.Sound.play('bet');
    }
    let prevAmount = parseInt($('.player-bet').eq(data.seat).html());
    showBet(data.seat, data.amount + prevAmount);
});

//showdown
socket.on('showdown', function (data) {
    for (let i = 0; i < data.length; i++) {
        renderHand(data[i].seat, data[i].hand.cards);
        outputMessage(`${data[i].playerName} wins a pot of ${data[i].amount}! ${data[i].hand.message}: ${data[i].hand.cards} `);
        showWinnings(data[i].amount, data[i].seat);
    }
});

//if everyone is all in in the hand, turn over the cards
socket.on('turn-cards-all-in', function (data) {
    // console.log(data);
    feedback.innerHTML = '';
    message_output.innerHTML += `<p>All in, lets dance</p>`;
    for (let i = 0; i < data.length; i++) {
        renderHand(data[i].seat, data[i].cards);
        $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
        // showWinnings(data[i].amount, data[i].seat);
    }
});

//folds-through
socket.on('folds-through', function (data) {
    outputMessage(`${data.username} wins a pot of ${data.amount}`);
    showWinnings(data.amount, data.seat);
});

//remove earnings span from previous hand
socket.on('clear-earnings', function (data) {
    $('.earnings').empty();
    $('.earnings').addClass('hidden');
});

// user's action (alert with sound)
socket.on('players-action-sound', function(data){
    playSoundIfVolumeOn('action');
});

// user's action (alert with sound)
socket.on('initial-bets', function(data){
    console.log(data);
    let seats = data.seats;
    for (let i = 0; i < seats.length; i++){
        showBet(seats[i].seat, seats[i].bet);
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
};
loadSounds();

const displayButtons = (availableActions) => {
    let maxBetAmount = parseInt($('#bb').html());

    $('.player-bet').each(function () {
        if (!$(this).hasClass('hidden')) {
            let bet = parseInt($(this).html());
            maxBetAmount = Math.max(maxBetAmount, bet);
        }
    });
    $('#call .number').html(maxBetAmount);
    for (let key of Object.keys(availableActions)) {
        if (availableActions[key]){
            $(`#${key}`).removeClass('collapse');
        } else {
            $(`#${key}`).addClass('collapse');
        }
    }
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

const alreadyExistingName = (playerName) => {
    let alreadyExists = false;
    $('.hand').each(function(){
        console.log($(this).find('.username')[0].innerHTML);
        // console.log($(this).find('.username')[0]);
        // console.log($(this).find('.username')[0].text());
        if ($(this).find('.username')[0].innerHTML == playerName){
            alreadyExists = true;
        }
    });
    return alreadyExists;
}

const getMinRaiseAmount = () => {
    let minRaiseAmount = 0;
    let biggestBet = 0;
    let secondBiggestBet = 0;
    $('.player-bet').each(function () {
        // Test if the div element is empty
        if (!$(this).hasClass('hidden')) {
            let bet = parseInt($(this).html());
            if (bet > biggestBet) {
                secondBiggestBet = biggestBet;
                biggestBet = bet;
            } 
            if (bet > secondBiggestBet && bet < biggestBet) {
                secondBiggestBet = bet;
            }
        }
    });

    // if the biggest bet is the bb then double it
    if (biggestBet == parseInt($('#bb').html())) {
        console.log('here!!!!!');
        minRaiseAmount = biggestBet + biggestBet;
    } else {
        console.log('second biggest bet');
        console.log(secondBiggestBet);
        minRaiseAmount = 2 * (biggestBet - secondBiggestBet) + secondBiggestBet;
    }
    return minRaiseAmount;
}

const getPotSize = () => {
    let pot = parseInt($("#pot-amount").html()) || 0;
    $('.player-bet').each(function () {
        if (!$(this).hasClass('hidden')) {
            let bet = parseInt($(this).html());
            pot += bet;
        }
    });
    return pot;
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
    var radius = 210;
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
            'text': 'check'
        }).appendTo(table);
    }
}

function distributeBets() {
    var radius = 180;
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
        var y = Math.round(height / 2 + radius * (1.05 * Math.sin(angle)) - $(this).height() / 2) - 20;
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
    let resizeData = {
        size: {
            width: $wrapper.width(),
            height: $wrapper.height()
        }
    }
    doResize(null, resizeData);
});