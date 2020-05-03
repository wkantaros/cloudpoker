// import React from "react";
// import ReactDOM from "react-dom";
import {Hand} from "../../client/src/components/cards";
import {Player} from "./table-state";

const p = new Player("ward", 1000, false, 0, true);
p.isActionSeat = false;
p.isDealer = false;
p.earnings = 0;
p.handRankMessage = null;
ReactDOM.render(<Hand player={p}/>, document.getElementById("root"));
p.inHand = true;
p.cards = ["4C", "QD"];
setTimeout(() => {
    console.log("inHand");
    ReactDOM.render(<Hand player={p}/>, document.getElementById("root"));
}, 5000)
setTimeout(() => {
    console.log("folded");
    p.folded = true;
    ReactDOM.render(<Hand player={p}/>, document.getElementById("root"));
}, 10000)