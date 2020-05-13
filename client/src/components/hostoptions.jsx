import React, {Component} from "react";
import HostPageHeader from "./hostPageHeader";

export class HostButton extends Component {
    render() {
        let className = "button";
        // if (!this.props.player || !this.props.player.isMod) className += "collapse";
        return <button className={className} id="host-btn" onClick={this.props.onClick}>Host Options</button>;
    }
}

class PlayerRows extends Component {
    constructor(props) {
        super(props);
        this.state = {
            playerStacks: this.props.table.allPlayers.map(p=>p===null?null:{playerName: p.playerName, chips: p.chips})
        }
        this.handleUpdateStackSubmit = this.handleUpdateStackSubmit.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.transferHost = this.transferHost.bind(this);
        this.kickPlayer = this.kickPlayer.bind(this);
    }
    handleUpdateStackSubmit(e) {
        let seat = parseInt(e.target.closest('row').id.substring(6));
        let newStackAmount = this.state.playerStacks[seat].chips;
        this.props.socket.emit('update-player-stack', {seat, newStackAmount});
        this.props.onSubmit(e);
    }
    handleInputChange(event) {
        const target = event.target;
        if (target.name === "stack-input") {
            this.setState((state, props) => {
                let stateCopy = Array.from(state.playerStacks);
                let seat = parseInt(event.target.closest('row').id.substring(6));
                stateCopy[seat] = Object.assign(stateCopy[seat], {chips: parseInt(event.target.value)})
                this.setState({playerStacks: stateCopy})
            })
        } else {
            this.setState({
                [target.name]: target.value
            });
        }
    }
    transferHost(e) {
        let seat = parseInt(e.target.closest('row').id.substring(6));
        this.props.socket.emit('transfer-host', {seat});
        this.props.closeHostPage();
    }
    kickPlayer(e) {
        let seat = parseInt(e.target.closest('row').id.substring(6));
        this.props.socket.emit('kick-player', {seat});
        this.props.closeHostPage();
    }
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
                            <input className="u-tq-width inp stack-input" type="number" name="stack-input" onChange={this.handleInputChange} value={this.state.playerStacks[p.seat].chips}/>
                            <input className="button-primary update-stack-row" type="submit" value="Update Stack" onClick={this.handleUpdateStackSubmit}/>
                        </div>
                    </div>
                    <div className="four columns">
                        <button className="kick-option-btn" onClick={this.kickPlayer}>Kick player</button>
                        <button className="button-primary transfer-ownership-btn" onClick={this.transferHost}>Transfer Host</button>
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

class BombPotController extends Component {
    constructor(props) {
        super(props);
        this.state = {bombPotNextHand: this.props.bombPotNextHand || false};
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
        }
        this.handleInputChange = this.handleInputChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
    }
    onSubmit(e) {
        e.preventDefault();
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
        this.props.onSubmit(e);
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
        let collapseForm = this.props.collapse || this.props.submitted;
        let formClassName = collapseForm? "collapse": "";
        return (
            <div className={className}>
                <form id="game-pref-form" onSubmit={this.onSubmit} className={formClassName}>
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
                                <option value="" disabled hidden>Change straddle rules</option>
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
                    {/*<BombPotController />*/}
                    <input className="button-primary" type="submit" value="Submit"/>
                </form>
                <div id="successfully-submitted" className={collapseForm? "": "collapse"}>
                    Sucessfully submitted, updating for next turn
                </div>
            </div>
        );
    }
}

export default class HostPage extends Component {
    constructor(props) {
        super(props);
        this.state = {active: "game-pref-btn", submittedGamePref: false, submittedPlayers: false}
        // this.handleClick = this.handleClick.bind(this);
        this.setActive = this.setActive.bind(this);
        this.onGamePrefSubmit = this.onGamePrefSubmit.bind(this);
        this.onUpdatePlayer = this.onUpdatePlayer.bind(this);
    }
    setActive(e) {
        if (e.target.id === "closeHostPage") {
            this.props.closeHostPage(e);
        } else {
            this.setState({active: e.target.id, submittedGamePref: false, submittedPlayers: false});
        }
    }
    onGamePrefSubmit(e) {
        this.setState({submittedGamePref: true});
    }
    onUpdatePlayer() {
        this.setState({submittedPlayers: true});
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        // if we have rendered PlayerRows for the first time or just re-opened the tab
        if (this.state.active === "host-players-btn" && prevState.active !== "host-players-btn" && !this.state.submittedPlayers) {
            let firstPlayer = this.props.table.allPlayers.find(p=>p!==null);
            if (firstPlayer) {
                document.getElementById(`player${firstPlayer.seat}`).querySelector('.stack-input').focus();
            }
        }
    }
    render() {
        let collapseGamePref = this.state.active !== "game-pref-btn";
        let playersHostPageClassName = "players-host-page";
        if (this.state.active !== "host-players-btn") {
            playersHostPageClassName += " collapse";
        }
        return (
            <div id="host-page" className="overlay" style={{width: "100%"}}>
                <HostPageHeader active={this.state.active} onTabChange={this.setActive}/>
                <GamePref collapse={collapseGamePref} socket={this.props.socket} table={this.props.table} submitted={this.state.submittedGamePref} onSubmit={this.onGamePrefSubmit}/>
                <div className={playersHostPageClassName}>
                    {!this.state.submittedPlayers &&
                    <PlayerRows table={this.props.table} onSubmit={this.onUpdatePlayer} socket={this.props.socket} closeHostPage={this.props.closeHostPage}/>}
                    {this.state.submittedPlayers &&
                    <div id="successfully-submitted-players">
                        Sucessfully submitted, updating for next turn
                    </div>}
                </div>
            </div>
        );
    }
}