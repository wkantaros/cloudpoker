import React, { Component } from "react";

const getColor = (input) => 'SC'.includes(input) ? 'black' : 'red';

const getSuitSymbol = (input) => {
    const suits = '♠︎ ♥︎ ♣︎ ♦︎'.split(' ');
    const inputs = 'S H C D'.split(' ');
    for (let i = 0; i < 4; i++){
        if (inputs[i] === input) return suits[i];
    }
    return 'yikes';
};

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

class CardBack extends Component {
    // renders grey card back (.waiting) for players who have folded
    // other
    // props used: this.props.folded
    render() {
        return (
            <div className={"back-card" + this.props.folded ? "waiting": ""}>
                <div className="back-card-ring" />
            </div>
        );
    }
}

class VisibleCard extends Component {
    // props used: this.props.card
    render() {
        let cardRank = (this.props.card.charAt(0) === 'T') ? '10' : this.props.card.charAt(0);
        let cardSuit = getSuitSymbol(this.props.card.charAt(1));
        return (
            <div>
                <div className="card-topleft">
                    <div className="card-corner-rank">{cardRank}</div>
                </div>
                <div className="card-bottomright">
                    <div className="card-corner-suit">{cardSuit}︎</div>
                </div>
            </div>
        );
    }
}

export class CardContainer extends Component {
    // renders the back of the card if we do not know what it is (i.e. if this.props.card is null).
    // renders the front of the cards if we do know what it is.
    // greys out the card if the player has folded
    //
    // props used: this.props.folded, this.props.card
    render () {
        let cardClassName = "card";
        if (this.props.folded) cardClassName += " folded";
        let card;
        if (this.props.card === null) { // if we don't know this person's cards
            cardClassName += " black"; // idk if we need to do this if we can't see the card
            card = <CardBack folded={this.props.folded}/>
        } else {
            cardClassName += getColor(this.props.card.charAt(1));
            card = <VisibleCard card={this.props.card}/>
        }
        return (
            <div className={cardClassName}>{card}</div>
        );
    }
}

export class Hand extends Component {
    // props: this.props.player{.seat, .inHand, .folded, .cards}
    // sent: this.props.player,
    render() {
        if (!this.props.player) return null;
        let leftCard = null;
        let rightCard = null;
        if (this.props.player.cards && this.props.player.cards.length > 0) {
            leftCard = this.props.player.cards[0];
            rightCard = this.props.player.cards[1];
        }
        return (
            <div className="hand" id={this.props.player.seat}>
                {this.props.player.inHand &&
                <CardContainer className="left-card" folded={this.props.player.folded} card={leftCard}/> &&
                <CardContainer className="right-card" folded={this.props.player.folded}  card={rightCard}/>
                }
                <HandRankMessageContainer player={this.props.player}/>
                <PlayerNameContainer player={this.props.player}/>
            </div>
        );
    }
}
