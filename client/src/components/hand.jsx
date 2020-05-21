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

class PlayerNameContainer extends Component {
    render () {
        if (!this.props.player) {
            return null;
        }
        let className = "name";
        if (this.props.player.isActionSeat && !this.props.raceInProgress) className += " action";
        return (
            <div className={className}>
                <DealerChip isDealer={this.props.player.isDealer}/>
                <span className="username">{this.props.player.playerName}</span>: <span className="stack">{this.props.player.chips}</span><Earnings earnings={this.props.player.earnings}/>
            </div>
        );
    }
}

export class Hand extends Component {
    render() {
        if (!this.props.player) return null;
        let leftCard = this.props.player.cards && this.props.player.cards.length > 0 ? this.props.player.cards[0] : null;
        let rightCard = this.props.player.cards && this.props.player.cards.length > 0 ? this.props.player.cards[1] : null;
        let folded = this.props.player.inHand? this.props.player.folded: true;
        return (
            <div className="hand" id={this.props.player.seat}>
                <div className="left-card" key="left-card">
                    <Card folded={folded} card={leftCard}/>
                </div>
                <div className="right-card" key="right-card">
                    <Card folded={folded} card={rightCard}/>
                </div>
                {this.props.player.handRankMessage &&
                <HandRankMessageContainer handRank={this.props.player.handRankMessage}/>}
                <PlayerNameContainer raceInProgress={this.props.raceInProgress} player={this.props.player}/>
            </div>
        );
    }
}
