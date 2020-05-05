import React, { Component } from "react";
import '../css/stylesheet.css';

export default function Pot({potAmount}) {
    return (
        <div id="pot">
            <div id="pot-amount">{potAmount}</div>
        </div>
    );
}
