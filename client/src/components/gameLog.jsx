import React, {Component} from "react";

export default class GameLog extends Component {
    constructor(props) {
        super(props);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    handleKeyDown(e) {
        // esc key
        if (e.keyCode === 27) {
            e.stopPropagation();
            this.props.onClose(e);
        }
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.width === "100%" && this.props.width !== prevProps.width) {
            document.addEventListener('keydown', this.handleKeyDown);
        } else if (this.props.width !== "100%" && this.props.width !== prevProps.width) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
    }
    render() {
        return (
            <div id="game-log" className="overlay" style={{width: this.props.width}}>
                <a onClick={this.props.onClose} className="closebtn" id="closeLog">&times;</a>
                <div className="overlay-content">
                    <a href="#">Game Log</a>
                    <p>coming soon...</p>
                </div>
            </div>
        );
    }
}
