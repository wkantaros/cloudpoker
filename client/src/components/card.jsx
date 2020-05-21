import React, {Component} from "react";
import '../css/card.css';

const getColor = (input) => 'SC'.includes(input) ? 'black' : 'red';

const getSuitSymbol = (input) => {
    const suits = '♠︎ ♥︎ ♣︎ ♦︎'.split(' ');
    const inputs = 'S H C D'.split(' ');
    for (let i = 0; i < 4; i++){
        if (inputs[i] === input) return suits[i];
    }
    return 'yikes';
};

// renders grey card back (.waiting) for players who have folded
export function CardBack({folded}) {
    return (
        <div className={folded ? "back-card waiting": "back-card"}>
            <div className="back-card-ring" />
        </div>
    );
}

// renders the back of the card if we do not know what it is (i.e. if this.props.card is null).
// renders the front of the cards if we do know what it is.
// greys out the card if the player has folded
export default function Card({card, folded, className}) {
    let cardClassName = className? className + ' ': '';
    cardClassName += "card";
    if (folded) cardClassName += " folded";
    let renderedCard;
    if (card === null) { // if we don't know this person's cards
        cardClassName += " black"; // idk if we need to do this if we can't see the card
        renderedCard = <CardBack folded={folded}/>
    } else {
        cardClassName += " " + getColor(card.charAt(1));
        renderedCard = <CardFront card={card}/>
    }
    return (
        <div className={cardClassName}>{renderedCard}</div>
    );
}

export class CardFront extends Component {
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