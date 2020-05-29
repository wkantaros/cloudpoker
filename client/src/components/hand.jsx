import React, { Component } from "react";
import '../css/card.css';
import '../css/stylesheet.css';
import Card from "./card";

class HandRankMessageContainer extends Component {
    render () {
        if (!this.props.handRank || this.props.handRank.length === 0) return null;
        return (
            <div className="hand-rank-message-container">
                <div className="hand-rank-message">{this.props.handRank}</div>
            </div>
        );
    }
}

function DealerChip({isDealer}) {
    if (!isDealer) return null;
    return <span className="dealer">D</span>;
}

function Earnings(props) {
    if (!props.earnings) return null;
    return <span className="earnings">{props.earnings}</span>;
}

export class PlayerNameContainer extends Component {
    render () {
        if (!this.props.player) {
            return null;
        }
        let className = "name";
        if (this.props.player.isActionSeat && this.props.highlightActionSeat) className += " action";
        return (
            <div className={className}>
                <DealerChip isDealer={this.props.player.isDealer}/>
                <span className="username">{this.props.player.playerName}</span>: <span className="stack">{this.props.player.chips}</span><Earnings earnings={this.props.player.earnings}/>
            </div>
        );
    }
}

export function Hand({player, playerNameContainer}) {
    if (!player) return null;
    let leftCard = player.cards && player.cards.length > 0 ? player.cards[0] : null;
    let rightCard = player.cards && player.cards.length > 0 ? player.cards[1] : null;
    let folded = player.inHand? player.folded: true;
    return (
        <div className="hand">
            <div className="left-card" key="left-card">
                <Card folded={folded} card={leftCard}/>
            </div>
            <div className="right-card" key="right-card">
                <Card folded={folded} card={rightCard}/>
            </div>
            {player.handRankMessage &&
            <HandRankMessageContainer handRank={player.handRankMessage}/>}
            {playerNameContainer}
        </div>
    );
}
