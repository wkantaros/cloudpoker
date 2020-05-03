import React, { Component } from "react";

export default function PlayerBet(props) {
    if (!props.betAmount || (props.betAmount !== 'check' && props.betAmount <= 0)) return null;
    return (
        <div className="player-bet">
            {props.betAmount}
        </div>
    );
}
