import React, {Component} from "react";

class SeedInfo extends Component {
    constructor(props) {
        super(props);
        this.state = {
            nextSeedValue: '',
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
        let value = this.state.nextSeedValue.trim();
        if (value.length < 1) {
            alert('You cannot set your randomization seed to empty');
        } else if (value.length > 51) {
            // Maximum length is 2^9 === 512 (characters) // 10 (players) === 51.
            alert('Maximum seed length is 51.')
        } else {
            this.props.socket.emit('set-seed', {value});
            this.props.closeInfo();
        }
    }
    handleKeyDown(e) {
        e.stopPropagation();
        // Number 13 is the "Enter" key on the keyboard
        if (e.keyCode === 13) {
            e.preventDefault();
            this.handleSubmit();
        }
    }
    componentDidMount() {
        document.getElementById('seed-info').addEventListener('keydown', this.handleKeyDown);
    }
    componentWillUnmount() {
        document.getElementById('seed-info').removeEventListener('keydown', this.handleKeyDown);
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.showInfo && !prevProps.showInfo) {
            document.getElementById('new-seed').focus();
        }
        // if we successfully updated the seed
        if (this.props.currentSeed !== prevProps.currentSeed) {
            this.setState({nextSeedValue: ''});
        }
    }

    render() {
        let seedInfoClassName = this.props.showInfo? "popuptext show": "popuptext";
        return (
            <div className={seedInfoClassName} id="seed-info">
                <div className="row">
                    <span>Current Seed<br/></span>
                    <input type="text" value={this.props.currentSeed} disabled/>
                </div>
                <div className="row">
                    <span>Seed Next Hand<br/></span>
                    <input name="nextSeedValue" type="text" value={this.state.nextSeedValue} onChange={this.handleInputChange} placeholder={this.props.currentSeed} id="new-seed"/>
                </div>
                <div className="button-primary" onClick={this.handleSubmit}>Submit</div>
            </div>
        );
    }
}


export default class RngButton extends Component {
    constructor(props) {
        super(props);
        this.state = {showInfo: false};
        this.handleClick = this.handleClick.bind(this);
        this.closeInfo = this.closeInfo.bind(this);
        this.handleInfoMouseUp = this.handleInfoMouseUp.bind(this);
    }
    handleClick() {
        this.setState({showInfo: true});
    }
    closeInfo(e) {
        this.setState({showInfo: false});
    }
    handleInfoMouseUp(e) {
        e.stopPropagation();
    }
    componentDidMount() {
        window.addEventListener('mouseup', this.closeInfo);
        document.getElementById('seed-info').addEventListener('mouseup', this.handleInfoMouseUp)
    }
    componentWillUnmount() {
        window.removeEventListener('mouseup', this.closeInfo);
        document.getElementById('seed-info').removeEventListener('mouseup', this.handleInfoMouseUp)
    }

    render() {
        return (
            <div className="button popup" onClick={this.handleClick}>
                <span>RNG Settings</span>
                <SeedInfo currentSeed={this.props.currentSeed} socket={this.props.socket} showInfo={this.state.showInfo} closeInfo={this.closeInfo}/>
            </div>
        );
    }
}