import React, {Component} from "react";
import createjs from 'createjs';
import FoldSound from "../audio/fold1.wav";
import CheckSound from "../audio/check.wav";
import ChipsStackSound from "../audio/chipsStack4.wav";

export default class GameLog extends Component {
    constructor(props) {
        super(props);
        this.state = {
            messageCache: [],
            cursor: 0,
        };
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.printToGameLog = this.printToGameLog.bind(this);
        this.playSoundIfVolumeOn = this.playSoundIfVolumeOn.bind(this);

        this.messageFormatters = {
            'bet': data => data.playerName + ' bets ' + data.amount + '.\n',
            'raise': data => data.playerName + ' raises ' + data.amount + '.\n',
            'call': data => data.playerName + ' calls.\n',
            'check': data => data.playerName + ' checks.\n',
            'fold': data => data.playerName + ' folds.\n',
            'sitDown': data => data.playerName + ' sits down.\n',
            'standUp': data => data.playerName + ' stands up.\n',
            'setSeed': data => 'The SHA256 hash for ' + data.playerName + '\'s new RNG seed is ' + data.playerSeedHash + '. The SHA256 hash for the table seed is now ' + data.tableSeedHash + '.',
            'removePlayer': data => `${data.playerName} has left the game (finishing stack: ${data.stack})\n`,
            'action': data => this.messageFormatters[data.action](data),

            'buy-in': data => {
                // let message = data.playerName + ' buys in for ' + data.stack + `. SHA256 hash for ${data.playerName}'s seed is ${data.playerSeedHash}.`;
                // if (data.tableSeedHash) message += ` Table seed hash is ${data.tableSeedHash}.`;
                let message = data.playerName + ' buys in for ' + data.stack;
                message += '\n';
                return message;
            },
            'new-round': () => 'Starting new round.',
            'log-winner': (data) => {
                let message = `${data.playerName} wins a pot of ${data.amount}!`;
                if (data.cards) message += ` ${data.handRankMessage}: ${data.cards}.\n`;
                return message;
            },
        }
        this.messageListeners = {
            'action': data => this.messageListeners[data.action](data),
            'message-batch': ({log}) => {
                this.printToGameLog(...log.map(data => this.messageFormatters[data.logEvent](data)));
            },
            'get-game-log': ({cursor, log}) => {
                console.log('log', log);
                this.messageListeners['message-batch']({log});
                this.setState({cursor: parseInt(cursor)});
            }
        }
        let soundEvents = {bet: 'bet', raise: 'bet', call: 'bet', check: 'check', fold: 'fold'};
        for (let event of Object.keys(this.messageFormatters)) {
            if (soundEvents.hasOwnProperty(event)) {
                this.messageListeners[event] = (data) => {
                    this.printToGameLog(this.messageFormatters[event](data));
                    this.playSoundIfVolumeOn(soundEvents[event]);
                }
            } else {
                this.messageListeners[event] = (data) => {
                    this.printToGameLog(this.messageFormatters[event](data));
                }
            }
        }
    }
    playSoundIfVolumeOn(soundName) {
        if (this.props.volumeOn) {
            createjs.Sound.play(soundName);
        }
    }
    printToGameLog(...messages) {
        this.setState(prevState => {
            return {messageCache: [...prevState.messageCache, ...messages]};
        });
    }
    componentDidMount() {
        createjs.Sound.registerSound('/client/dist/' + FoldSound, 'fold');
        createjs.Sound.registerSound('/client/dist/' + CheckSound, 'check');
        createjs.Sound.registerSound('/client/dist/' + ChipsStackSound, 'bet');

        for (const event in this.messageListeners) {
            this.props.socket.on(event, this.messageListeners[event]);
        }
        this.props.socket.emit('get-game-log', {cursor: 0});

        const logWindow = document.getElementById('game-log-text');
        logWindow.scrollTo({top: logWindow.scrollHeight, behavior: 'smooth'});
    }
    componentWillUnmount() {
        for (const event in this.messageListeners) {
            this.props.socket.off(event, this.messageListeners[event]);
        }
        createjs.Sound.removeSound('fold');
        createjs.Sound.removeSound('check');
        createjs.Sound.removeSound('bet');
    }
    handleKeyDown(e) {
        // esc key
        if (e.keyCode === 27) {
            e.stopPropagation();
            this.props.onClose(e);
        }
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.width === "100%" && this.props.width !== prevProps.width) {
            document.addEventListener('keydown', this.handleKeyDown);
        } else if (this.props.width !== "100%" && this.props.width !== prevProps.width) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }

        const logWindow = document.getElementById('game-log-text');
        logWindow.scrollTo({top: logWindow.scrollHeight, behavior: 'smooth'});
    }
    render() {
        return (
            <div id="game-log" className="overlay" style={{width: this.props.width}}>
                <a onClick={this.props.onClose} className="closebtn" id="closeLog">&times;</a>
                <div className="game-log-page overlay-content">
                    <div className="h"><h2>Game Log</h2></div>
                    <div id="game-log-text">
                        {this.state.messageCache.map((val, ind) => <LogLine key={ind}>{val}</LogLine>)}
                    </div>
                </div>
            </div>
        );
    }
}

function LogLine({children}) {
    return (
        <p>{children}</p>
    );
}
