import React, { Component } from "react";

export default class Field extends Component {
    render() {
        return (
            <div className="field" style={`left: ${this.props.left}px; top: ${this.props.top}px;`}>
                {this.props.children}
            </div>
        );
    }
}

