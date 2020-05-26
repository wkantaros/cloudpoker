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
import * as serviceWorker from './serviceWorker';
import Table from "./components/table";
// File imports for webpack
import ActionSound from './audio/action.ogg';
import CardPlaceSound from './audio/cardPlace1.wav';
import CheckSound from './audio/check.wav';
import ChipsStackSound from './audio/chipsStack4.wav';
import DealSound from './audio/deal.wav';
import FlopSound from './audio/flop.wav';
import FoldSound from './audio/fold1.wav';
import TurnSound from './audio/turn.wav';
import TableImage from "./components/tableImage";
import BelowTable from "./components/belowTable";
import {TableStateManager} from "./table-state-manager";
import Header from "./components/header";
// import './audio/fold2.wav';
// import RiverSound from './audio/river.wav';

let socket = io('/' + SESSION_ID);
socket.on('connect', () => {
    socket.emit('authenticate', { token: localStorage.getItem('token') });
    socket.on('authenticated', () => {
        console.log('authenticated');
    });
    socket.on('unauthorized', (msg) => {
        console.log(`unauthorized: ${JSON.stringify(msg.data)}`);
        throw new Error(msg.data.type);
    });
});
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
    let volumeIcons = document.getElementsByClassName('volume');
    // volumeIcons is falsy if the volume Icon has not rendered yet (only true before initial render)
    if (volumeIcons.length < 1) return true;
    // volumeIcons should always be of length 1.
    return volumeIcons[0].matches('.on');
}

function playSoundIfVolumeOn(soundName) {
    if (isVolumeOn()){
        createjs.Sound.play(soundName);
    }
}

//Listen for events--------------------------------------------------------------------------------

const setTurnTimer = (delay) => {
    socket.emit('set-turn-timer', {delay: delay});
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

const transformTable = (t) => {
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
    tableState.table = transformTable(data.table);
    tableState.player = data.player? transformPlayer(data.player): null;
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

socket.on('set-seed', ({playerName, playerSeedHash, tableSeedHash}) => {
    outputEmphasizedMessage('The SHA256 hash for ' + playerName + '\'s new RNG seed is ' + playerSeedHash + '. The SHA256 hash for the table seed is now ' + tableSeedHash + '.')
});

// player buys in
socket.on('buy-in', (data) => {
    let message = data.playerName + ' buys in for ' + data.stack + `. SHA256 hash for ${data.playerName}'s seed is ${data.playerSeedHash}.`;
    if (data.tableSeedHash) message += ` Table seed hash is ${data.tableSeedHash}.`;
    outputEmphasizedMessage(message);
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

socket.on('log-winners', function(data) {
    for (let i = 0; i < data.length; i++) {
        let message = `${data[i].playerName} wins a pot of ${data[i].amount}!`;
        if (data[i].hand) message += ` ${data[i].hand.message}: ${data[i].hand.cards} `;
        outputMessage(message);
    }
})

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
                        manager={tableState.manager}
                        volumeOn={isVolumeOn()}/>
        </React.StrictMode>
    ), document.getElementById('below-table-root'));
}
$(window).resize(function () {
    // createHands();
    if (tableState.table) renderBetsAndFields();
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
