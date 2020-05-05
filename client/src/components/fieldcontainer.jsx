import React, { Component } from "react";
import Field from './field';
import {Hand} from './hand'
import $ from "jquery";

const radius = 210;

export default class FieldContainer extends Component {

    createFields() {
        const fieldsLength = this.props.fieldsLength; // should be 10
        const width = this.props.tableWidth;
        const height = this.props.tableHeight;
        const fieldWidth = this.props.fieldWidth;
        const fieldHeight = this.props.fieldHeight;
        let fieldList = [];
        const step = (2 * Math.PI) / fieldsLength;
        for (let i = 0; i < fieldsLength; i++) {
            if (this.props.allPlayers[i]) {
                // note consider changing width/455 to 2.5
                let x = Math.round(width / 2 + radius * ((width/400) * Math.cos(step * i)) - fieldWidth / 2);
                let y = Math.round(height / 2 + radius * (1.30 * Math.sin(step * i)) - fieldHeight / 2) + 10;
                fieldList.push((
                    <Field key={`field-${i}`} x={x} y={y}>
                        <Hand player={this.props.allPlayers[i]}/>
                    </Field>
                ));
            }
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
