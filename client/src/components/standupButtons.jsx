import React, {Component} from "react";

export class StandUpButton extends Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick() {
        this.props.socket.emit('standUp');
    }
    render() {
        let className = "button popup";
        // if (!this.props.loggedIn || this.props.player.standingUp) className += " collapse";
        return (
            <button className={className} id="standUp" onClick={this.handleClick}>Stand Up</button>
        );
    }
}

export class SitDownButton extends Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick() {
        this.props.socket.emit('sitDown');
    }
    render() {
        let className = "button popup";
        // if (!this.props.loggedIn || !this.props.player.standingUp) className += " collapse";
        return (
            <button className={className} id="sitDown" onClick={this.handleClick}>Sit Down</button>
        );
    }
}