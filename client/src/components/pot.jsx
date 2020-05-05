import React, { Component } from "react";

export default function Pot({potAmount}) {
    return (
        <div id="pot">
            <div id="pot-amount">{potAmount}</div>
        </div>
    );
}
