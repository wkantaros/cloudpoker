import {TableState, Player, GameState}  from './table-state';
import $ from 'jquery';
import 'jquery-ui/ui/widgets/resizable';
import createjs from 'createjs';
import './css/stylesheet.css'
import './css/card.css'
import io from 'socket.io-client';
import React from 'react';
import ReactDOM from 'react-dom';
// import './index.css';
import * as serviceWorker from './serviceWorker';
import TopState from "./components/topstate";
// File imports for webpack
import VolumeIcon from "./img/volume.svg";
import MuteIcon from "./img/mute.svg";
import ActionSound from './audio/action.ogg';
import CardPLaceSound from './audio/cardPlace1.wav';
import CheckSound from './audio/check.wav';
import ChipsStackSound from './audio/chipsStack4.wav';
import DealSOund from './audio/deal.wav';
import FlopSound from './audio/flop.wav';
import FOldsound from './audio/fold1.wav';
// import './audio/fold2.wav';
// import './audio/river.wav';
import TurnSound from './audio/turn.wav';

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
    minBet = document.getElementById('min-bet'),
    showHand = document.getElementById('show-hand'),
    straddleSwitch = document.getElementById('straddle-switch'),
    standUp = document.getElementById('stand-up'),
    sitDown = document.getElementById('sit-down');
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
};
doResize(null, starterData);

//helper function
const getMaxRoundBet = () => {
    if (!tableState.table) return 0;
    return Math.max(...tableState.table.players.map(p=>p.bet));
};

//header functions--------------------------------------------------------------------------------
$(document).mouseup(function (e) {
    let buyinInfo = $('#buyin-info');
    // if the target of the click isn't the container nor a descendant of the container
    if (!buyinInfo.is(e.target) && buyinInfo.has(e.target).length === 0) {
        buyinInfo.removeClass('show');
    }
});

let loggedIn = false;
$('#buyin').on('click', () => {
    if (!loggedIn)
        $('#buyin-info').addClass('show');
});

/**
 * logIn hides buyin-info ("Join Game") button in header and replaces it with the quit button
 */
const logIn = (standingUp) => {
    loggedIn = true;
    $('#buyin-info').removeClass('show');
    $('#quit-btn').removeClass('collapse');
    $('#buyin').addClass('collapse');
    if (standingUp) {
        showSitDownButton();
    } else {
        showStandUpButton();
    }
};

const logOut = () => {
    loggedIn = false;
    $('#quit-btn').addClass('collapse');
    $('#buyin').removeClass('collapse');
    $('#sit-down').addClass('collapse');
    $('#stand-up').addClass('collapse');
};

$('#buyin-btn').on('click', () => {
    console.log('here!');
    let regex = RegExp(/^\w+(?:\s+\w+)*$/);
    let playerName = newPlayer.value.trim();
    if (playerName.length < 2 || playerName.length > 10) {
        alert('name must be between 2 and 10 characters');
    } else if (!regex.test(playerName)){
        alert('no punctuation in username');
    } else if (playerName === 'guest'){
        alert("'guest' cannot be a username");
    } else if (alreadyExistingName(playerName)){
        alert('please enter a username that is not already at the table')
    } else if (!parseInt(newStack.value) && (parseInt(newStack.value) > 0)) {
        alert("Please enter valid stackinformation");
    } else {
        logIn(false);
        let playerName = newPlayer.value;
        let stack = parseInt(newStack.value);
        socket.emit('buy-in', {
            playerName: playerName,
            stack: stack
        });
    }
});

$('#buyin-info').keydown(function (e){
    e.stopPropagation();
});

quit.addEventListener('click', () => {
    socket.emit('leave-game', {});
    logOut();
});

const showSitDownButton = () => {
    $('#stand-up').addClass('collapse');
    $('#sit-down').removeClass('collapse');
};

const showStandUpButton = () => {
    console.log('should be removing class');
    $('#sit-down').addClass('collapse');
    $('#stand-up').removeClass('collapse');
};

standUp.addEventListener('click', () => {
    socket.emit('stand-up');
    showSitDownButton();
});

sitDown.addEventListener('click', () => {
    socket.emit('sit-down');
    showStandUpButton()
});

$('#getLink').click(() => copyLink());

let copyLink = () => {
    copyStringToClipboard(window.location.href);
    let link = document.getElementById('getLink');
    link.innerHTML = 'link copied!';
    setTimeout(() => {
        link.innerHTML = 'get sharable link'
    }, 2000);
};

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

const getMaximumAllowedBet = () => {
    if (!tableState.gameInProgress || !tableState.player) return 0;
    return Math.min(tableState.player.chips + tableState.player.bet, tableState.table.maxBetPossible(tableState.player.playerName));
};

const getMinimumAllowedBet = () => {
    if (!tableState.gameInProgress || !tableState.player) return 0;
    return Math.min(tableState.player.chips + tableState.player.bet, tableState.table.minimumBetAllowed(tableState.player.playerName));
};

