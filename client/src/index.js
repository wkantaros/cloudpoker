import {TableState, Player, GameState}  from './table-state';
import $ from 'jquery';
import 'jquery-ui/ui/widgets/resizable';
import createjs from 'createjs';
import './css/loadfonts.css';
import './css/stylesheet.css'
import './css/card.css'
import io from 'socket.io-client';
import React from 'react';
import ReactDOM from 'react-dom';
// import './index.css';
import * as serviceWorker from './serviceWorker';
import Table from "./components/table";
// File imports for webpack
import VolumeIcon from "./img/volume.svg";
import MuteIcon from "./img/mute.svg";
import ActionSound from './audio/action.ogg';
import CardPlaceSound from './audio/cardPlace1.wav';
import CheckSound from './audio/check.wav';
import ChipsStackSound from './audio/chipsStack4.wav';
import DealSound from './audio/deal.wav';
import FlopSound from './audio/flop.wav';
import FoldSound from './audio/fold1.wav';
import TurnSound from './audio/turn.wav';
import TableImage from "./components/tableimage";
import BelowTable from "./components/belowtable";
import {TableStateManager} from "./table-state-manager";
import Header from "./components/header";
// import './audio/fold2.wav';
// import RiverSound from './audio/river.wav';

let socket = io();

let host = document.getElementById('host'),
    newPlayer = document.getElementById('new-playerName'),
    newStack = document.getElementById('new-stack'),
    buyinSubmit = document.getElementById('buyin-btn'),
    buyin = document.getElementById('buyin'),
    quit = document.getElementById('quit-btn'),
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
// $(document).mouseup(function (e) {
//     let buyinInfo = $('#buyin-info');
//     // if the target of the click isn't the container nor a descendant of the container
//     if (!buyinInfo.is(e.target) && buyinInfo.has(e.target).length === 0) {
//         buyinInfo.removeClass('show');
//     }
// });

let loggedIn = false;
// $('#buyin').on('click', () => {
//     if (!loggedIn)
//         $('#buyin-info').addClass('show');
// });

/**
 * logIn hides buyin-info ("Join Game") button in header and replaces it with the quit button
 */
const logIn = (standingUp) => {
    loggedIn = true;
    // $('#buyin-info').removeClass('show');
    // $('#quit-btn').removeClass('collapse');
    // $('#buyin').addClass('collapse');
    // if (standingUp) {
    //     showSitDownButton();
    // } else {
    //     showStandUpButton();
    // }
};
//
const logOut = () => {
    loggedIn = false;
    // $('#quit-btn').addClass('collapse');
    // $('#buyin').removeClass('collapse');
    // $('#sit-down').addClass('collapse');
    // $('#stand-up').addClass('collapse');
};

// $('#buyin-btn').on('click', () => {
//     console.log('here!');
//     let regex = RegExp(/^\w+(?:\s+\w+)*$/);
//     let playerName = newPlayer.value.trim();
//     if (playerName.length < 2 || playerName.length > 10) {
//         alert('name must be between 2 and 10 characters');
//     } else if (!regex.test(playerName)){
//         alert('no punctuation in username');
//     } else if (playerName === 'guest'){
//         alert("'guest' cannot be a username");
//     } else if (alreadyExistingName(playerName)){
//         alert('please enter a username that is not already at the table')
//     } else if (!parseInt(newStack.value) && (parseInt(newStack.value) > 0)) {
//         alert("Please enter valid stackinformation");
//     } else {
//         logIn(false);
//         let playerName = newPlayer.value;
//         let stack = parseInt(newStack.value);
//         socket.emit('buy-in', {
//             playerName: playerName,
//             stack: stack
//         });
//     }
// });

// $('#buyin-info').keydown(function (e){
//     e.stopPropagation();
// });

// quit.addEventListener('click', () => {
//     socket.emit('leave-game', {});
//     logOut();
// });

// const showSitDownButton = () => {
//     $('#stand-up').addClass('collapse');
//     $('#sit-down').removeClass('collapse');
// };
//
// const showStandUpButton = () => {
//     console.log('should be removing class');
//     $('#sit-down').addClass('collapse');
//     $('#stand-up').removeClass('collapse');
// };

// standUp.addEventListener('click', () => {
//     socket.emit('stand-up');
//     showSitDownButton();
// });
//
// sitDown.addEventListener('click', () => {
//     socket.emit('sit-down');
//     showStandUpButton()
// });

