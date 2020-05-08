import React, {Component} from "react";
import BuyInLog from "./buyInLog";
import GameLog from "./gamelog";
import ChatRoom from "./chatroom";
import Actions from "./actions";

export default class BelowTable extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isGameLogOpen: false,
            isBuyInLogOpen: false,
        }
        this.openBuyInLog = this.openBuyInLog.bind(this);
        this.closeBuyInLog = this.closeBuyInLog.bind(this);
        this.openGameLog = this.openGameLog.bind(this);
        this.closeGameLog = this.closeGameLog.bind(this);
    }
    openBuyInLog() {
        this.setState({isBuyInLogOpen: true});
    }
    closeBuyInLog() {
        this.setState({isBuyInLogOpen: false});
    }
    openGameLog() {
        this.setState({isGameLogOpen: true});
    }
    closeGameLog() {
        this.setState({isGameLogOpen: false});
    }
    render() {
        return (
            <div className="below-table u-full-width">
                <BuyInLog onClose={this.closeBuyInLog} width={this.state.isBuyInLogOpen? "100%": "0%"}/>
                <GameLog onClose={this.closeGameLog} width={this.state.isGameLogOpen? "100%": "0%"}/>
                <ChatRoom openGameLog={this.openGameLog} openBuyInLog={this.openBuyInLog}/>
                <Actions/>
            </div>
        );
    }
}
