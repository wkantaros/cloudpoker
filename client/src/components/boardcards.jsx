import React from "react";
import Card from './card';
export default function BoardCards({board}) {
    let cards = board.map(c=><Card key={c} card={c} folded={false}/>);
    for (let i=cards.length; i<5;i++) {
        cards.push(<Card key={i} card={null} folded={true} className="hidden"/>)
    }
    return (
        <div id="cards">
            <div id="flop">{cards.slice(0,3)}</div>
            <div id="turn">{cards[3]}</div>
            <div id="river">{cards[4]}</div>
        </div>
    );
}
