import React, { Component } from "react";
import PlayerBet from "./playerBet";

export function createBetList(bets, tableWidth, tableHeight, betWidth, betHeight) {
    const step = (2 * Math.PI) / bets.length;
    const radius = 180;
    let betElements = [];
    for (let i = 0; i < bets.length; i++) {
        let x = Math.round(tableWidth / 2 + radius * ((tableWidth/450) * Math.cos(i * step)) - betWidth / 2) - 20;
        let y = Math.round(tableHeight / 2 + radius * (1.05 * Math.sin(i * step)) - betHeight / 2) - 10;
        const betElement = <PlayerBet key={`bet-${i}`} betAmount={bets[i]} x={x} y={y}/>;
        if (betElement) betElements.push(betElement);
    }
    return betElements;
}

export default function PlayerBetContainer(props) {
    return (
        <div>
            {createBetList(props.bets, props.tableWidth, props.tableHeight, props.betWidth, props.betHeight)}
        </div>
    );
}