// $('#getLink').click(() => copyLink());

// let copyLink = () => {
//     copyStringToClipboard(window.location.href);
//     let link = document.getElementById('getLink');
//     link.innerHTML = 'link copied!';
//     setTimeout(() => {
//         link.innerHTML = 'get sharable link'
//     }, 2000);
// };
//
// function copyStringToClipboard(str) {
//     // Create new element
//     var el = document.createElement('textarea');
//     // Set value (string to be copied)
//     el.value = str;
//     // Set non-editable to avoid focus and move outside of view
//     el.setAttribute('readonly', '');
//     el.style = {
//         position: 'absolute',
//         left: '-9999px'
//     };
//     document.body.appendChild(el);
//     // Select text inside element
//     el.select();
//     // Copy text to clipboard
//     document.execCommand('copy');
//     // Remove temporary element
//     document.body.removeChild(el);
// }

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

function isVolumeOn() {
    return $('.volume').hasClass('on');
}

// $(".volume").click( function (e) {
//     if (isVolumeOn()){
//         $('#volume-icon').attr('src', MuteIcon);
//         $('.volume').removeClass('on');
//     } else {
//         $('#volume-icon').attr('src', VolumeIcon);
//         $('.volume').addClass('on');
//     }
// } );


function playSoundIfVolumeOn(soundName) {
    if (isVolumeOn()){
        createjs.Sound.play(soundName);
    }
}

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
    // console.log('transformTable', data);
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
let messageCache = [];
let feedbackText = '';
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
    tableState.manager = new TableStateManager(tableState.table, tableState.gameInProgress);
    tableState.raceInProgress = data.raceInProgress;
    tableState.raceSchedule = data.raceSchedule;

    renderBetsAndFields();
    renderBelowTable();
    renderHeader();

    if (tableState.gameInProgress && tableState.player) {
        renderStraddleOptions(true);
    } else {
        renderStraddleOptions(false);
    }
}

socket.on('state-snapshot', setState);

// const addModAbilities = () => {
//     $('#quit-btn').removeClass('collapse');
//     $('#buyin').addClass('collapse');
//     $('#host-btn').removeClass('collapse');
//     // TODO: show mod panel or set turn timer button
// };
//
// const removeModAbilities = () => {
//     $('#host-btn').addClass('collapse');
//     $('#start').addClass('collapse');
// };

// add additional abilities for mod
// socket.on('add-mod-abilities', addModAbilities);

// socket.on('bust', (data) => {
//     logOut();
//     // remove additional abilities for mod when mod leaves
//     if (data.removeModAbilities)
//         removeModAbilities();
// });
//
// // remove additional abilities for mod when mod leaves
// socket.on('remove-mod-abilities', (data) => {
//     removeModAbilities();
// });

//incoming chat
socket.on('chat', (data) => {
    let date = new Date();
    let minutes = (date.getMinutes() < 10) ? `0${date.getMinutes()}` : `${date.getMinutes()}`;
    let time = `${date.getHours()}:${minutes} ~ `;
    outputMessage(<span><span className='info'>{time}{data.handle}</span> {data.message}</span>);
});

//somebody is typing
socket.on('typing', (data) => {
    feedbackText = data + ' is writing a message...';
    // $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
});

// player buys in
socket.on('buy-in', (data) => {
    outputEmphasizedMessage(data.playerName + ' buys in for ' + data.stack);
});

//somebody left the game
socket.on('buy-out', (data) => {
    outputEmphasizedMessage(` ${data.playerName} has left the game (finishing stack: ${data.stack})`);
    // if ($('.volume').hasClass('on')) {
    //     createjs.Sound.play('fold');
    // }
});

