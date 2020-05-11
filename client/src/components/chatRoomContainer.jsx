import React, {Component} from "react";
import MessageInput from "./messageInput";

// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
function hashString (str) {
    let hash = 0, i, chr;
    for (i = 0; i < str.length; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export function Feedback({text}) {
    if (text)
        text = <p><em>{text}</em></p>
    return (
        <div id="feedback">
            {text}
        </div>
    );
}

function Message({text, emphasized}) {
    if (emphasized)
        return (<p><em>{text}</em></p>);
    else return <p>{text}</p>;
}

class ChatOutput extends Component {
    componentDidUpdate(prevProps, prevState, snapshot) {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.scrollTo({top: chatWindow.scrollHeight, behavior: 'smooth'});
    }
    componentDidMount() {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.scrollTo({top: chatWindow.scrollHeight, behavior: 'smooth'});
    }

    render() {
        return (
            <div id="chat-output">
                {this.props.messages.map((msg, ind)=><Message key={hashString(msg.text) + ind} text={msg.text} emphasized={msg.em}/>)}
            </div>
        );
    }
}

class ChatRoom extends Component {
    render() {
        return (
            <div id="chat-room">
                <div id="chat-window">
                    <ChatOutput messages={this.props.messages}/>
                    <Feedback text={this.props.feedbackText}/>
                </div>
                <MessageInput socket={this.props.socket}/>
            </div>
        );
    }
}

export default class ChatRoomContainer extends Component {
    render() {
        let className = this.props.collapse? "c collapse": "c";
        return (
            <div className={className} id="c">
                <div id="buttons-above-chatroom">
                    <a onClick={this.props.openGameLog} className="button" id="game-log-opn">Log</a>
                    <a onClick={this.props.openBuyInLog} className="button" id="buyin-log-opn">Buy-ins</a>
                </div>
                <ChatRoom
                    messages={this.props.messages}
                    feedbackText={this.props.feedbackText}
                    socket={this.props.socket}/>
            </div>
        );
    }
}
