import React, { Component } from "react";
import '../css/card.css';
import '../css/stylesheet.css';
import Card from "./card";

class HandRankMessageContainer extends Component {
    // props used: this.props.player.handRankMessage
    render () {
        if (!this.props.player.handRankMessage) return null;
        // let className = "hand-rank-message-container";
        // if (!this.props.player.handRankMessage) className += " collapse";
        // let handRankMessage = this.props.player.handRankMessage ? this.props.player.handRankMessage : "waiting";
        return (
            <div className="hand-rank-message-container">
                <div className="hand-rank-message">{this.props.player.handRankMessage}</div>
            </div>
        );
    }
}

function DealerChip(props) {
    if (!props.isDealer) return null;
    return <span className="dealer">D</span>;
}

function Earnings(props) {
    if (!props.earnings) return null;
    return <span className="earnings">{props.earnings}</span>;
}

class PlayerNameContainer extends Component {
    // props used: this.props.player.isActionSeat, this.props.player.isDealer
    // this.props.player.earnings, this.props.player.chips
    render () {
        if (!this.props.player) {
            return null;
        }
        let className = "name";
        if (this.props.player.isActionSeat) className += " action";
        return (
            <div className={className}>
                <DealerChip isDealer={this.props.player.isDealer}/>
                <span className="username">{this.props.player.playerName}</span>: <span className="stack">{this.props.player.chips}</span><Earnings earnings={this.props.player.earnings}/>
            </div>
        );
    }
}

export class Hand extends Component {
    // props: this.props.player{.seat, .inHand, .folded, .cards}
    // sent: this.props.player,
    render() {
        if (!this.props.player) return null;
        let cards = null;
        if (this.props.player.inHand) {
            let leftCard = this.props.player.cards && this.props.player.cards.length > 0 ? this.props.player.cards[0] : null;
            let rightCard = this.props.player.cards && this.props.player.cards.length > 0 ? this.props.player.cards[1] : null;
            cards = [];
            cards.push((
                <div className="left-card" key="left-card">
                    <Card folded={this.props.player.folded} card={leftCard}/>
                </div>
            ));
            cards.push((
                <div className="right-card" key="right-card">
                    <Card folded={this.props.player.folded} card={rightCard}/>
                </div>
            ));
        }
        return (
            <div className="hand" id={this.props.player.seat}>
                {cards}
                <HandRankMessageContainer player={this.props.player}/>
                <PlayerNameContainer player={this.props.player}/>
            </div>
        );
    }
}
