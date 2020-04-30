// import {TableState} from "../poker-logic";
// import {TableStateManager} from "../server/server-logic";
const {TableState, Player} = require('../sharedjs');

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
    straddleSwitch = document.getElementById('straddle-switch');
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
    let maxBetAmount = 0;

    $('.player-bet').each(function () {
        if (!$(this).hasClass('hidden')) {
            let bet = parseInt($(this).html()) || 0;
            maxBetAmount = Math.max(maxBetAmount, bet);
        }
    });
    return maxBetAmount;
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
        logIn();
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
    return Math.min(tableState.player.chips, tableState.table.maxBetPossible(tableState.player.playerName));
};

const getMinimumAllowedBet = () => {
    if (!tableState.gameInProgress || !tableState.player) return 0;
    return Math.min(tableState.player.chips, tableState.table.minimumBetAllowed(tableState.player.playerName));
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
        // slider.min = getBigBlind();
        slider.min = minimum;

        // console.log(tableState);
        // console.log('mbp', tableState.table.maxBetPossible(tableState.player.playerName));
        slider.max = getMaximumAllowedBet();
        // slider.max = getStack();
        
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
    let maxval = getStack();
    handleBetSliderButtons(Math.min(getBetInput() + bb, maxval));
});

$('#betminus').on('click', () => {
    let bb = getBigBlind();
    handleBetSliderButtons(Math.max(getBetInput() - bb, bb));

});

$('#bai').on('click', () => {
    handleBetSliderButtons(getStack());
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
    if (event.keyCode === 66 && !$('#back').hasClass('collapse')) {
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
        console.log('gmra', getMinRaiseAmount());
        console.log('gs', getStack());
        console.log('opms', tableState.table.otherPlayersMaxStack(tableState.player.playerName));
        slider.max = Math.min(tableState.player.bet + tableState.player.chips, tableState.table.otherPlayersMaxStack(tableState.player.playerName));

        // Update the current slider value (each time you drag the slider handle)
        slider.oninput = function () {
            output.value = this.value;
            output.focus();
        }
    }
});

$('#raiseplus').on('click', () => {
    let output = document.getElementById("raise-input-val");
    let bb = getBigBlind();
    let maxval = getStack();
    handleRaiseSliderButtons(Math.min(parseInt(output.value) + bb, maxval));
});

$('#raiseminus').on('click', () => {
    let bb = getBigBlind();
    handleRaiseSliderButtons(Math.max(getRaiseInput() - bb, getMinRaiseAmount()));
});

$('#rai').on('click', () => {
    handleRaiseSliderButtons(getStack());
});

$('#rthp').on('click', () => { 
    let valormr = Math.max(Math.floor(3 * getPotSize()), getMinRaiseAmount());
    let totalStack = getStack();
    handleRaiseSliderButtons(Math.min(valormr, totalStack));
});

$('#rtp').on('click', () => {
    let valormr = Math.max(Math.floor(2 * getPotSize()), getMinRaiseAmount());
    let totalStack = getStack();
    handleRaiseSliderButtons(Math.min(valormr, totalStack));
});

$('#rsqp').on('click', () => {
    let valormr = Math.max(Math.floor(6 * getPotSize() / 4), getMinRaiseAmount());
    let totalStack = getStack();
    handleRaiseSliderButtons(Math.min(valormr, totalStack));
});

$('#rp').on('click', () => {
    let valormr = Math.max(Math.floor(getPotSize()), getMinRaiseAmount());
    let totalStack = getStack();
    handleRaiseSliderButtons(Math.min(valormr, totalStack));
});

$('#mr').on('click', () => {
    // min raise or all in
    handleRaiseSliderButtons(Math.min(getMinRaiseAmount(), getStack()));
});

