import React, {Component} from "react";
import YourAction from "./yourAction";
import BetActions, {getMinRaiseAmount} from "./betActions";
import '../css/stylesheet.css';
import createjs from 'createjs';

const actionButtonSettings = [
    ['show-hand', 'Show Hand', 'S', 'show-hand-shortcut', 83],
    ['fold', 'Fold', 'F', 'fold-shortcut', 70],
    ['check', 'Check', 'K', 'check-shortcut', 75],
    ['back', 'Back', 'B', 'back-shortcut', 66],
    ['call', 'Call', 'c', 'call-shortcut', 67],
    ['bet', 'Bet', 'R', 'raise-shortcut', 82],
    ['min-bet', 'Bet', 'c', 'min-bet-shortcut', 67], // I made up min-bet-shortcut. It's not from the original code
    ['raise', 'Raise', 'R', 'raise-shortcut', 82],
    ['straddle-switch', 'Enable Straddling', null, null, null],
    ['start', 'Start Game', null, null, null],
];

class PremoveButton extends Component {
    constructor(props) {
        super(props);
        this.keydownListener = this.keydownListener.bind(this);
    }
    componentDidMount() {
        document.addEventListener('keydown', this.keydownListener);
    }
    componentWillUnmount() {
        document.removeEventListener('keydown', this.keydownListener);
    }
    keydownListener(event) {
        if (event.keyCode === this.props.keyCode) {
            document.getElementById(this.props.id).click();
        }
    }
    render() {
        let className = "button-primary action-btn pm-btn";
        if (this.props.isClickedPremove) className += "  pm";
        return (
            <button onClick={this.props.onClick} className={className} id={this.props.id}>{this.props.text}<span className="key-shrtct" id={this.props.shortcutId}>{this.props.shortcutKey}</span></button>
        );
    }
}

class ActionButton extends Component {
    constructor(props) {
        super(props);
        this.keydownListener = this.keydownListener.bind(this);
    }
    componentDidMount() {
        document.addEventListener('keydown', this.keydownListener);
    }
    componentWillUnmount() {
        document.removeEventListener('keydown', this.keydownListener);
    }
    keydownListener(event) {
        if (event.keyCode === this.props.keyCode && !this.props.collapse) {
            document.getElementById(this.props.id).click();
        }
    }
    render() {
        let className = 'button-primary action-btn';
        if (this.props.collapse) className += ' collapse';
        const shortcut = this.props.shortcutKey? <span className="key-shrtct" id={this.props.shortcutId}>{this.props.shortcutKey}</span>: null;
        return (<button onClick={this.props.onClick} className={className} id={this.props.id}>{this.props.text}{shortcut}</button>);
    }
}

