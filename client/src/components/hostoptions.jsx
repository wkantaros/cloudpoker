import React, {Component} from "react";
import $ from "jquery";

export class HostButton extends Component {
    render() {
        let className = "button";
        // if (!this.props.player || !this.props.player.isMod) className += "collapse";
        return <button className={className} id="host-btn">Host Options</button>;
    }
}

class PlayerRows extends Component {
    render() {
        let rows = [];
        for (let p of this.props.table.allPlayers) {
            if (p === null) {
                continue;
            }
            let playerid = `player${p.seat}`;
            let playerName = p.playerName;
            rows.push((
                <div className="row" id={playerid} key={p.playerName}>
                    <div className="three columns">
                        <input className="u-full-width inp playername-input" type="text" name="playername-input"
                               value={playerName} disabled/>
                    </div>
                    <div className="five columns">
                        <div className="update-stack-host">
                            <input className="u-tq-width inp stack-input" type="number" name="stack-input" value={p.chips}/>
                            <input className="button-primary update-stack-row" type="submit" value="Update Stack"/>
                        </div>
                    </div>
                    <div className="four columns">
                        <button className="kick-option-btn">Kick player</button>
                        <button className="button-primary transfer-ownership-btn">Transfer Host</button>
                    </div>
                </div>
            ));
        }
        return (
            <div className="player-rows">
                {rows}
            </div>
        );
    }
}

function HostPageHeader({active, onTabChange}) {
    let gamePrefBtnClassName = "button hd-btn";
    let hostPlayersBtnClassName = "button hd-btn";
    if (active["game-pref-btn"]) {
        gamePrefBtnClassName += " active";
    } else if (active["host-players-btn"]) {
        hostPlayersBtnClassName += " active";
    }
    return (
        <div className="hostpage-header">
            <div className="row">
                <div className="five columns">
                    <a className={hostPlayersBtnClassName} id="host-players-btn" onClick={onTabChange}>Players</a>
                </div>
                <div className="six columns">
                    <a className={gamePrefBtnClassName} id="game-pref-btn" onClick={onTabChange}>Game Preferences</a>
                </div>
                <div className="one columns">
                    <a className="button closebtn-hd" id="closeHostPage" onClick={onTabChange}>&times;</a>
                </div>
            </div>
        </div>
    );
}

class BombPotController extends Component {
    constructor(props) {
        super(props);
        this.state.bombPotNextHand = this.props.bombPotNextHand || false;
        this.handleChange = this.handleChange.bind(this);
    }
    handleChange(event) {
        this.setState({
            bombPotNextHand: event.target.checked
        });
    }
    render() {
        return (
            <label className="bomb-pot-next-hand">
                <input onChange={this.handleChange} type="checkbox" name="bombpot-nexthand" id="checkbp" checked={this.state.bombPotNextHand}/>
                <span className="label-body">Bomb pot next hand</span>
            </label>
        );
    }
}

