import React from "react";
import Card from './card';
export default function BoardCards({board}) {
    return (
        <div id="cards">
            {board.map(c=><Card card={c} folded={false}/>)}
        </div>
    );
}
