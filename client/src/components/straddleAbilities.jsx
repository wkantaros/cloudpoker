import React, {Component} from "react";

export default class StraddleAbilities extends Component {
    constructor(props) {
        super(props);
        this.state = {
            singleStraddleBox: this.props.player.isStraddling,
            multiStraddleBox: this.props.player.isStraddling,
        }
        this.handleChange = this.handleChange.bind(this);
        throw new Error('not fully implemented b/c backend implementation is not compatible with front end')
    }
    handleChange(event) {
        this.setState({[event.target.name]: event.target.checked});
        let straddleValue = 0;
        if (event.target.checked)
            straddleValue = event.target.name === "singleStraddleBox"? 1: -1;
        this.props.socket.emit('straddle-switch', {
            isStraddling: event.target.checked,
            straddletype: straddleValue
        })
    }
    render() {
        return (
            <div id="straddle-abilities">
                <label className="single-straddle cbox">
                    <span className="label-body">UTG Straddle</span>
                    <input type="checkbox" name="singleStraddleBox" onChange={this.handleChange} checked={this.state.singleStraddleBox}/>
                </label>
                <label className="multi-straddle cbox">
                    <span className="label-body">Multi-Straddle</span>
                    <input type="checkbox" name="multiStraddleBox" onChange={this.handleChange} checked={this.state.multiStraddleBox}/>
                </label>
            </div>
        );
    }
}