export class GamePref extends Component {
    constructor(props) {
        super(props);
        this.state = {
            smallBlindInput: this.props.table.smallBlind,
            bigBlindInput: this.props.table.bigBlind,
            straddleInp: "",
            bombPotNextHand: this.props.bombPotNextHand || false,
            submitted: false,
        }
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleSubmit(event) {
        event.preventDefault();
        const gamePref = {
            smallBlind: parseInt(this.state.smallBlindInput) || 25,
            bigBlind: parseInt(this.state.bigBlindInput) || 50,
            straddleLimit: this.state.straddleInp,
            bombPotNextHand: this.state.bombPotNextHand
        };
        console.log(gamePref);
        // todo: update big blind, small blind for next turn, if things change
        if (gamePref.smallBlind !== this.props.table.bigBlind || gamePref.bigBlind !== this.props.table.smallBlind) {
            this.props.socket.emit('update-blinds-next-round', {smallBlind: gamePref.smallBlind, bigBlind: gamePref.bigBlind});
        }
        if (gamePref.straddleLimit !== this.props.table.straddleLimit) {
            this.props.socket.emit('update-straddle-next-round', {straddleLimit: gamePref.straddleLimit});
        }
        // todo: queue bombpot for next hand
        this.setState({submitted: true});
    }
    handleInputChange(event) {
        const target = event.target;
        const value = target.name === 'bombPotNextHand' ? target.checked : target.value;
        const name = target.name;

        this.setState({
            [name]: value
        });
    }
    render() {
        let className = this.props.collapse? "game-pref collapse": "game-pref";
        let collapseForm = !this.props.collapse && !this.state.submitted;
        let formClassName = collapseForm? "game-pref-form collapse": "game-pref-form";
        return (
            <div className={className}>
                <form id={formClassName} onSubmit={this.handleSubmit}>
                    <div className="row">
                        <div className="three columns">
                            <label htmlFor="smallblind-input">Small Blind</label>
                            <input className="u-full-width inp" type="number" id="smallblind-input"
                                   name="smallBlindInput" value={this.state.smallBlindInput} onChange={this.handleInputChange}/>
                        </div>
                        <div className="three columns">
                            <label htmlFor="bigblind-input">Big Blind</label>
                            <input className="u-full-width inp" type="number" id="bigblind-input"
                                   name="bigBlindInput" value={this.state.bigBlindInput} onChange={this.handleInputChange}/>
                        </div>
                        <div className="five columns">
                            <label htmlFor="straddle-input">Straddle Rules</label>
                            <select className="u-full-width" id="straddle-input" name="straddleInp" value={this.state.straddleInp} onChange={this.handleInputChange}>
                                <option value="" selected disabled hidden>Change straddle rules</option>
                                <option value="0">No Straddle</option>
                                <option value="1">Only straddle after bb</option>
                                <option value="-1">Can straddle if player before straddled</option>
                            </select>
                        </div>
                    </div>
                    <label className="bomb-pot-next-hand">
                        <input type="checkbox" name="bombPotNextHand" id="checkbp" checked={this.state.bombPotNextHand} onChange={this.handleInputChange}/>
                        <span className="label-body">Bomb pot next hand</span>
                    </label>
                    <BombPotController />
                    <input className="button-primary" type="submit" value="Submit"/>
                </form>
                <div id="successfully-submitted" className={!collapseForm}>
                    Sucessfully submitted, updating for next turn
                </div>
            </div>
        );
    }
}

export default class HostPage extends Component {
    constructor(props) {
        super(props);
        this.state = {active: "game-pref", submittedGamePref: false}
        // this.handleClick = this.handleClick.bind(this);
        this.setActive = this.setActive.bind(this);
        this.onGamePrefSubmit = this.onGamePrefSubmit.bind(this);
    }
    // handleClick() {
    //     this.props.socket.emit('stand-up');
    // }
    setActive(e) {
        this.setState({active: e.target.id});
    }
    onGamePrefSubmit() {
        this.setState({submittedGamePref: true});
    }

    render() {
        let gamePrefClassName = "game-pref";
        let collapseGamePref = this.state.active !== "game-pref-btn";
        // if (this.state.active === "game-pref-btn") {
        //     let collapseGamePref = false;
        //     let collapseSS = true;
        //     let collapsePlayersHostPage = true;
        //     let collapseSSp = true;
        // } else if (this.state.active === "players-host-page") {
        //     let collapseGamePref = false;
        //     let collapseSS = true;
        // }
        if (this.state.active !== "game-pref-btn") {
            gamePrefClassName += "collapse";
        }
        let playersHostPageClassName = "players-host-page";
        let sspClassName = this.state.active !== "host-players-btn"? "collapse": "";
        if (this.state.active !== "host-players-btn") {
            playersHostPageClassName += "collapse";
        }
        return (
            <div id="host-page" className="overlay">
                <HostPageHeader active={this.state.active} onTabChange={this.setActive}/>
                <div className={gamePrefClassName}>
                    <GamePref collapse={collapseGamePref} socket={this.props.socket} table={this.props.table} onSubmit={this.onGamePrefSubmit}/>
                </div>
                <div className={playersHostPageClassName}>
                    <PlayerRows table={this.props.table}/>
                    <div id="successfully-submitted-players" className={sspClassName}>
                        Sucessfully submitted, updating for next turn
                    </div>
                </div>
            </div>
        );
    }
}