import React, { Component } from "react";

export default class Field extends Component {
    render() {
        let xy = this.props.x && this.props.y ? {left: `${this.props.x}px`, top: `${this.props.y}px`}: {};
        return (
            <div className="field" style={xy}>
                {this.props.children}
            </div>
        );
    }
}