//action buttons ------------------------------------------------------------------------------------------------------------
//action buttons ------------------------------------------------------------------------------------------------------------
//action buttons ------------------------------------------------------------------------------------------------------------
//action buttons ------------------------------------------------------------------------------------------------------------
//action buttons ------------------------------------------------------------------------------------------------------------
//action buttons ------------------------------------------------------------------------------------------------------------
//action buttons ------------------------------------------------------------------------------------------------------------
//action buttons ------------------------------------------------------------------------------------------------------------
//action buttons ------------------------------------------------------------------------------------------------------------
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
        const minimum = getMinimumAllowedBet();
        output.value = minimum; // Display the default slider value
        slider.min = minimum;
        slider.max = getMaximumAllowedBet();
        
        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function () {
            output.value = this.value;
            output.focus();
        } 
    }
});

const getBetInput = () => {
    return parseInt(document.getElementById("bet-input-val").value);
};

const getRaiseInput = () => {
    return parseInt(document.getElementById("raise-input-val").value);
};

$('#betplus').on('click', () => {
    let bb = getBigBlind();
    let maxval = getMaximumAllowedBet();
    handleBetSliderButtons(Math.min(getBetInput() + bb, maxval));
});

$('#betminus').on('click', () => {
    let bb = getBigBlind();
    handleBetSliderButtons(Math.max(getBetInput() - bb, bb));

});

$('#bai').on('click', () => {
    handleBetSliderButtons(getMaximumAllowedBet());
});

$('#bp').on('click', () => {
    handleBetSliderButtons(getPotSize());
});

$('#btqp').on('click', () => {
    handleBetSliderButtons(Math.floor(3 * getPotSize() / 4));
});

$('#bhp').on('click', () => {
    handleBetSliderButtons(Math.floor(getPotSize() / 2));
});

$('#bqp').on('click', () => {
    handleBetSliderButtons(Math.max(Math.floor(getPotSize() / 4), getBigBlind()));
});

$('#mb').on('click', () => {
    handleBetSliderButtons(getBigBlind());
});

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
});

$('#bet-input-val').keydown(function (e) {
    e.stopPropagation();
    // enter key
    if (e.keyCode == 13) {
        if (placeBet()) {
            $('#bet').click();
        }
    }
    // b key (back)
    if (e.keyCode === 66 && !$('#back').hasClass('collapse')) {
        $('#back').click();
    }
});

const handleBetSliderButtons = (outputVal) => {
    console.log('val', outputVal);
    let slider = document.getElementById("betRange");
    let output = document.getElementById("bet-input-val");
    output.value = outputVal;
    slider.value = output.value;
    output.focus();
};

const handleRaiseSliderButtons = (outputVal) => {
    console.log('rval', outputVal);
    let slider = document.getElementById("raiseRange");
    let output = document.getElementById("raise-input-val");
    output.value = outputVal;
    slider.value = output.value;
    output.focus();
};

const placeBet = () => {
    console.log('bet');
    let betAmount = parseInt($('#bet-input-val').val());
    let minBetAmount = getMinimumAllowedBet();
    let maxBetAmount = getMaximumAllowedBet();

    if (betAmount > maxBetAmount) { // if player bet more than max amount, bet max amount
        betAmount = maxBetAmount;
    } else if (betAmount < minBetAmount) { // if player bet < min bet
        alert(`minimum bet size is ${minBetAmount}`);
        return false;
    } else if (!betAmount) { // if player did not enter a bet
        alert(`minimum bet size is ${minBetAmount}`);
        return false;
    }
    socket.emit('action', {
        amount: betAmount,
        action: 'bet'
    });
    return true;
};

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
        console.log('ts', tableState);
        const minAmount = Math.min(getMinRaiseAmount(), tableState.player.bet + tableState.player.chips);
        output.value = minAmount; // Display the default slider value
        slider.min = minAmount;
        slider.max = Math.min(tableState.player.bet + tableState.player.chips, tableState.table.otherPlayersMaxStack(tableState.player.playerName));

        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function () {
            output.value = this.value;
            output.focus();
        }
    }
});

const setRaiseSliderTo = (num) => {
    let valormr = Math.max(Math.floor(num), getMinRaiseAmount());
    handleRaiseSliderButtons(Math.min(valormr, getMaximumAllowedBet()));
};

$('#raiseplus').on('click', () => {
    let output = document.getElementById("raise-input-val");
    setRaiseSliderTo(parseInt(output.value) + getBigBlind())
});

$('#raiseminus').on('click', () => {
    setRaiseSliderTo(getRaiseInput() - getBigBlind());
});

$('#rai').on('click', () => {
    setRaiseSliderTo(getMaximumAllowedBet());
});

$('#rthp').on('click', () => {
    setRaiseSliderTo(3 * getPotSize());
});

$('#rtp').on('click', () => {
    setRaiseSliderTo(2 * getPotSize());
});

$('#rsqp').on('click', () => {
    setRaiseSliderTo(6 * getPotSize() / 4);
});

$('#rp').on('click', () => {
    setRaiseSliderTo(getPotSize());
});

$('#mr').on('click', () => {
    // min raise or all in
    setRaiseSliderTo(getMinRaiseAmount());
});

$('#raise-input-val').keydown(function (e) {
    e.stopPropagation();
    if (e.keyCode == 13) {
        if (placeRaise()) {
            $('#raise').click();
        }
    }
    // b key (back)
    if (e.keyCode === 66 && !$('#back').hasClass('collapse')) {
        $('#back').click();
    }
});