socket.on('stand-up', data => {
    // TODO: do we want to do anything here?
    outputEmphasizedMessage(data.playerName + ' stands up.');
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

socket.on('log-in', (data) => {
    // $('.pm-btn').removeClass('pm');
    logIn(tableState.player.standingUp);
});

// start game (change all cards to red)
socket.on('start-game', (data) => {
    $('#start').addClass('collapse');
});

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
    feedbackText = '';
    messageCache.push({text:s, em: false});
    renderBelowTable();
}

function outputEmphasizedMessage(s) {
    feedbackText = '';
    messageCache.push({text: s, em: true});
    renderBelowTable();
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
//folds-through
socket.on('folds-through', function (data) {
    outputMessage(`${data.username} wins a pot of ${data.amount}`);
    // showWinnings(data.amount, data.seat);
});

// user's action (alert with sound)
socket.on('players-action-sound', function(data){
    playSoundIfVolumeOn('action');
});

socket.on('alert', function(data) {
    alert(data.message);
});

//helper functions--------------------------------------------------------------------------------
const loadSounds = () => {
    createjs.Sound.registerSound('/client/dist/' + FoldSound, 'fold');
    createjs.Sound.registerSound('/client/dist/' + DealSound, 'deal');
    createjs.Sound.registerSound('/client/dist/' + CheckSound, 'check');
    createjs.Sound.registerSound('/client/dist/' + ChipsStackSound, 'bet');
    createjs.Sound.registerSound('/client/dist/' + FlopSound, 'flop');
    createjs.Sound.registerSound('/client/dist/' + TurnSound, 'turn');
    createjs.Sound.registerSound('/client/dist/' + CardPlaceSound, 'river');
    createjs.Sound.registerSound('/client/dist/' + ActionSound, 'action');
    createjs.Sound.volume = 0.25;
};
loadSounds();

const cleanInput = (input) => {
    return $('<div/>').text(input).html();
};

const alreadyExistingName = (playerName) => {
    return tableState.table.allPlayers.filter(p=>p!==null).map(p => p.playerName).includes(playerName);
};

const getBigBlind = () => {
    return tableState.table.bigBlind;
};

const getSmallBlind = () => {
    return tableState.table.smallBlind;
};

ReactDOM.render((
    <React.StrictMode>
        <TableImage>
            <div id="ovalparent">
            </div>
        </TableImage>
    </React.StrictMode>
), document.getElementById('table-img-root'));

function renderBetsAndFields() {
    // const ovalParent = $('#ovalparent');
    ReactDOM.render((
        <React.StrictMode>
            <Table socket={socket}
                   volumeOn={isVolumeOn()}
                   raceInProgress={tableState.raceInProgress}
                   raceSchedule={tableState.raceSchedule}
                   table={tableState.table}
                   player={tableState.player}
                   gameInProgress={tableState.gameInProgress}
                   betWidth={60}
                   betHeight={35}
                   tableWidth={$('#ovalparent').width()}
                   tableHeight={Math.floor($('#ovalparent').width()/2)}/>
        </React.StrictMode>
    ), document.getElementById('ovalparent'));
}
function renderHeader() {
    ReactDOM.render((
        <React.StrictMode>
            <Header loggedIn={tableState.player && !tableState.player.leavingGame}
                    socket={socket}
                    table={tableState.table}
                    player={tableState.player} />
        </React.StrictMode>
    ), document.getElementById('header-root'));
}
function renderBelowTable() {
    ReactDOM.render((
        <React.StrictMode>
            <BelowTable socket={socket}
                        messages={messageCache}
                        feedbackText={feedbackText}
                        player={tableState.player}
                        manager={tableState.manager}/>
        </React.StrictMode>
    ), document.getElementById('below-table-root'));
}
$(window).resize(function () {
    // createHands();
    renderBetsAndFields();
    // renderBelowTable();
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

// function openHostPage() {
//     renderGamePrefVals();
//     renderHostPlayerVals();
//     $('#game-pref-btn').click();
//     // $('#host-players-btn').click();
//     document.getElementById("host-page").style.width = "100%";
// }

// let renderGamePrefVals = () => {
//     $('#checkbp').prop("checked", false);
//     $('#smallblind-input').val(getSmallBlind());
//     $('#bigblind-input').val(getBigBlind());
//     $('#straddle-input').val('');
// }

// let renderHostPlayerVals = () => {
//     for (let i = 0; i < 10; i++) {
//         let rowplayerid = `#player${i}`
//         $(rowplayerid).addClass('collapse');
//         let seat = `#${i}`
//         if (!$(seat).hasClass('hidden')){
//             let name = $(seat).find('.username').html();
//             let stack = parseInt($(seat).find('.stack').html());
//             console.log(name);
//             console.log('stack', stack);
//             $(rowplayerid).find('.playername-input').val(name);
//             $(rowplayerid).find('.stack-input').val(stack);
//             $(rowplayerid).removeClass('collapse');
//         }
//     }
// }

// let closeGamePrefVals = () => {
//     $('#successfully-submitted').addClass('collapse');
//     $('#game-pref-form').removeClass('collapse');
//     $('.game-pref').addClass('collapse');
//     $('#game-pref-btn').removeClass('active');
// }
//
// let closePlayerVals = () => {
//     $('#successfully-submitted-players').addClass('collapse');
//     $('.player-rows').removeClass('collapse');
//     $('.players-host-page').addClass('collapse');
//     $('#host-players-btn').removeClass('active');
// }

// function closeHostPage() {
//     closeGamePrefVals();
//     closePlayerVals();
//     document.getElementById("host-page").style.width = "0%";
// }

// $('#game-pref-btn').click(() => {
//     $('#successfully-submitted').addClass('collapse');
//     $('#game-pref-form').removeClass('collapse');
//     $('.game-pref').removeClass('collapse');
//     $('#game-pref-btn').addClass('active');
//     closePlayerVals();
// });

// $('#host-players-btn').click(() => {
//     $('#successfully-submitted-players').addClass('collapse');
//     $('.player-rows').removeClass('collapse');
//     $('.players-host-page').removeClass('collapse');
//     $('#host-players-btn').addClass('active');
//     closeGamePrefVals();
//     if (!$('#player0').hasClass('collapse')){
//         $('#player0').find('.stack-input').focus();
//     }
// });

// $('#host-btn').click(() => openHostPage());
// $('#closeHostPage').click(() => closeHostPage());

// host page capabilities
// const gamePrefForm = document.getElementById('game-pref-form');
// gamePrefForm.addEventListener('submit', (event) => {
//     event.preventDefault();
//     console.log('form successfully submitted');
//     const formData = new FormData(gamePrefForm);
//     const smallBlind = parseInt(formData.get('smallblind-input')) || 25;
//     const bigBlind = parseInt(formData.get('bigblind-input')) || 50;
//     const straddleLimit = formData.get('straddle-inp');
//     const bombPotNextHand = formData.get('bombpot-nexthand') != null ? true : false;
//
//     const gamePref = {
//         smallBlind,
//         bigBlind,
//         straddleLimit,
//         bombPotNextHand
//     };
//
//     console.log(gamePref);
//     $('#successfully-submitted').removeClass('collapse');
//     $('#game-pref-form').addClass('collapse');
//     handleUpdatedGamePreferences(gamePref);
// });

// const handleUpdatedGamePreferences = (gamePref) => {
//     // todo: update big blind, small blind for next turn, if things change
//     let bb = gamePref.bigBlind;
//     let sb = gamePref.smallBlind;
//     if (bb !== getBigBlind() || sb !== getSmallBlind()){
//         socket.emit('update-blinds-next-round', {smallBlind: sb, bigBlind: bb});
//     }
//     // todo: update straddle rules if selected for next turn
//     if (gamePref.straddleLimit !== tableState.table.straddleLimit) {
//         socket.emit('update-straddle-next-round', {straddleLimit: gamePref.straddleLimit});
//     }
//     // todo: queue bombpot for next hand
// }

// $('.transfer-ownership-btn').click(function() {
//     let playerid = $(this).parents('.row').attr('id');
//     let seat = parseInt(playerid.substring(6));
//     socket.emit('transfer-host', {seat});
//     closeHostPage();
// });

// $('.update-stack-row').click(function() {
//     let playerid = $(this).parents('.row').attr('id');
//     let seat = parseInt(playerid.substring(6));
//     let newStackAmount = parseInt($(`#${playerid}`).find('.stack-input').val());
//     socket.emit('update-player-stack', {seat, newStackAmount});
//     $('#successfully-submitted-players').removeClass('collapse');
//     $('.player-rows').addClass('collapse');
// });

// socket.on('update-player-stack', (data) => {
//     console.log(data);
//     $('#sb').html(data.smallBlind);
//     $('#bb').html(data.bigBlind);
// });

// $('.kick-option-btn').click(function () {
//     let playerid = $(this).parents('.row').attr('id');
//     let seat = parseInt(playerid.substring(6));
//     socket.emit('kick-player', {
//         seat
//     });
//     closeHostPage();
// });

// socket.on('update-header-blinds', (data) => {
//     console.log(data);
//     $('#sb').html(data.smallBlind);
//     $('#bb').html(data.bigBlind);
// });

const renderStraddleOptions = (canRender) => {
    // console.log('tableState', tableState);
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
