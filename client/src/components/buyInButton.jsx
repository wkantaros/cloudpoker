import React, {Component} from "react";

class BuyInInfo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            playerName: '',
            stackSize: '',
        }
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    handleInputChange(event) {
        const target = event.target;

        this.setState({
            [target.name]: target.value
        });
    }
    handleSubmit() {
        console.log('here!');
        let regex = RegExp(/^\w+(?:\s+\w+)*$/);
        let playerName = this.state.playerName.trim();
        let newStack = this.state.stackSize;
        if (playerName.length < 2 || playerName.length > 10) {
            alert('name must be between 2 and 10 characters');
        } else if (!regex.test(playerName)){
            alert('no punctuation in username');
        } else if (playerName === 'guest'){
            alert("'guest' cannot be a username");
        } /*else if (alreadyExistingName(playerName)){
            alert('please enter a username that is not already at the table')
        }*/ else if (!parseInt(newStack) && (parseInt(newStack) > 0)) {
            alert("Please enter valid stackinformation");
        } else {
            // logIn(false);
            // let playerName = newPlayer;
            let stack = parseInt(newStack);
            this.props.socket.emit('buy-in', {
                playerName: playerName,
                stack: stack
            });
        }
    }
    handleKeyDown(e) {
        e.stopPropagation();
        // Number 13 is the "Enter" key on the keyboard
        if (e.keyCode === 13) {
            if (this.state.playerName && (this.state.stackSize || this.state.stackSize === 0)) {
                e.preventDefault();
                this.handleSubmit();
            }
        }
    }
    componentDidMount() {
        document.getElementById('buyin-info').addEventListener('keydown', this.handleKeyDown);
    }
    componentWillUnmount() {
        document.getElementById('buyin-info').removeEventListener('keydown', this.handleKeyDown);
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.showBuyInInfo && !prevProps.showBuyInInfo) {
            document.getElementById('new-playerName').focus();
        }
    }

    render() {
        let buyInInfoClassName = this.props.showBuyInInfo? "popuptext show": "popuptext";
        return (
            <div className={buyInInfoClassName} id="buyin-info">
                <div className="row">
                    <input className="u-max-full-width" name="playerName" type="text" value={this.state.playerName} onChange={this.handleInputChange} placeholder="name" min="2" max="10" id="new-playerName"/>
                </div>
                <div className="row">
                    <input className="u-max-full-width" name="stackSize" type="number" value={this.state.stackSize} onChange={this.handleInputChange} placeholder="stack size" min="1" id="new-stack"/>
                </div>
                <div className="button-primary" id="buyin-btn" onClick={this.handleSubmit}>Submit</div>
            </div>
        );
    }
}


export default class BuyInButton extends Component {
    constructor(props) {
        super(props);
        this.state = {showBuyInInfo: false};
        this.handleClick = this.handleClick.bind(this);
        this.handleWindowMouseUp = this.handleWindowMouseUp.bind(this);
        this.handleBuyInInfoMouseUp = this.handleBuyInInfoMouseUp.bind(this);
    }
    handleClick() {
        if (!this.props.loggedIn) {
            this.setState({showBuyInInfo: true});
        }
    }
    handleWindowMouseUp(e) {
        this.setState({showBuyInInfo: false});
    }
    handleBuyInInfoMouseUp(e) {
        e.stopPropagation();
    }
    componentDidMount() {
        window.addEventListener('mouseup', this.handleWindowMouseUp);
        document.getElementById('buyin-info').addEventListener('mouseup', this.handleBuyInInfoMouseUp)
    }
    componentWillUnmount() {
        window.removeEventListener('mouseup', this.handleWindowMouseUp);
        document.getElementById('buyin-info').removeEventListener('mouseup', this.handleBuyInInfoMouseUp)
    }

    render() {
        let className = this.props.loggedIn? "button popup collapse": "button popup";
        return (
            <div className={className} id="buyin" onClick={this.handleClick}>
                <span id="txt">Join Game</span>
                <BuyInInfo socket={this.props.socket} showBuyInInfo={this.state.showBuyInInfo}/>
            </div>
        );
    }
}