let placeRaise = () => {
    let raiseAmount = parseInt($('#raise-input-val').val());
    console.log('raise', raiseAmount);
    // console.log(raiseAmount);
    let minRaiseAmount = getMinRaiseAmount();
    let maxRaiseAmount = getStack();
    console.log('maxRaiseAmount', maxRaiseAmount);
    if (raiseAmount > maxRaiseAmount) {
        raiseAmount = maxRaiseAmount;
    }

    if (raiseAmount == maxRaiseAmount && maxRaiseAmount < minRaiseAmount) {
        console.log('all in player');
        socket.emit('action', {
            amount: raiseAmount,
            action: 'call'
        });
        return true;
    } else if (!raiseAmount || raiseAmount < minRaiseAmount) {
        alert(`minimum raise amount is ${minRaiseAmount}`);
    } else if (raiseAmount == maxRaiseAmount) { // player is going all in
        socket.emit('action', {
            amount: raiseAmount,
            action: 'bet'
        });
        return true;
    } else {
        socket.emit('action', {
            amount: raiseAmount,
            action: 'raise'
        });
        return true;
    }
    return false;
};

start_btn.addEventListener('click', () => {
    console.log('starting game');
    socket.emit('start-game', {});
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

showHand.addEventListener('click', () => {
    console.log('click show hand');
    socket.emit('show-hand', {});
    $('#show-hand').addClass('collapse');
});

minBet.addEventListener('click', () => {
    console.log('min bet');
    console.log(getBigBlind());
    socket.emit('action', {
        amount: getBigBlind(),
        action: 'bet'
    });
});

// let isStraddling = false;
// straddleSwitch.addEventListener('click', () => {
//     isStraddling = !isStraddling;
//     console.log(`straddle enabled: ${isStraddling}`);
//     if (isStraddling) {
//         $('#straddle-switch').html('Disable Straddling');
//     } else {
//         $('#straddle-switch').html('Enable Straddling');
//     }
//     socket.emit('straddle-switch', {
//         isStraddling: isStraddling
//     });
// });

$('input[name=singleStraddleBox]').change(function () {
    if ($(this).is(':checked')) {
        console.log('player elects to straddle utg');
        socket.emit('straddle-switch', {
            isStraddling: true,
            straddletype: 1
        });
    } else {
        console.log('player elects to stop straddling utg');
        socket.emit('straddle-switch', {
            isStraddling: false,
            straddletype: 0
        });
    }
});

$('input[name=multiStraddleBox]').change(function () {
    if ($(this).is(':checked')) {
        console.log('player elects to start multi straddling');
        socket.emit('straddle-switch', {
            isStraddling: true,
            straddletype: -1
        });
    } else {
        console.log('player elects to stop multi straddling');
        socket.emit('straddle-switch', {
            isStraddling: false,
            straddletype: 0
        });
    }
});

// keyboard shortcuts for all events
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------PREMOVE ACTION BUTTONS--------------------------------------------------
// -------------------------------------------PREMOVE ACTION BUTTONS--------------------------------------------------
// -------------------------------------------PREMOVE ACTION BUTTONS--------------------------------------------------
// -------------------------------------------PREMOVE ACTION BUTTONS--------------------------------------------------
// -------------------------------------------PREMOVE ACTION BUTTONS--------------------------------------------------
// -------------------------------------------PREMOVE ACTION BUTTONS--------------------------------------------------
// -------------------------------------------PREMOVE ACTION BUTTONS--------------------------------------------------
// -------------------------------------------PREMOVE ACTION BUTTONS--------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------------------------------------

// have to do it this way bc of safari (super annoying)
$('#pm-check').on('click', (e) => {
    if ($('#pm-check').hasClass('pm')){
        $('.pm-btn').removeClass('pm');
    } else {
        $('.pm-btn').removeClass('pm');
        $('#pm-check').addClass('pm');
    }
    e.stopPropagation();
});

$('#pm-call').on('click', (e) => {
    if ($('#pm-call').hasClass('pm')) {
        $('.pm-btn').removeClass('pm');
    } else {
        $('.pm-btn').removeClass('pm');
        $('#pm-call').addClass('pm');
    }
    e.stopPropagation();
});

$('#pm-checkfold').on('click', (e) => {
    if ($('#pm-checkfold').hasClass('pm')) {
        $('.pm-btn').removeClass('pm');
    } else {
        $('.pm-btn').removeClass('pm');
        $('#pm-checkfold').addClass('pm');
    }
    e.stopPropagation();
});

$('#pm-fold').on('click', (e) => {
    if ($('#pm-fold').hasClass('pm')) {
        $('.pm-btn').removeClass('pm');
    } else {
        $('.pm-btn').removeClass('pm');
        $('#pm-fold').addClass('pm');
    }
    e.stopPropagation();
});

const checkForPremoves = () => {
    if ($('#pm-fold').hasClass('pm')){
        return '#fold';
    }
    if ($('#pm-call').hasClass('pm')){
        return '#call';
    }
    if ($('#pm-check').hasClass('pm')){
        return '#check';
    }
    if ($('#pm-checkfold').hasClass('pm')){
        return '#check';
    }
    return undefined;
};


// keyboard shortcuts for all events ------------------------------------------------------------------------------------------------
$(document).keydown(function (event) {
    // m key
    if (event.keyCode === 77) {
        event.preventDefault();
        message.focus();
    }
    // k key (check)
    if (event.keyCode === 75 && !$('#check').hasClass('collapse')){
        check.click();
    }
    // k key (premove check)
    if (event.keyCode === 75 && !$('#pm-check').hasClass('collapse')){
        $('#pm-check').click();
    }
    // c key (call)
    if (event.keyCode === 67 && !$('#call').hasClass('collapse')){
        call.click();
    }
    // c key (premove call)
    if (event.keyCode === 67 && !$('#pm-call').hasClass('collapse')){
        $('#pm-call').click();
    }
    // c key (min bet)
    if (event.keyCode === 67 && !$('#min-bet').hasClass('collapse')){
        minBet.click();
    }
    // i key (premove check/fold)
    if (event.keyCode === 73 && !$('#pm-checkfold').hasClass('collapse')){
        $('#pm-checkfold').click();
    }
    // r key (raise)
    if (event.keyCode === 82 && !$('#raise').hasClass('collapse')){
        $('#raise').click();
    }
    // r key (bet)
    if (event.keyCode === 82 && !$('#bet').hasClass('collapse')){
        $('#bet').click();
    }
    // b key (back)
    if (event.keyCode === 66 && !$('#back').hasClass('collapse')){
        $('#back').click();
    }
    // f key (fold)
    if (event.keyCode === 70 && !$('#fold').hasClass('collapse')){
        fold.click();
    }
    // f key (premove fold)
    if (event.keyCode === 70 && !$('#pm-fold').hasClass('collapse')){
        $('#pm-fold').click();
    }
    if (event.keyCode === 83 && !$('#show-hand').hasClass('collapse')) {
        $('#show-hand').click();
    }
});

function isVolumeOn() {
    return $('.volume').hasClass('on');
}

$(".volume").click( function (e) {
    if (isVolumeOn()){
        $('#volume-icon').attr('src', MuteIcon);
        $('.volume').removeClass('on');
    } else {
        $('#volume-icon').attr('src', VolumeIcon);
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
    event.stopPropagation();
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
    socket.emit('typing');
});

//Listen for events--------------------------------------------------------------------------------

const setTurnTimer = (delay) => {
    socket.emit('set-turn-timer', {delay: delay});
};

const kickPlayer = (playerName) => {
    console.log(`kicking player ${playerName}`);
    socket.emit('kick-player', {playerName: playerName});
};

socket.on('player-disconnect', (data) => {
    console.log(`${data.playerName} disconnected`)
    // TODO: do something that makes it clear that the player is offline, such as making
    //  their cards gray or putting the word "offline" next to their name
});

socket.on('player-reconnect', (data) => {
    console.log(`${data.playerName} reconnected`);
    // TODO: undo the effects of the player-disconnect event listener
});

const transformTable = (data) => {
    console.log('transformTable', data);
    const t = data.table;
    // Make game a GameState object
    t.game = t.game === null ? null: Object.assign(new GameState(t.game.bigBlind, t.game.smallBlind), t.game);
    t.allPlayers = t.allPlayers.map(p => p === null ? null: transformPlayer(p));
    return new TableState(t.smallBlind, t.bigBlind, t.minPlayers, t.maxPlayers, t.minBuyIn, t.maxBuyIn, t.straddleLimit, t.dealer, t.allPlayers, t.currentPlayer, t.game);
}

const transformPlayer = (p) => {
    return Object.assign(new Player(p.playerName, p.chips, p.isStraddling, p.seat, p.isMod), p);
}

let tableState = {}; // not used for rendering.
function setState(data) {
    if (data.table) {
        tableState.table = transformTable(data);

        // if (data.gameInProgress && tableState.table.canPlayersRevealHands()) {
        //     displayButtons({availableActions: {'show-hand': true}, canPerformPremoves: false});
        // }
    }
    if (data.player) {
        tableState.player = transformPlayer(data.player);
    }
    tableState.gameInProgress = data.gameInProgress;
    renderBetsAndFields();
    if (tableState.gameInProgress && tableState.player) {
        renderStraddleOptions(true);
    } else {
        renderStraddleOptions(false);
    }
}

socket.on('state-snapshot', setState);

const addModAbilities = () => {
    $('#quit-btn').removeClass('collapse');
    $('#buyin').addClass('collapse');
    $('#host-btn').removeClass('collapse');
    // TODO: show mod panel or set turn timer button
};

const removeModAbilities = () => {
    $('#host-btn').addClass('collapse');
    $('#start').addClass('collapse');
};

// add additional abilities for mod
socket.on('add-mod-abilities', addModAbilities);

socket.on('bust', (data) => {
    logOut();
    // remove additional abilities for mod when mod leaves
    if (data.removeModAbilities)
        removeModAbilities();
});

// remove additional abilities for mod when mod leaves
socket.on('remove-mod-abilities', (data) => {
    removeModAbilities();
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
    if ($('.volume').hasClass('on')) {
        createjs.Sound.play('fold');
    }
    // outHand(data.seat);
    // $(`#${data.seat}`).addClass('out');
});

socket.on('stand-up', data => {
    // TODO: do we want to do anything here?
    outputEmphasizedMessage(data.playerName + 'stands up.');
});

socket.on('sit-down', data => {
    // TODO: do we want to do anything here?
    outputEmphasizedMessage(data.playerName + 'sits down.');
});

// data is {seat, time}
// time is milliseconds until the player's turn expires and they are forced to fold.
// seat is not necessarily the next action seat, as the timer could have been refreshed.
// in all other cases, seat should be the action seat.
// if time <= 0, remove the timer.
socket.on('render-timer', (data) => {
    // Clear existing turn timers
    // $('.name').removeClass('turn-timer');
    // Set new timer for data.playerName
    if (data.time > 0) {
        // TODO: implement front end graphics for turn timer
        // $(`#${data.seat} > .name`).addClass('turn-timer');
    } else {
        // TODO: remove graphics for turn timer
        // no longer display the timer
    }
});

const showCard = (card, locator) => {
    let cardRank = (card.charAt(0) == 'T') ? '10' : card.charAt(0);
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
// data: {street, board, sound, logIn}
socket.on('sync-board', (data) => {
    $('.pm-btn').removeClass('pm');
    if (data.logIn) {
        logIn(tableState.player.standingUp);
    }
    console.log('syncing board', JSON.stringify(data));
    hideBoardPreFlop();

    dealStreet(data);

    // for (let i = 0; i < tableState.table.allPlayers.length; i++) {
    //     const p = tableState.table.allPlayers[i];
    //     if (p === null) {
    //         hideSeat(i);
    //         continue;
    //     }
    //     if (!p.inHand) {
    //         if (p.standingUp) { // players that stood up in a previous hand or before the game started
    //
    //         } else { // waiting players
    //
    //         }
    //     } else { // players in the current hand
    //
    //     }
    // }
});

const dealStreet = (data) => {
    if (data.street === 'deal') {
        hideBoardPreFlop();
        if (data.sound) playSoundIfVolumeOn('deal');
        return;
    }
    showFlop(data.board);
    if (data.street === 'flop') {
        if (data.sound) playSoundIfVolumeOn('flop');
        return;
    }
    showTurn(data.board);
    if (data.street === 'turn') {
        if (data.sound) playSoundIfVolumeOn('turn');
        return;
    }
    showRiver(data.board);
    if (data.sound) playSoundIfVolumeOn('river');
};

// renders the board (flop, turn, river)
socket.on('render-board', (data) => {
    $('.pm-btn').removeClass('pm');
    renderBetsAndFields();
    dealStreet(data);
});


// renders the board (flop, turn, river)
// data: {street: '', board: [], sound: boolean, handRanks: {'': [{seat: number, handRankMessage: ''},...]}}
socket.on('render-all-in', (data) => {
    $('.pm-btn').removeClass('pm');
    renderBetsAndFields();
    renderAllIn(data.board, data.handRanks);
});

// TODO: implement staggered street showing with React
const renderAllIn = (board, handRanks) => {
    console.log(board);
    if ($('#flop').hasClass('hidden')) {
        showFlop(board);
        playSoundIfVolumeOn('flop');
        // renderHands(handRanks['flop']);
        setTimeout(() => {
            renderAllIn(board, handRanks);
        }, 1200);
    } else if ($('#turn').hasClass('hidden')) {
        showTurn(board);
        playSoundIfVolumeOn('turn');
        // renderHands(handRanks['turn']);
        setTimeout(() => {
            renderAllIn(board, handRanks);
        }, 1800);
    } else {
        showRiver(board);
        playSoundIfVolumeOn('river');
        // renderHands(handRanks['river']);
    }
};

socket.on('update-rank', (data) => {
    // TODO: update rank on front end
    renderBetsAndFields();
    // console.log(`hand rank update: ${data.handRankMessage}`)
    // renderHandRank(data.seat, data.handRankMessage);
});

// renders a players hand. data is formatted like so:
//{
//  cards: ["4H","QD"],
//  seat: 1,
//  folded: false,
//  handRankMessage: "High Card",
// }
socket.on('render-hand', (data) => {
    console.log('rendering hand');
    console.log(data.cards, data.handRankMessage);
    renderBetsAndFields();
    // renderHand(data.seat, data.cards, data.folded);
    // renderHandRank(data.seat, data.handRankMessage);
});

// updates stack when a bet is placed, for example
socket.on('update-stack', (data) => {
    // let hand = document.getElementById(data.seat);
    // hand.querySelector('.stack').innerHTML = data.stack;
});

const updatePot = (amount) => {
    if (amount) {
        $('#pot-amount').html(amount);
    } else {
        $('#pot-amount').empty();
    }
};

// updates pot at beginning of each new street
socket.on('update-pot', (data) => {
   updatePot(data.amount);
});

// start game (change all cards to red)
socket.on('start-game', (data) => {
    $('#start').addClass('collapse');
});

// renders available buttons for player
socket.on('render-action-buttons', (data) => {
    console.log(data);
    displayButtons(data);
});

// ---------------------------------action buttons --------------------------------------------------------
// calls
socket.on('call', (data) => {
    outputEmphasizedMessage(data.username + ' calls');
    playSoundIfVolumeOn('bet');
});

// check
socket.on('check', (data) => {
    outputEmphasizedMessage(data.username + ' checks');
    playSoundIfVolumeOn('check');
});

// fold
socket.on('fold', (data) => {
    outputEmphasizedMessage(data.username + ' folds');
    playSoundIfVolumeOn('fold');
});

function outputMessage(s) {
    feedback.innerHTML = '';
    message_output.innerHTML += '<p>' + s + '</p>';
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
}

function outputEmphasizedMessage(s) {
    outputMessage('<em>' + s + '</em>');
}

// bet
socket.on('bet', (data) => {
    outputEmphasizedMessage(data.username + ' bets ' + data.amount);
    playSoundIfVolumeOn('bet');
});

// socket.on('straddle', (data) => {
//     outputEmphasizedMessage(data.username + ' straddles ' + data.amount);
//     // TODO: do we want a different sound effect for straddle?
//     playSoundIfVolumeOn('bet');
// });

// raise
socket.on('raise', (data) => {
    outputEmphasizedMessage(data.username + ' raises ' + data.amount);
    if ($('.volume').hasClass('on')){
        createjs.Sound.play('bet');
    }
});

//showdown
socket.on('showdown', function (data) {
    // renderBetsAndFields();
    for (let i = 0; i < data.length; i++) {
        outputMessage(`${data[i].playerName} wins a pot of ${data[i].amount}! ${data[i].hand.message}: ${data[i].hand.cards} `);
        // showWinnings(data[i].amount, data[i].seat);
    }
});

//if everyone is all in in the hand, turn over the cards
// socket.on('turn-cards-all-in', function (data) {
//     // console.log(data);
//     feedback.innerHTML = '';
//     renderHands(data);
// });

//folds-through
socket.on('folds-through', function (data) {
    outputMessage(`${data.username} wins a pot of ${data.amount}`);
    // showWinnings(data.amount, data.seat);
});

const clearEarnings = () => {
    $('.earnings').empty();
    $('.earnings').addClass('hidden');
};

//remove earnings span from previous hand
socket.on('clear-earnings', clearEarnings);

// user's action (alert with sound)
socket.on('players-action-sound', function(data){
    playSoundIfVolumeOn('action');
});

socket.on('alert', function(data) {
    alert(data.message);
});

//helper functions--------------------------------------------------------------------------------
const loadSounds = () => {
    console.log(__dirname);
    createjs.Sound.registerSound('../client/src/audio/fold1.wav', 'fold');
    createjs.Sound.registerSound('../client/src/audio/deal.wav', 'deal');
    createjs.Sound.registerSound('../client/src/audio/check.wav', 'check');
    createjs.Sound.registerSound('../client/src/audio/chipsStack4.wav', 'bet');
    createjs.Sound.registerSound('../client/src/audio/flop.wav', 'flop');
    createjs.Sound.registerSound('../client/src/audio/turn.wav', 'turn');
    createjs.Sound.registerSound('../client/src/audio/cardPlace1.wav', 'river');
    createjs.Sound.registerSound('../client/src/audio/action.ogg', 'action');
    createjs.Sound.volume = 0.25;
};
loadSounds();

const displayButtons = (data) => {
    if (data == -1) {
        console.log('here yuh');
        $('.action-btn').addClass('collapse');
        $('.pm-btn').removeClass('pm');
        return;
    }
    let premove = undefined;
    if (data.canPerformPremoves) {
        $('#pm-fold').removeClass('collapse');
        if (getMaxRoundBet()) {
            $('#pm-check').removeClass('pm');
            $('#pm-check').addClass('collapse');

            if ($('#pm-checkfold').hasClass('pm')) {
                $('#pm-checkfold').removeClass('pm');
                $('#pm-fold').click();
            }
            $('#pm-checkfold').addClass('collapse');

            let oldNum = $('#pm-call > .number').html();
            $('#pm-call > .number').html(getMaxRoundBet());
            let newNum = $('#pm-call > .number').html();
            if (oldNum != newNum){
                $('#pm-call').removeClass('pm');
            }
            $('#pm-call').removeClass('collapse');
        } else {
            $('#pm-check').removeClass('collapse');
            $('#pm-checkfold').removeClass('collapse');
            $('#pm-call').addClass('collapse');
        }
    }
    else {
        // remove call if bet changes
        let oldNum = $('#pm-call > .number').html();
        $('#pm-call > .number').html(getMaxRoundBet());
        let newNum = $('#pm-call > .number').html();
        if (oldNum != newNum) {
            $('#pm-call').removeClass('pm');
        }
        // if checkfold was clicked and there is a bet its now fold
        if (getMaxRoundBet()){
            if ($('#pm-checkfold').hasClass('pm')){
                $('#pm-checkfold').removeClass('pm');
                $('#pm-fold').click();
            }
            // if check was clicked and there is a bet remov premove
            if ($('#pm-check').hasClass('pm')) {
                $('.pm-btn').removeClass('pm');
            }
        }
        premove = checkForPremoves();
        $('.pm-btn').removeClass('pm');
        $('.pm-btn').addClass('collapse');
    }
    
    // active player keys
    $('#call .number').html(getMaxRoundBet());
    $('#min-bet .number').html(getMinimumAllowedBet());
    for (let key of Object.keys(data.availableActions)) {
        if (data.availableActions[key]){
            $(`#${key}`).removeClass('collapse');
        } else {
            $(`#${key}`).addClass('collapse');
        }
    }
    console.log('checked for premove', premove);
    if (premove) {
        setTimeout(() => {
            $(`${premove}`).click();
        }, 650);
    }
};

const cleanInput = (input) => {
    return $('<div/>').text(input).html();
};

const getSuitSymbol = (input) => {
    const suits = '♠︎ ♥︎ ♣︎ ♦︎'.split(' ');
    const inputs = 'S H C D'.split(' ');
    for (let i = 0; i < 4; i++){
        if (inputs[i] == input) return suits[i];
    }
    return 'yikes';
};

const getColor = (input) => 'SC'.includes(input) ? 'black' : 'red';

const flipCard = (name) => {
    setTimeout(() => {
        $(`#${name}`).find('.back-card').addClass('hidden');
        $(`#${name}`).find('.card-topleft').removeClass('hidden');
        $(`#${name}`).find('.card-bottomright').removeClass('hidden');
    }, 250);
};

const alreadyExistingName = (playerName) => {
    return tableState.table.allPlayers.filter(p=>p!==null).map(p => p.playerName).includes(playerName);
};

const getMinRaiseAmount = () => {
    let minRaiseAmount = 0;
    let bets = tableState.table.players.map(p => p.bet);
    let biggestBet = Math.max(...bets)|| 0;
    let secondBiggestBet = Math.max(...bets.filter(b=>b<biggestBet)) || 0;

    // if the biggest bet is the bb then double it
    if (biggestBet === getBigBlind()) {
        console.log('here!!!!!');
        minRaiseAmount = biggestBet + biggestBet;
    } else {
        console.log('second biggest bet');
        console.log(secondBiggestBet);
        minRaiseAmount = 2 * (biggestBet - secondBiggestBet) + secondBiggestBet;
    }
    return minRaiseAmount;
};

const getStack = () => {
    return parseInt($('.action > .stack').html());
};

const getBigBlind = () => {
    return tableState.table.bigBlind;
};

const getSmallBlind = () => {
    return tableState.table.smallBlind;
};

const getPotSize = () => {
    return tableState.table.game.pot + tableState.table.players.map(p => p.bet).reduce((acc, cv) => acc + cv) || 0;
};

function renderBetsAndFields() {
    const ovalParent = $('.ovalparent');
    ReactDOM.render((
        <React.StrictMode>
            <TopState socket={socket} table={tableState.table} player={tableState.player} gameInProgress={tableState.gameInProgress} betWidth={60} betHeight={35} tableWidth={ovalParent.width()} tableHeight={ovalParent.height()} />
        </React.StrictMode>
    ), document.getElementById('table-sub-root'));
}
$(window).resize(function () {
    // createHands();
    renderBetsAndFields();
    // distributeHands(false);
    // distributeBets();
    let resizeData = {
        size: {
            width: $wrapper.width(),
            height: $wrapper.height()
        }
    };
    doResize(null, resizeData);
});

//---------------------------------------------------------
//------------open and close gamelog features--------------

function openBuyin() {
    socket.emit('get-buyin-info');
    document.getElementById("buyin-log").style.width = "100%";
}

socket.on('get-buyin-info', (data) => {
    $('#buyins').empty();
    for (let i = 0; i < data.length; i++) {
        let time = `<span class='info'>${data[i].time} ~</span>`;
        let datastr = `${time} ${data[i].playerName} (id: ${data[i].playerid}) buy-in: ${data[i].buyin}`;
        if (data[i].buyout != null){
            datastr += ` buy-out: ${data[i].buyout}`
        }
        $('#buyins').prepend(`<p>${datastr}</p>`);
    }
});

function closeBuyin() {
    document.getElementById("buyin-log").style.width = "0%";
}

function openLog() {
    document.getElementById("game-log").style.width = "100%";
}

function closeLog() {
    document.getElementById("game-log").style.width = "0%";
}

function openHostPage() {
    renderGamePrefVals();
    renderHostPlayerVals();
    $('#game-pref-btn').click();
    // $('#host-players-btn').click();
    document.getElementById("host-page").style.width = "100%";
}

let renderGamePrefVals = () => {
    $('#checkbp').prop("checked", false);
    $('#smallblind-input').val(getSmallBlind());
    $('#bigblind-input').val(getBigBlind());
    $('#straddle-input').val('');
}

let renderHostPlayerVals = () => {
    for (let i = 0; i < 10; i++) {
        let rowplayerid = `#player${i}`
        $(rowplayerid).addClass('collapse');
        let seat = `#${i}`
        if (!$(seat).hasClass('hidden')){
            let name = $(seat).find('.username').html();
            let stack = parseInt($(seat).find('.stack').html());
            console.log(name);
            console.log('stack', stack);
            $(rowplayerid).find('.playername-input').val(name);
            $(rowplayerid).find('.stack-input').val(stack);
            $(rowplayerid).removeClass('collapse');
        }
    }
}

let closeGamePrefVals = () => {
    $('#successfully-submitted').addClass('collapse');
    $('#game-pref-form').removeClass('collapse');
    $('.game-pref').addClass('collapse');
    $('#game-pref-btn').removeClass('active');
}

let closePlayerVals = () => {
    $('#successfully-submitted-players').addClass('collapse');
    $('.player-rows').removeClass('collapse');
    $('.players-host-page').addClass('collapse');
    $('#host-players-btn').removeClass('active');
}

function closeHostPage() {
    closeGamePrefVals();
    closePlayerVals();
    document.getElementById("host-page").style.width = "0%";
}

$('#game-pref-btn').click(() => {
    $('#successfully-submitted').addClass('collapse');
    $('#game-pref-form').removeClass('collapse');
    $('.game-pref').removeClass('collapse');
    $('#game-pref-btn').addClass('active');
    closePlayerVals();
});

$('#host-players-btn').click(() => {
    $('#successfully-submitted-players').addClass('collapse');
    $('.player-rows').removeClass('collapse');
    $('.players-host-page').removeClass('collapse');
    $('#host-players-btn').addClass('active');
    closeGamePrefVals();
    if (!$('#player0').hasClass('collapse')){
        $('#player0').find('.stack-input').focus();
    }
});

$('#buyin-log-opn').click( () => openBuyin());
$('#closeBuyin').click(() => closeBuyin());
$('#game-log-opn').click(() => openLog());
$('#closeLog').click(() => closeLog());
$('#host-btn').click(() => openHostPage());
$('#closeHostPage').click(() => closeHostPage());

// host page capabilities
const gamePrefForm = document.getElementById('game-pref-form');
gamePrefForm.addEventListener('submit', (event) => {
    event.preventDefault();
    console.log('form successfully submitted');
    const formData = new FormData(gamePrefForm);
    const smallBlind = parseInt(formData.get('smallblind-input')) || 25;
    const bigBlind = parseInt(formData.get('bigblind-input')) || 50;
    const straddleLimit = formData.get('straddle-inp');
    const bombPotNextHand = formData.get('bombpot-nexthand') != null ? true : false;

    const gamePref = {
        smallBlind,
        bigBlind,
        straddleLimit,
        bombPotNextHand
    };

    console.log(gamePref);
    $('#successfully-submitted').removeClass('collapse');
    $('#game-pref-form').addClass('collapse');
    handleUpdatedGamePreferences(gamePref);
});

const handleUpdatedGamePreferences = (gamePref) => {
    // todo: update big blind, small blind for next turn, if things change
    let bb = gamePref.bigBlind;
    let sb = gamePref.smallBlind;
    if (bb !== getBigBlind() || sb !== getSmallBlind()){
        socket.emit('update-blinds-next-round', {smallBlind: sb, bigBlind: bb});
    }
    // todo: update straddle rules if selected for next turn
    if (gamePref.straddleLimit !== tableState.table.straddleLimit) {
        socket.emit('update-straddle-next-round', {straddleLimit: gamePref.straddleLimit});
    }
    // todo: queue bombpot for next hand
}

$('.transfer-ownership-btn').click(function() {
    let playerid = $(this).parents('.row').attr('id');
    let seat = parseInt(playerid.substring(6));
    socket.emit('transfer-host', {seat});
    closeHostPage();
});

$('.update-stack-row').click(function() {
    let playerid = $(this).parents('.row').attr('id');
    let seat = parseInt(playerid.substring(6));
    let newStackAmount = parseInt($(`#${playerid}`).find('.stack-input').val());
    socket.emit('update-player-stack', {seat, newStackAmount});
    $('#successfully-submitted-players').removeClass('collapse');
    $('.player-rows').addClass('collapse');
});

socket.on('update-player-stack', (data) => {
    console.log(data);
    $('#sb').html(data.smallBlind);
    $('#bb').html(data.bigBlind);
});

$('.kick-option-btn').click(function () {
    let playerid = $(this).parents('.row').attr('id');
    let seat = parseInt(playerid.substring(6));
    socket.emit('kick-player', {
        seat
    });
    closeHostPage();
});

socket.on('update-header-blinds', (data) => {
    console.log(data);
    $('#sb').html(data.smallBlind);
    $('#bb').html(data.bigBlind);
});

const renderStraddleOptions = (canRender) => {
    console.log('tableState', tableState);
    if (canRender){
        if (tableState.table.straddleLimit == 1){
            $('.single-straddle').removeClass('collapse');
            $('.multi-straddle').addClass('collapse');
            if (tableState.player.isStraddling){
                $('input[name=singleStraddleBox]').prop("checked", true);
            }
        }
        else if (tableState.table.straddleLimit == -1){
            $('.single-straddle').removeClass('collapse');
            $('.multi-straddle').removeClass('collapse');
            if (tableState.player.isStraddling) {
                $('input[name=singleStraddleBox]').prop("checked", true);
                $('input[name=multiStraddleBox]').prop("checked", true);
            }
        }
        else {
            $('.single-straddle').addClass('collapse');
            $('.multi-straddle').addClass('collapse');
        }
    } else {
        $('.single-straddle').addClass('collapse');
        $('.multi-straddle').addClass('collapse');
    }
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
