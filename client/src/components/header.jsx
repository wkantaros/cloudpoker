import React, {Component} from "react";
import '../css/stylesheet.css';
import QuitButton from "./quitbutton";
import BuyInButton from "./buyinbutton";
import GetLink from "./getlink";
import {StandUpButton, SitDownButton} from "./standupbuttons";
import VolumeIcon from "../img/volume.svg";
import MuteIcon from "../img/mute.svg";
import HostOptions, {HostButton} from "./hostoptions";

function Blinds({smallBlind, bigBlind}) {
    return (
        <div className="button disabled" id="blinds"> Blind: <span id="sb">{smallBlind}</span> / <span id="bb">{bigBlind}</span></div>
    );
}

export class VolumeControl extends Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
        this.state = {volumeOn: true};
    }
    handleClick() {
        this.setState((state, props) => ({volumeOn: !state.volumeOn}))
    }
    render() {
        let className = this.state.volumeOn? "volume on": "volume";
        let alt = this.state.volumeOn? "volume on": "volume off";
        let imgSrc = this.state.volumeOn? VolumeIcon: MuteIcon;
        return (
            <div className={className} onClick={this.handleClick}>
                <img src={imgSrc} alt={alt} id="volume-icon" height="38px" width="38px"/>
            </div>
        );
    }
}


export default class Header extends Component {
    constructor(props) {
        super(props);
        this.openHostPage = this.openHostPage.bind(this);
    }

    openHostPage() {
        if (this.props.player && this.props.player.isMod) {

        }
    }

    render() {
        let standUpStateButton = null;
        if (this.props.loggedIn && this.props.player) {
            standUpStateButton = this.props.player.standingUp ?
                <SitDownButton socket={this.props.socket} player={this.props.player}/>:
                <StandUpButton socket={this.props.socket} player={this.props.player}/>;
        }
        let hostButton = this.props.loggedIn && this.props.player && this.props.player.isMod?
            <HostButton onClick={this.openHostPage} player={this.props.player}/>:null;
        let hostOptions = this.props.loggedIn && this.props.player && this.props.player.isMod?
            <HostOptions/>:null;
        return (
            <div className="row">
                <GetLink/>
                {this.props.loggedIn && <QuitButton socket={this.props.socket} loggedIn={this.props.loggedIn}/>}
                {!this.props.loggedIn && <BuyInButton socket={this.props.socket} loggedIn={this.props.loggedIn}/>}

                {standUpStateButton}
                {hostButton}
                {hostOptions}

                <Blinds bigBlind={this.props.table.bigBlind} smallBlind={this.props.table.bigBlind}/>
                <VolumeControl/>
            </div>
        );
    }
}
