import React, {Component} from "react";

export function getMinRaiseAmount ({table}) {
    let minRaiseAmount = 0;
    let bets = table.players.map(p => p.bet);
    let biggestBet = Math.max(...bets)|| 0;
    let secondBiggestBet = Math.max(...bets.filter(b=>b<biggestBet)) || 0;

    // if the biggest bet is the bb then double it
    if (biggestBet === table.bigBlind) {
        minRaiseAmount = biggestBet + biggestBet;
        console.log('minRaiseAmount = biggestBet + biggestBet');
    } else {
        minRaiseAmount = 2 * (biggestBet - secondBiggestBet) + secondBiggestBet;
        console.log('2b', biggestBet, secondBiggestBet);
    }
    return minRaiseAmount;
}
export class RaiseButtonContainer extends Component {
    constructor(props) {
        super(props);
        this.handleBetButtonClick=this.handleBetButtonClick.bind(this);
        this.betButtonValues = {
            'mr': () => { return getMinRaiseAmount({table: this.props.table})},
            'rp': this.getPotSize,
            'rsqp': () => { return 6 * this.getPotSize() / 4},
            'rtp': () => { return 2 * this.getPotSize()},
            'rthp': () => { return 3 * this.getPotSize()},
            'rai': () => { return this.props.table.maxBetPossible(this.props.player.playerName)},
        };
    }
    handleBetButtonClick(event) {
        let betAmount = this.betButtonValues[event.target.id]();
        this.props.setInputValue(betAmount);
    }
    getBigBlind() {
        return this.props.table.bigBlind;
    }
    getPotSize() {
        return this.props.table.game.pot + this.props.table.players.map(p => p.bet).reduce((acc, cv) => acc + cv) || 0
    }
    render() {
        return (
            <div className="row">
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="mr">min</button>
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="rp">pot</button>
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="rsqp">1.5x pot</button>
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="rtp">2x pot</button>
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="rthp">3x pot</button>
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="rai">all in</button>
            </div>
        );
    }
}


export class BetButtonContainer extends Component {
    constructor(props) {
        super(props);
        this.handleBetButtonClick=this.handleBetButtonClick.bind(this);
        this.betButtonValues = {
            'betplus': () => {return Math.min(this.props.inputValue + this.getBigBlind(), this.props.table.maxBetPossible(this.props.player.playerName))},
            'betminus': () => {return Math.max(this.props.inputValue - this.getBigBlind(), this.getBigBlind())},
            'bai': () => {return this.props.table.maxBetPossible(this.props.player.playerName)},
            'bp': () => {return this.getPotSize()},
            'btqp': () => {return Math.floor(3 * this.getPotSize() / 4)},
            'bhp': () => {return Math.floor(this.getPotSize() / 2)},
            'bqp': () => {return Math.max(Math.floor(this.getPotSize() / 4), this.getBigBlind())},
            'mb': () => {return this.getBigBlind()},
        }
    }
    handleBetButtonClick(event) {
        let betAmount = this.betButtonValues[event.target.id]();
        this.props.setInputValue(betAmount);
    }
    getBigBlind() {
        return this.props.table.bigBlind;
    }
    getPotSize() {
        return this.props.table.game.pot + this.props.table.players.map(p => p.bet).reduce((acc, cv) => acc + cv) || 0
    }
    render() {
        return (
            <div className="row">
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="mb">min bet</button>
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="bqp">1/4 pot</button>
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="bhp">1/2 pot</button>
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="btqp">3/4 pot</button>
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="bp">pot</button>
                <button onClick={this.handleBetButtonClick} className="qwe button-primary" id="bai">all in</button>
            </div>
        )
    }
}