export default class Actions extends Component {
    constructor(props) {
        super(props);
        this.state = {
            clickedPremove: null,
            premoveStreet: this.props.manager.getRoundName(),
            premoveCallAmount: -1,
            betInputValue: this.props.player? this.props.manager.table.minimumBetAllowed(this.props.player.playerName): 0,
            raiseInputValue: this.props.player? Math.min(getMinRaiseAmount({table: this.props.manager.table}), this.props.player.bet + this.props.player.chips): 0,
        };
        this.onPremoveClick = this.onPremoveClick.bind(this);
        this.getPremoves = this.getPremoves.bind(this);
        this.getActionButtons = this.getActionButtons.bind(this);
        this.onActionClick = this.onActionClick.bind(this);
        this.placeBet = this.placeBet.bind(this);
        this.placeRaise = this.placeRaise.bind(this);
        this.setBetInputValue = this.setBetInputValue.bind(this);
        this.setRaiseInputValue = this.setRaiseInputValue.bind(this);
        this.actionButtonClickHandlers = {
            'start': () => {this.props.socket.emit('start-game', {});},
            'call': () => {this.props.socket.emit('action', {amount: 0, action: 'call'});},
            'check': () => {this.props.socket.emit('action', {amount: 0, action: 'check'});},
            'fold': () => {this.props.socket.emit('action', {amount: 0, action: 'fold'});},
            'show-hand': () => {
                this.props.actionHandlers['show-hand']();
                // this.props.socket.emit('show-hand', {});
                // this.props.player.showHand();
                // re-render because show-hand should be hidden. hacky
                // this.setState(this.props.manager.getAvailableActions(this.props.player.playerName).availableActions)
            },
            'min-bet': () => {this.props.socket.emit('action', {amount: this.props.manager.table.bigBlind, action: 'bet'});},
            'bet': () => {
                if (this.props.betActionsOpen) {
                    this.placeBet();
                }
                this.props.toggleBetSlider()
            },
            'raise': () => {
                if (this.props.betActionsOpen) {
                    this.placeRaise();
                }
                this.props.toggleBetSlider()
            },
            'back': () => {if (this.props.betActionsOpen) this.props.toggleBetSlider();},
        }
        for (let i = 0; i<this.actionButtonClickHandlers.length; i++) {
            this.actionButtonClickHandlers[i] = this.actionButtonClickHandlers[i].bind(this);
        }
    }
    onPremoveClick(event) {
        event.preventDefault();
        event.stopPropagation();
        // for some buttons, such as min-bet, call, and pm-call, if a user clicks the text, event.target
        //  is a <span> tag. to access the clicked button, from which we need the ID, we use .closest('.action-btn').
        const target = event.target.closest('.action-btn');
        if (target.id === this.state.clickedPremove) {
            console.log('unclicking', target.id);
            this.setState({clickedPremove: null, premoveStreet: this.props.manager.getRoundName()});
            if (target.id === 'pm-call') {
                this.setState({premoveCallAmount: -1});
            }
        } else {
            this.setState({clickedPremove: target.id, premoveStreet: this.props.manager.getRoundName()});
            if (target.id === 'pm-call') {
                this.setState({premoveCallAmount: this.props.manager.table.getMaxBet()});
            }
        }
    }
    onActionClick(event) {
        event.preventDefault();
        event.stopPropagation();
        // for some buttons, such as min-bet, call, and pm-call, if a user clicks the text, event.target
        //  is a <span> tag. to access the clicked button, from which we need the ID, we use .closest('.action-btn').
        this.actionButtonClickHandlers[event.target.closest('.action-btn').id](event);
        this.setState({clickedPremove: null, premoveCallAmount: -1, premoveStreet: this.props.manager.getRoundName()});
    }
    componentDidMount() {
        if (this.props.volumeOn && this.props.availableActions['your-action']) {
            createjs.Sound.play('action');
        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.volumeOn && this.props.availableActions['your-action'] && !prevProps.availableActions['your-action']) {
            createjs.Sound.play('action');
        }
        // update state.clickedPremove if game state changed and previous choice
        // is no longer valid given new conditions
        let stateUpdate = {}
        const maxBet = this.props.manager.table.getMaxBet();
        if (this.state.clickedPremove === 'pm-call' && maxBet !== this.state.premoveCallAmount) {
            // don't call if someone raised after pm-call was clicked
            stateUpdate = {clickedPremove: null, premoveCallAmount: -1};
        } else if (this.state.clickedPremove === 'pm-checkfold' && this.props.player.bet < maxBet) {
            // fold if someone bet after pm-checkfold was clicked
            stateUpdate = {clickedPremove: 'pm-fold'};
        } else if (this.state.clickedPremove === 'pm-check' && this.props.player.bet < maxBet) {
            // can't check if someone bet
            stateUpdate = {clickedPremove: null};
        }
        let clickedPremove = stateUpdate.hasOwnProperty('clickedPremove')? stateUpdate.clickedPremove: this.state.clickedPremove;
        if (this.props.availableActions['your-action'] && clickedPremove) {
            console.log('have premove', clickedPremove);
            if (this.state.premoveStreet === this.props.manager.getRoundName()) {
                console.log('doing premove', clickedPremove);
                // cut off "pm-" from clickedPremove
                let actionId = clickedPremove.substring(3);
                if (actionId === 'checkfold') actionId = 'check';
                this.actionButtonClickHandlers[actionId]();
            } else console.log('not doing premove');
            stateUpdate = {clickedPremove: null, premoveCallAmount: -1, premoveStreet: this.props.manager.getRoundName()};
        }
        // apply premove state update
        if (Object.keys(stateUpdate).length > 0) this.setState(stateUpdate);

        if (!this.props.betActionsOpen) {
            let betInputValue = this.props.player? this.props.manager.table.minimumBetAllowed(this.props.player.playerName): 0;
            if (betInputValue > this.state.betInputValue) this.setState({betInputValue});
            let raiseInputValue = this.props.player? Math.min(getMinRaiseAmount({table: this.props.manager.table}), this.props.player.bet + this.props.player.chips): 0;
            if (raiseInputValue > this.state.raiseInputValue) this.setState({raiseInputValue});
        }
    }

