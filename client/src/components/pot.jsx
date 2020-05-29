import React from "react";
import '../css/stylesheet.css';

export default function Pot({potAmount}) {
    return (
        <div className="pot">
            <div className="pot-amount">{potAmount}</div>
        </div>
    );
}
