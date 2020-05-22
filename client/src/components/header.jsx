import React, {Component} from "react";
import '../css/stylesheet.css';
import QuitButton from "./quitButton";
import BuyInButton from "./buyInButton";
import GetLink from "./getLink";
import {StandUpButton, SitDownButton} from "./standupButtons";
import VolumeIcon from "../img/volume.svg";
import MuteIcon from "../img/mute.svg";
import HostOptions, {HostButton} from "./hostOptions";

export function Blinds({smallBlind, bigBlind}) {
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
        this.state = {hostPageIsOpen: false};
        this.openHostPage = this.openHostPage.bind(this);
        this.closeHostPage = this.closeHostPage.bind(this);
    }
    openHostPage() {
        if (this.props.loggedIn && this.props.player.isMod) {
            this.setState({hostPageIsOpen: true});
        }
    }
    closeHostPage() {
        this.setState({hostPageIsOpen: false});
    }
    render() {
        let standUpStateButton = null;
        if (this.props.loggedIn && this.props.player) {
            standUpStateButton = this.props.player.standingUp ?
                <SitDownButton socket={this.props.socket} player={this.props.player}/>:
                <StandUpButton socket={this.props.socket} player={this.props.player}/>;
        }
        let hostButton = this.props.loggedIn && this.props.player.isMod?
            <HostButton onClick={this.openHostPage} player={this.props.player}/>:
            null;
        let hostOptions = this.state.hostPageIsOpen && this.props.loggedIn && this.props.player.isMod?
            <HostOptions socket={this.props.socket} closeHostPage={this.closeHostPage} table={this.props.table}/>:
            null;
        return (
            <div className="header u-full-width">
                <div className="row">
                    <GetLink/>
                    {this.props.loggedIn && <QuitButton socket={this.props.socket} loggedIn={this.props.loggedIn}/>}
                    {!this.props.loggedIn && <BuyInButton socket={this.props.socket} loggedIn={this.props.loggedIn}/>}

                    {standUpStateButton}
                    {hostButton}
                    {hostOptions}

                    <Blinds bigBlind={this.props.table.bigBlind} smallBlind={this.props.table.smallBlind}/>
                    <VolumeControl/>
                </div>
            </div>
        );
    }
}
