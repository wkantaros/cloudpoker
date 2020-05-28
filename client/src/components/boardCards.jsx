import React, {Component} from "react";
import Card from './card';
import createjs from 'createjs';

const streets = {
    0: 'deal',
    3: 'flop',
    4: 'turn',
    5: 'river',
}
function getStreet(board) {
    return streets[board.length];
}

export default class BoardCards extends Component {
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.volumeOn && this.props.board.length !== prevProps.board.length) {
            createjs.Sound.play(getStreet(this.props.board));
        }
    }

    render() {
        let cards = this.props.board.map(c=><Card key={c} card={c} folded={false}/>);
        for (let i=cards.length; i<5;i++) {
            cards.push(<Card key={i} card={null} folded={true} className="hidden"/>)
        }
        return (
            <div id="cards">
                {/* <div id="flop">{cards.slice(0,3)}</div> */}
                <div id="flop">
                    <div>{cards[0]}</div>
                    <div>{cards[1]}</div>
                    <div>{cards[2]}</div>
                </div>
                <div id="turn">{cards[3]}</div>
                <div id="river">{cards[4]}</div>
            </div>
        );
    }
}
