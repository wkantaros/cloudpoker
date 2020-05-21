import React, { Component } from "react";
import '../css/stylesheet.css';

export default function PlayerBet(props) {
    if (!props.betAmount || (props.betAmount !== 'check' && props.betAmount <= 0)) return null;
    return (
        <div className="player-bet" style={{left: `${props.x}px`, top: `${props.y}px`}}>
            {props.betAmount}
        </div>
    );
}