    getPremoves() {
        let premoves = [];
        if (this.props.canPerformPremoves) {
            // f key (premove fold)
            premoves.push(this.makePremoveButton('Fold', 'pm-fold', 'F', 'fold-shortcut', 70));
            if (this.props.availableActions['check']) {
                // k key (premove check)
                premoves.push(this.makePremoveButton('Check', 'pm-check', 'K', 'check-shortcut', 75));
                // i key (premove check/fold)
                premoves.push(this.makePremoveButton('Check/Fold', 'pm-checkfold', 'I', 'check-shortcut', 73));
            }
            if (this.props.availableActions['call']) {
                let buttonText = <span>Call <span className="number">{this.props.manager.table.getMaxBet()}</span></span>;
                // c key (premove call)
                premoves.push(this.makePremoveButton(buttonText, 'pm-call', 'C', 'check-shortcut', 67));
            }

        }
        return premoves;
    }
    makePremoveButton(text, id, shortcutKey, shortcutId, keyCode) {
        return <PremoveButton key={id+shortcutKey} keyCode={keyCode} isClickedPremove={this.state.clickedPremove === id} id={id} text={text} shortcutKey={shortcutKey} shortcutId={shortcutId} onClick={this.onPremoveClick}/>;
    }
    makeActionButton(text, id, shortcutKey, shortcutId, keyCode) {
        let collapse = (this.props.betActionsOpen && !(id === 'bet' || id === 'raise' || id === 'back'));
        return <ActionButton key={id+shortcutKey} keyCode={keyCode} collapse={collapse} id={id} text={text} shortcutKey={shortcutKey} shortcutId={shortcutId} onClick={this.onActionClick}/>;
    }
    getActionButtons() {
        let actionButtons = [];
        for (let setting of actionButtonSettings) {
            const actionId = setting[0];
            if (this.props.canPerformPremoves && !(actionId === 'show-hand' || actionId === 'straddle-switch' || actionId === 'start'))
                continue;
            if (this.props.availableActions[actionId] || (actionId === 'back' && this.props.betActionsOpen)) {
                let text = setting[1];
                if (actionId === 'call') {
                    text = (<span>Call <span className="number">{this.props.manager.table.getMaxBet()}</span></span>);
                } else if (actionId === 'min-bet') {
                    text = <span>Bet <span className="number">{Math.min(this.props.player.chips + this.props.player.bet, this.props.manager.table.minimumBetAllowed(this.props.player.playerName))}</span></span>;
                }
                actionButtons.push(this.makeActionButton(text, actionId, setting[2], setting[3], setting[4]));
            }
        }
        return actionButtons;
    }
    placeRaise() {
        let raiseAmount = this.state.raiseInputValue;
        // console.log(raiseAmount);
        let minRaiseAmount = getMinRaiseAmount({table: this.props.manager.table});
        let maxRaiseAmount = this.props.player.chips;
        if (raiseAmount > maxRaiseAmount) {
            raiseAmount = maxRaiseAmount;
        }

        if (raiseAmount == maxRaiseAmount && maxRaiseAmount < minRaiseAmount) {
            console.log('all in player');
            this.props.socket.emit('action', {
                amount: raiseAmount,
                action: 'call'
            });
            return true;
        } else if (!raiseAmount || raiseAmount < minRaiseAmount) {
            alert(`minimum raise amount is ${minRaiseAmount}`);
        } else if (raiseAmount == maxRaiseAmount) { // player is going all in
            this.props.socket.emit('action', {
                amount: raiseAmount,
                action: 'bet'
            });
            return true;
        } else {
            this.props.socket.emit('action', {
                amount: raiseAmount,
                action: 'raise'
            });
            return true;
        }
        return false;
    }
    placeBet() {
        let betAmount = this.state.betInputValue;
        let minBetAmount = this.props.manager.table.minimumBetAllowed(this.props.player.playerName);
        let maxBetAmount = this.props.manager.table.maxBetPossible(this.props.player.playerName);
        if (betAmount > maxBetAmount) { // if player bet more than max amount, bet max amount
            betAmount = maxBetAmount;
        } else if ((!betAmount && betAmount !== 0) || betAmount < minBetAmount) { // if player did not enter a bet or player bet < min bet
            alert(`minimum bet size is ${minBetAmount}`);
            return false;
        }
        this.props.socket.emit('action', {
            amount: betAmount,
            action: 'bet'
        });
        if (this.props.betActionsOpen) {
            this.props.toggleBetSlider();
        }
        return true;
    }
    setBetInputValue(amount) {
        this.setState({betInputValue: amount || amount === 0? amount : ''});
    }
    setRaiseInputValue(amount) {
        this.setState({raiseInputValue: amount || amount === 0? amount : ''});
    }
    render() {
        let showBetActions = this.props.availableActions['bet'] && !this.props.canPerformPremoves;
        let showRaiseActions = this.props.availableActions['raise'] && !this.props.canPerformPremoves;
        return (
            <div className="actions">
                {this.props.availableActions['your-action'] &&
                <YourAction/>}
                <div className="row">
                    {this.getActionButtons()}

                    {showBetActions &&
                    <BetActions placeBet={this.placeBet}
                                player={this.props.player}
                                manager={this.props.manager}
                                toggleSlider={this.props.toggleBetSlider}
                                collapse={!this.props.betActionsOpen}
                                inputValue={this.state.betInputValue}
                                actionKind="bet"
                                setInputValue={this.setBetInputValue}/>}
                    {showRaiseActions &&
                    <BetActions placeBet={this.placeRaise}
                                player={this.props.player}
                                manager={this.props.manager}
                                toggleSlider={this.props.toggleBetSlider}
                                collapse={!this.props.betActionsOpen}
                                inputValue={this.state.raiseInputValue}
                                actionKind="raise"
                                setInputValue={this.setRaiseInputValue}/>}

                    {this.getPremoves()}
                </div>
            </div>
        );
    }
}