export function RaiseMinusButton({inputValue, setInputValue, table, player}) {
    const onClick= (e) => {
        setInputValue(Math.max(inputValue - table.bigBlind, getMinRaiseAmount({table})));
    }
    return (<button onClick={onClick} className="button-primary" id="raiseminus">-</button>);
}
export function RaisePlusButton({inputValue, setInputValue, table, player}) {
    const onClick= (e) => {
        setInputValue(Math.min(inputValue + table.bigBlind, table.maxBetPossible(player.playerName)));
    }

    return (<button onClick={onClick} className="button-primary" id="raiseplus">+</button>);
}
export function BetMinusButton({inputValue, setInputValue, table, player}) {
    const onClick= (e) => {
        setInputValue(Math.max(inputValue - table.bigBlind, table.minimumBetAllowed(player.playerName)));
    }
    return (<button onClick={onClick} className="button-primary" id="betminus">-</button>);
}
export function BetPlusButton({inputValue, setInputValue, table, player}) {
    const onClick= (e) => {
        setInputValue(Math.min(inputValue + table.bigBlind, table.maxBetPossible(player.playerName)));
    }

    return (<button onClick={onClick} className="button-primary" id="betplus">+</button>);
}

export default class BetActions extends Component {
    constructor(props) {
        super(props);
        this.handleBetInputChange=this.handleBetInputChange.bind(this);
        this.handleSubmit=this.handleSubmit.bind(this);
        // this.inputId = this.inputId.bind(this);
    }
    handleBetInputChange(event) {
        this.props.setInputValue(parseInt(event.target.value));
    }
    handleSubmit(e) {
        // TODO: this could cause the value to not be copied to bet-input-val
        // e.stopPropagation();
        // e.preventDefault();
        console.log('keydown in bet-input-val: ' + e.keyCode);
        // enter key
        if (e.keyCode === 13) {
            if (this.props.placeBet(this.props.inputValue)) {
                this.props.toggleSlider();
            }
        }
        // b key (back)
        if (e.keyCode === 66 && !this.props.collapse) {
            this.props.toggleSlider();
        }
    }
    get inputId() {
        return this.props.actionKind+"-input-val";
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.inputValue !== prevProps.betInputValue) {
            document.getElementById(this.inputId).focus();
        }
    }
    componentDidMount() {
        document.getElementById(this.inputId).addEventListener('keydown', this.handleSubmit)
    }
    componentWillUnmount() {
        document.getElementById(this.inputId).removeEventListener('keydown', this.handleSubmit)
    }
    render() {
        let betMinus, betPlus, betButtons, sliderMin;
        let sliderId = this.props.actionKind + 'slider';
        let inputId = this.inputId;
        let rangeId = this.props.actionKind + "Range";
        let actionsId = this.props.actionKind + "-actions";
        if (this.props.actionKind === 'bet') {
            sliderMin = this.props.table.minimumBetAllowed(this.props.player.playerName);
            betMinus = <BetMinusButton setInputValue={this.props.setInputValue} inputValue={this.props.inputValue} player={this.props.player} table={this.props.table}/>
            betPlus = <BetPlusButton setInputValue={this.props.setInputValue} inputValue={this.props.inputValue} player={this.props.player} table={this.props.table}/>
            betButtons = <BetButtonContainer setInputValue={this.props.setInputValue} inputValue={this.props.inputValue} player={this.props.player} table={this.props.table}/>
        } else if (this.props.actionKind === 'raise') {
            sliderMin = Math.min(getMinRaiseAmount({table: this.props.table}), this.props.player.bet + this.props.player.chips);
            betMinus = <RaiseMinusButton setInputValue={this.props.setInputValue} inputValue={this.props.inputValue} player={this.props.player} table={this.props.table}/>
            betPlus = <RaisePlusButton setInputValue={this.props.setInputValue} inputValue={this.props.inputValue} player={this.props.player} table={this.props.table}/>
            betButtons = <RaiseButtonContainer setInputValue={this.props.setInputValue} inputValue={this.props.inputValue} player={this.props.player} table={this.props.table}/>
        }
        return (
            <div className={this.props.collapse?"slidecontainer collapse": "slidecontainer"} id={actionsId}>
                <input type="number" className="inputVal" id={inputId} value={this.props.inputValue} onChange={this.handleBetInputChange}/>
                <div className="betraise" id={sliderId}>
                    {betButtons}
                    <div className="row">
                        {betMinus}
                        <input type="range"
                               className="slider"
                               id={rangeId}
                               min={sliderMin}
                               max={this.props.table.maxBetPossible(this.props.player.playerName)}
                               value={this.props.inputValue}
                               onChange={this.handleBetInputChange}/>
                               {/*onInput={this.handleBetInputChange}/>*/}
                        {betPlus}
                    </div>
                </div>
            </div>
        );
    }
}