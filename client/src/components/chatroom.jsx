import React, {Component} from "react";

export class Feedback extends Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <div id="feedback">

            </div>
        );
    }
}

class ChatOutput extends Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <div id="chat-output"></div>
        );
    }
}


export default class ChatRoom extends Component {
    render() {
        return (
            <div className="c" id="c">
                <div id="buttons-above-chatroom">
                    <a onClick={this.props.openGameLog} className="button" id="game-log-opn">Log</a>
                    <a onClick={this.props.openBuyInLog} className="button" id="buyin-log-opn">Buy-ins</a>
                </div>
                <div id="chat-room">
                    <div id="chat-window">
                        <div id="chat-output"></div>
                    </div>
                    <div className="row pad u-full-width">
                        <input className="button-primary eight columns" id="message" type="text"
                               placeholder="Write message (m)"/>
                        <button className="button-primary four columns" id="send">Send</button>
                    </div>
                </div>
            </div>
        );
    }
}
