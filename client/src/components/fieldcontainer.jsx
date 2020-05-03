import React, { Component } from "react";
import Field from './field';
import {Hand} from './cards'
import $ from "jquery";

const radius = 210;

export default class FieldContainer extends Component {
    constructor(props) {
        super(props);
        // this.state = {
        //     tableWidth: this.props.tableWidth,
        //     tableHeight: this.props.tableHeight,
        // }
    }

    createFields() {
        const fieldsLength = this.props.fieldsLength; // should be 10
        const width = this.props.tableWidth;
        const height = this.props.tableHeight;
        const fieldWidth = this.props.fieldWidth;
        const fieldHeight = this.props.fieldHeight;
        let fieldList = [];
        const step = (2 * Math.PI) / fieldsLength;
        for (let i = 0; i < fieldsLength; i++) {
            // note consider changing width/455 to 2.5
            let x = Math.round(width / 2 + radius * ((width/400) * Math.cos(step * i)) - fieldWidth / 2);
            let y = Math.round(height / 2 + radius * (1.30 * Math.sin(step * i)) - fieldHeight / 2) + 10;
            fieldList.push((
                <Field left={x} right={y}>
                    {this.props.allPlayers[i] &&
                    <Hand player={this.props.allPlayers[i]}/>}
                </Field>
            ));
        }

        return fieldList;
    }
    render() {
        const fields = this.createFields();
        return (
            <div id="field-container">{fields}</div>
        );
    }
}
