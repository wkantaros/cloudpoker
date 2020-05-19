import React, {Component} from "react";

export default class GameLog extends Component {
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
