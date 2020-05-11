import React, {Component} from "react";

export default class MessageInput extends Component {
    constructor(props) {
        super(props);
        this.state = {value: ''}
        this.handleChange = this.handleChange.bind(this);
        this.messageKeypressListener = this.messageKeypressListener.bind(this);
        this.send = this.send.bind(this);
    }
    documentKeydownListener(event) {
        // m key
        if (event.keyCode === 77) {
            event.preventDefault();
            document.getElementById('message').focus();
        }
    }
    messageKeydownListener(event) {
        // Number 13 is the "Enter" key on the keyboard
        event.stopPropagation();
        if (event.keyCode === 13) {
            if (this.state.value) {
                event.preventDefault();
                document.getElementById('message').blur();
                this.send();
            }
        }
    }
    messageKeypressListener(event) {
        this.props.socket.emit('typing');
    }
    componentDidMount() {
        document.addEventListener('keydown', this.documentKeydownListener);
        document.getElementById('message').addEventListener('keydown', this.messageKeydownListener)
        document.getElementById('message').addEventListener('keypress', this.messageKeypressListener);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.documentKeydownListener);
        document.getElementById('message').removeEventListener('keydown', this.messageKeydownListener);
        document.getElementById('message').removeEventListener('keypress', this.messageKeypressListener);
    }

    handleChange(event) {
        this.setState({value: event.target.value});
    }

    send() {
        this.props.socket.emit('chat', {message: this.state.value});
        this.setState({value: ''})
    }

    render() {
        return (
            <div className="row pad u-full-width">
                <input className="button-primary eight columns" id="message" type="text"
                       placeholder="Write message (m)" value={this.state.value} onChange={this.handleChange}/>
                <button className="button-primary four columns" id="send" onClick={this.send}>Send</button>
            </div>
        );
    }
}