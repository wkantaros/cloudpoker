import React, {Component} from "react";

export default class QuitButton extends Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
    }
    handleClick() {
        this.props.socket.emit('leave-game', {});
    }
    render() {
        let className = this.props.loggedIn? "button popup": "button popup collapse";
        return (
            <anchor className={className} id="quit-btn">Quit</anchor>
        );
    }
}