$('#raise-input-val').keydown(function (e) {
    e.stopPropagation();
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

const requestState = () => {
    socket.emit('request-state', {
        gameState: true,
        playerStates: true,
        handState: true,
    })
};

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

let isStraddling = false;
straddleSwitch.addEventListener('click', () => {
    isStraddling = !isStraddling;
    console.log(`straddle enabled: ${isStraddling}`);
    if (isStraddling) {
        $('#straddle-switch').html('Disable Straddling');
    } else {
        $('#straddle-switch').html('Enable Straddling');
    }
    socket.emit('straddle-switch', {
        isStraddling: isStraddling
    });
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

// function stateSnapshotHandler(data) {
//     // TODO: how should we deal with a player joining when street === 'showdown'
//     if (data.hasOwnProperty('gameState')) {
//         initializeGameState(data.gameState);
//     }
//     if (data.hasOwnProperty('playerStates'))
//         updatePlayers(data.playerStates);
//     if (data.hasOwnProperty('handState')) {
//         updateHand(data.handState);
//     }
// }

const whichStreet = (board) => {
    let street = 'deal';
    if (board.length === 3) street = 'flop';
    else if (board.length === 4) street = 'turn';
    else if (board.length === 5) street = 'river';
    return street;
};

function Game(smallBlind, bigBlind) {
    // this.smallBlind = smallBlind;
    // this.bigBlind = bigBlind;
    // this.pot = 0;
    // this.roundName = 'deal'; //Start the first round
    // this.betName = 'bet'; //bet,raise,re-raise,cap
    // this.roundBets = [];
    // this.deck = [];
    // this.board = [];
    // fillDeck(this.deck);
}

/**
 *
 * @param {number} smallBlind
 * @param {number} bigBlind
 * @param {number} minPlayers
 * @param {number} maxPlayers
 * @param {number} minBuyIn
 * @param {number} maxBuyIn
 * @param {number} straddleLimit
 * @param {number} dealer
 * @param {Player[]} allPlayers
 * @param {number} currentPlayer
 * @param {Game|null} game
 */
function initializeTable({smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn, straddleLimit, dealer, allPlayers, currentPlayer, game}) {
    // let table = new TableState(smallBlind, bigBlind, minPlayers, maxPlayers, minBuyIn, maxBuyIn, straddleLimit, dealer, allPlayers, currentPlayer, game);
    // let tableManager = new TableStateManager(table, game !== null);
    // let renderer = new TableRenderer(tableManager, null);
    // renderer.initialize();
}

class TableRenderer {
    /**
     * @param {TableStateManager} manager
     * @param {Player} player
     */
    constructor(manager, player) {
        this.manager = manager;
        this._player = player;
    }

    get player() {
        return this._player;
    }

    set player(v) {
        if (v === null) {
            logOut();
        } else {
            if (!loggedIn) {
                logIn();
            }
            if (v.isMod) {
                addModAbilities();
            } else {
                removeModAbilities();
            }
            renderHand(v.seat, )
        }
        this._player = v;
    }

    /**
     * @return {TableState}
     */
    get table() {
        return this.manager.table;
    }

    setDealer(seat) {
        setDealerSeat(seat);
        this.table.dealer = seat;
    }

    initialize() {
        this.renderBoard(false);
        this.renderPlayers();
        this.setActionSeat(this.manager.actionSeat);
        this.setDealer(this.manager.table.dealer);
        this.renderActionButtons();
    }

    setActionSeat(seat) {
        if (seat >= 0 && seat === this.player.seat)
            playSoundIfVolumeOn('action');

        $('.name').removeClass('action');
        $(`#${seat} > .name`).addClass('action');
    }

    renderActionButtons() {
        let availableActions = {
            'min-bet': false,
            'bet': false,
            'raise': false,
            'fold': false,
            'call': false,
            'start': true, // note start is true
            'check': false,
            'your-action': false,
            'straddle-switch': this.manager.getStraddleLimit() !== 0,
        };
        if (!this.manager.gameInProgress && this.player.isMod && this.manager.playersInNextHand().length >= 2) {
            availableActions['start'] = false;
            displayButtons({availableActions, canPerformPremoves: false})
        } else if (this.manager.gameInProgress && this.player !== null && this.player.inHand) {
            displayButtons(this.table.getAvailableActions(this.player.playerName));
        } else { // if player is not in hand or not in a seat
            console.log('viewer not in seat, no actions.');
            displayButtons(availableActions);
        }
    }

    renderPlayers() {
        for (let p of this.table.allPlayers) {
            if (p===null) return;
            this.renderPlayer(p);
        }
    }

    renderPlayer(p) {
        let hand = document.getElementById(p.seat);
        hand.classList.remove('hidden');
        hand.querySelector('.username').innerHTML = p.playerName;
        hand.querySelector('.stack').innerHTML = p.chips;
        const isWaiting = p.folded || !p.inHand;
        if (isWaiting) {
            outHand(p.seat);
            // $(`#${p.seat}`).find('.back-card').addClass('waiting');
        } else if (p.bet <= 0) {
            hideBet(p.seat)
        } else if (p.bet > 0) {
            showBet(p.seat, p.bet);
        }
        if (p.cards !== null && p.cards.length > 0) {
            renderHand(p.seat, p.cards, p.folded);
            // TODO: show handrankmessage on GUI
            // console.log(`player in seat ${p.seat} shows ${p.cards}. has a ${p.handRankMessage}`)
        }
    }

    // TODO: call this on('buy-in')
    updatePlayer(player) {
        this.manager.table.allPlayers[player.seat] = player;
        this.renderPlayer(player);
    }

    renderBoard(sound) {
        $('.pm-btn').removeClass('pm');
        let board = this.table.game ? this.table.game.board : [];
        let street = this.manager.getRoundName();
        dealStreet({board, street, sound});
    }

    endHand() {
        clearEarnings();
        this.removePlayers();
    }

    removePlayers() {

    }
}

// function initializeGameState(data) {
//     if (data.hasOwnProperty('dealer'))
//         setDealerSeat(data.dealer);
//     if (data.hasOwnProperty('actionSeat'))
//         setActionSeat(data.actionSeat);
//     if (data.hasOwnProperty('pot'))
//         updatePot(data.pot);
//     if (data.hasOwnProperty('street'))
//         dealStreet(data);
//
// }

let tableState = {}; // not used for rendering.
function setState(data) {
    if (data.table) {
        tableState.table = new TableState(data.table.smallBlind, data.table.bigBlind, data.table.minPlayers, data.table.maxPlayers, data.table.minBuyIn, data.table.maxBuyIn, data.table.straddleLimit, data.table.dealer, data.table.allPlayers, data.table.currentPlayer, data.table.game);
        if (data.gameInProgress && tableState.table.canPlayersRevealHands()) {
            displayButtons({availableActions: {'show-hand': true}, canPerformPremoves: false});
        }
    }
    if (data.player) {
        tableState.player = new Player(data.player.playerName, data.player.chips, data.player.isStraddling, data.player.seat, data.player.isMod)
        tableState.player.folded = data.player.folded;
        tableState.player.allIn = data.player.allIn;
        tableState.player.talked = data.player.talked;
        tableState.player.inHand = data.player.inHand;
        tableState.player.cards = data.player.cards;
        tableState.player.bet = data.player.bet;
        tableState.player.leavingGame = data.player.leavingGame;
        tableState.player.showingCards = data.player.showingCards;
    }
    tableState.gameInProgress = data.gameInProgress;
}

// let renderer = new TableRenderer(null, null); //TODO: properly instantiate
// socket.on('update-player', (data) => {
//     renderer.updatePlayer(data.player);
//     if (data.buyIn) {
//         feedback.innerHTML = '';
//         message_output.innerHTML += '<p><em>' + data.playerName + ' buys in for ' + data.stack +'</em></p>';
//     }
// });
// socket.on('update-self', (data) => {
//     renderer.updatePlayer(data);
//     renderer.player = data.player;
// });

socket.on('state-snapshot', setState);
// socket.on('update-state', stateSnapshotHandler);

socket.on('init-table', initializeTable);

const addModAbilities = () => {
    $('#quit-btn').removeClass('collapse');
    $('#buyin').addClass('collapse');
    $('#host-btn').removeClass('collapse');
    // TODO: show mod panel or set turn timer button
};

const removeModAbilities = () => {
    $('#bomb-pot').addClass('collapse');
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
    $('#host-btn').addClass('collapse');
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
            $(`#${data[i].seat}`).find('.hand-rank-message').addClass('waiting');
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

function hideSeat(seat) {
    $(`#${seat}`).addClass('hidden');
    $(`#${seat}`).find('.username').text('guest');
    $(`#${seat}`).find('.stack').text('stack');
}

// removes old players (that have busted or quit)
socket.on('remove-out-players', (data) => {
    $('.out').each(function(){
        $(this).find('.username').text('guest');
        $(this).find('.stack').text('stack');
    });
    $('.out').addClass('hidden').removeClass('out');
    // if seat passed in remove it
    if (data.hasOwnProperty('seat')){
        hideSeat(data.seat);
    }
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
    if (data.logIn)
        logIn();
    console.log('syncing board', JSON.stringify(data));
    hideBoardPreFlop();
    dealStreet(data);
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
    hideAllBets();
    dealStreet(data);
});


// renders the board (flop, turn, river)
socket.on('render-all-in', (data) => {
    $('.pm-btn').removeClass('pm');
    hideAllBets();
    renderAllIn(data.board);
});

const renderAllIn = (board) => {
    console.log(board);
    if ($('#flop').hasClass('hidden')) {
        showFlop(board);
        playSoundIfVolumeOn('flop');
        setTimeout(() => {
            renderAllIn(board);
        }, 1200);
    } else if ($('#turn').hasClass('hidden')) {
        showTurn(board);
        playSoundIfVolumeOn('turn');
        setTimeout(() => {
            renderAllIn(board);
        }, 1800);
    } else {
        showRiver(board);
        playSoundIfVolumeOn('river');
    }
};

socket.on('update-rank', (data) => {
    // TODO: update rank on front end
    console.log(`hand rank update: ${data.handRankMessage}`)
    renderHandRank(data.seat, data.handRankMessage);
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
    renderHand(data.seat, data.cards, data.folded);
    renderHandRank(data.seat, data.handRankMessage);
});

// removes the waiting tag from player
socket.on('game-in-progress', (data) => {
    console.log(data.waiting);
    if (!data.waiting) {
        $('.back-card').removeClass('waiting');
        $('.hand-rank-message').removeClass('waiting');
    }
});

// updates stack when a bet is placed, for example
socket.on('update-stack', (data) => {
    let hand = document.getElementById(data.seat);
    hand.querySelector('.stack').innerHTML = data.stack;
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
    $('.back-card').removeClass('waiting');
    $('.hand-rank-message').removeClass('waiting');
    $('#start').addClass('collapse');
});

const setActionSeat = (seat) => {
    $('.name').removeClass('action');
    $(`#${seat} > .name`).addClass('action');
};

// changes that person to the person who has the action
socket.on('action', (data) => {
    setActionSeat(data.seat);
});

// renders available buttons for player
socket.on('render-action-buttons', (data) => {
    displayButtons(data);
});

const setDealerSeat = (seat) => {
    $('.dealer').remove();
    if (seat != -1){
        $(`#${seat} > .name`).append('<span class="dealer">D</span>');
    }
}

// adds dealer chip to seat of dealer
socket.on('new-dealer', (data) => {
    setDealerSeat(data.seat);
});

// changes color of players not in last hand to red (folded, buying in, etc)
// also flips hands back to red if they werent
socket.on('nobody-waiting', (data) => {
    inHand();
});

// ---------------------------------action buttons --------------------------------------------------------
// calls
socket.on('call', (data) => {
    outputEmphasizedMessage(data.username + ' calls');
    playSoundIfVolumeOn('bet');
    let prevAmount = parseInt($('.player-bet').eq(data.seat).html());
    showBet(data.seat, data.amount + prevAmount);
});

// check
socket.on('check', (data) => {
    outputEmphasizedMessage(data.username + ' checks');
    playSoundIfVolumeOn('check');
    if ($('#flop').hasClass('hidden') && !$('.player-bet').eq(data.seat).hasClass('hidden')) {
        console.log('big blind player closing action');
    }
    else {
        // let prevAmount = parseInt($('.player-bet').eq(data.seat).html());
        showBet(data.seat, 'check');
    }
});

// fold
socket.on('fold', (data) => {
    outputEmphasizedMessage(data.username + ' folds');
    playSoundIfVolumeOn('fold');

    let cards = null;
    if (data.seat === tableState.player.seat) {
        cards = tableState.player.cards;
    }
    // renders grayed out cards if this user folded. renders turned-over grey cards if a different user folded.
    renderCardsForSeat(cards, data.seat, false);
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
    let prevAmount = parseInt($('.player-bet').eq(data.seat).html());
    console.log(`prev amount: ${prevAmount}`);
    showBet(data.seat, data.amount + prevAmount);
});

// socket.on('straddle', (data) => {
//     outputEmphasizedMessage(data.username + ' straddles ' + data.amount);
//     // TODO: do we want a different sound effect for straddle?
//     playSoundIfVolumeOn('bet');
//     // prevAmount != 0 if player is small blind or big blind
//     let prevAmount = parseInt($('.player-bet').eq(data.seat).html());
//     console.log(`prev amount: ${prevAmount}`);
//     showBet(data.seat, data.amount + prevAmount);
// });

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

// user's action (alert with sound)
socket.on('initial-bets', function(data){
    console.log(data);
    let seats = data.seats;
    for (let i = 0; i < seats.length; i++){
        showBet(seats[i].seat, seats[i].bet);
    }
});

socket.on('alert', function(data) {
    alert(data.message);
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

function renderCardsForSeat(cards, seat, inHand) {
    console.log('c', cards);
    // if we do not know what the card is, show the back side of the card.
    if (!cards || cards.length < 1 || cards[0] === null) {
        if (!inHand) {
            outHand(seat);
        } else {
            renderCardbackForHand(seat);
        }
    } else {
        renderHand(seat, cards, !inHand);
    }
}

const getColor = (input) => 'SC'.includes(input) ? 'black' : 'red';

const flipCard = (name) => {
    setTimeout(() => {
        $(`#${name}`).find('.back-card').addClass('hidden');
        $(`#${name}`).find('.card-topleft').removeClass('hidden');
        $(`#${name}`).find('.card-bottomright').removeClass('hidden');
    }, 250);
};

const outHand = (seat) => {
    $(`#${seat}`).find('.back-card').removeClass('hidden').addClass('waiting');
    $(`#${seat}`).find('.hand-rank-message').addClass('waiting');
    $(`#${seat} > .left-card > .card`).removeClass('black').addClass('black');
    $(`#${seat} > .left-card`).find('.card-corner-rank').html('A');
    $(`#${seat} > .left-card`).find('.card-corner-suit').html('S');
    $(`#${seat} > .right-card > .card`).removeClass('black').addClass('black');
    $(`#${seat} > .right-card`).find('.card-corner-rank').html('A');
    $(`#${seat} > .right-card`).find('.card-corner-suit').html('S');
    $(`#${seat}`).find('.card-topleft').addClass('hidden');
    $(`#${seat}`).find('.card-bottomright').addClass('hidden');
};

// renderCardbackForHand does what inHand does but for one seat
const renderCardbackForHand = (seat) => {
    renderInHand($(`#${seat}`));
};

const renderInHand = (locator) => {
    locator.find('.back-card').removeClass('waiting');
    locator.find('.card').removeClass('red').removeClass('folded').addClass('black');
    locator.find('.card').removeClass('red').removeClass('folded').addClass('black');
    locator.find('.card-corner-rank').html('A');
    locator.find('.card-corner-suit').html('S');
    locator.find('.card-topleft').addClass('hidden');
    locator.find('.card-bottomright').addClass('hidden');
    locator.find('.back-card').removeClass('hidden');
    locator.find('.hand-rank-message-container').addClass('collapse');
};

const inHand = () => {
    $('.hand').find('.back-card').removeClass('waiting');
    $('.hand-rank-message').removeClass('waiting');
    $('.card').removeClass('red').removeClass('folded').addClass('black');
    $('.hand-rank-message').removeClass('folded')
    $('.hand-rank-message-container').addClass('collapse')
    $('.card-corner-rank').html('A');
    $('.card-corner-suit').html('S');
    $('.card-topleft').addClass('hidden');
    $('.card-bottomright').addClass('hidden');
    $('.back-card').removeClass('hidden');
};

// TODO: grey out the cards if folded is true to indicate which players
// have folded
const renderHand = (seat, cards, folded) => {
    let leftCardRank = (cards[0].charAt(0) == 'T') ? '10' : cards[0].charAt(0);
    let leftCardSuit = getSuitSymbol(cards[0].charAt(1));
    let leftCardColor = getColor(cards[0].charAt(1));
    let rightCardRank = (cards[1].charAt(0) == 'T') ? '10' : cards[1].charAt(0);
    let rightCardSuit = getSuitSymbol(cards[1].charAt(1));
    let rightCardColor = getColor(cards[1].charAt(1));

    console.log('scf', seat, cards, folded);
    if (folded) {
        $(`#${seat}`).find('.card').addClass('folded');
        $(`#${seat}`).find('.hand-rank-message').addClass('folded');
    } else {
        $(`#${seat}`).find('.card').removeClass('folded');
        $(`#${seat}`).find('.hand-rank-message').removeClass('folded');
    }

    $(`#${seat}`).find('.back-card').addClass('hidden');
    $(`#${seat} > .left-card > .card`).removeClass('black').addClass(leftCardColor);
    $(`#${seat} > .left-card`).find('.card-corner-rank').html(leftCardRank);
    $(`#${seat} > .left-card`).find('.card-corner-suit').html(leftCardSuit);
    $(`#${seat} > .right-card > .card`).removeClass('black').addClass(rightCardColor);
    $(`#${seat} > .right-card`).find('.card-corner-rank').html(rightCardRank);
    $(`#${seat} > .right-card`).find('.card-corner-suit').html(rightCardSuit);
    $(`#${seat}`).find('.card-topleft').removeClass('hidden');
    $(`#${seat}`).find('.card-bottomright').removeClass('hidden');
};

const renderHandRank = (seat, handRankMessage) => {
    // hacky fix
    if (!handRankMessage) {
        console.log('here oh no!');
        handRankMessage = "high card";
    }
    $(`#${seat}`).find('.hand-rank-message-container').removeClass('collapse');
    $(`#${seat}`).find('.hand-rank-message').html(handRankMessage);
}

const showWinnings = (winnings, seat) => {
    console.log('show winnings');
    console.log(winnings);
    console.log(seat);
    $(`#${seat}`).find('.earnings').html(`+${winnings}`);
    $(`#${seat}`).find('.earnings').removeClass('hidden');
};

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
};

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
    if (biggestBet == getBigBlind()) {
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
    let pot = parseInt($("#pot-amount").html()) || 0;
    $('.player-bet').each(function () {
        if (!$(this).hasClass('hidden')) {
            let bet = parseInt($(this).html());
            pot += bet;
        }
    });
    return pot;
};

//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
//add hands and bets to table --------------------------------------------------------------------------------
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
        var y = Math.round(height / 2 + radius * (1.30 * Math.sin(angle)) - $(this).height() / 2) + 10;
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
            let position = document.getElementsByClassName('field')[i];
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
        var y = Math.round(height / 2 + radius * (1.05 * Math.sin(angle)) - $(this).height() / 2) - 10;
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
    document.getElementById("host-page").style.width = "100%";
}

let renderGamePrefVals = () => {
    $('#checkbp').prop("checked", false);
    $('#smallblind-input').val(getSmallBlind());
    $('#bigblind-input').val(getBigBlind());
    $('#straddle-input').val('');
}

let renderHostPlayerVals = () => {
    //TODO
    for (let i = 0; i < 10; i++) {
        let rowplayerid = `#player${i}`
        $(rowplayerid).addClass('collapse');
        let seat = `#${i}`
        if (!$(seat).hasClass('hidden')){
            let name = $(seat).find('.username').html();
            let stack = parseInt($(seat).find('.stack').html());
            console.log(name);
            console.log('stack', stack);
            // console.log($(rowplayerid).find('.playername-input'));
            $(rowplayerid).find('.playername-input').val(name);
            $(rowplayerid).find('.stack-input').val(stack);
            $(rowplayerid).removeClass('collapse');
        }
    }
    // iterate through each seat
    //      if seat has player have him show up as a row with name and stack
}

let closeGamePrefVals = () => {
    $('#successfully-submitted').addClass('collapse');
    $('#game-pref-form').removeClass('collapse');
    $('.game-pref').addClass('collapse');
}

let closePlayerVals = () => {
    $('#successfully-submitted-players').addClass('collapse');
    $('.player-rows').removeClass('collapse');
    $('.players-host-page').addClass('collapse');
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
    closePlayerVals();
});

$('#host-players-btn').click(() => {
    $('#successfully-submitted-players').addClass('collapse');
    $('.player-rows').removeClass('collapse');
    $('.players-host-page').removeClass('collapse');
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

    // fetch(`${window.location.href}session`, {
    //         method: 'POST',
    //         body: JSON.stringify(game),
    //         headers: {
    //             'content-type': 'application/json'
    //         }
    //     }).then(res => res.json())
    //     .then(data => {
    //         if (!data.isValid) {
    //             alert(data.message);
    //         } else {
    //             //   console.log(data.shortid);
    //             window.location.href = `/session/${data.shortid}`;
    //         }
    //     });
    handleUpdatedGamePreferences(gamePref);
});

let handleUpdatedGamePreferences = (gamePref) => {
    // todo: update big blind, small blind for next turn, if things change
    let bb = gamePref.bigBlind;
    let sb = gamePref.smallBlind;
    if (bb != getBigBlind() || sb != getSmallBlind){
        socket.emit('update-blinds-next-round', {smallBlind: sb, bigBlind: bb});
    }
    // todo: update straddle rules if selected for next turn
    // todo: queue bombpot for next hand
}

socket.on('update-header-blinds', (data) => {
    console.log(data);
    $('#sb').html(data.smallBlind);
    $('#bb').html(data.bigBlind);
});