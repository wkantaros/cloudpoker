import React, {Component} from "react";

export class StandUpButton extends Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick() {
        this.props.socket.emit('stand-up');
    }
    render() {
        let className = "button popup";
        // if (!this.props.loggedIn || this.props.player.standingUp) className += " collapse";
        return (
            <button className={className} id="stand-up">Stand Up</button>
        );
    }
}

export class SitDownButton extends Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick() {
        this.props.socket.emit('sit-down');
    }
    render() {
        let className = "button popup";
        // if (!this.props.loggedIn || !this.props.player.standingUp) className += " collapse";
        return (
            <button className={className} id="sit-down">Sit Down</button>
        );
    }
}