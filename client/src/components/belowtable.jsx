import React, {Component} from "react";
import BuyInLog from "./buyInLog";
import GameLog from "./gamelog";
import ChatRoomContainer from "./chatRoomContainer";
import Actions from "./actions";

export default class BelowTable extends Component {
    constructor(props) {
        super(props);
        this.state = {
            // player is a part of state b/c we modify it in show-hand
            player: this.props.player,
            isGameLogOpen: false,
            isBuyInLogOpen: false,
            buyInData: [],
            betActionsOpen: false,
        }
        this.openBuyInLog = this.openBuyInLog.bind(this);
        this.closeBuyInLog = this.closeBuyInLog.bind(this);
        this.openGameLog = this.openGameLog.bind(this);
        this.closeGameLog = this.closeGameLog.bind(this);
        this.toggleBetSlider = this.toggleBetSlider.bind(this);
        this.getBuyInListener = this.getBuyInListener.bind(this);

        this.actionButtonClickHandlers = {
            'show-hand': () => {
                this.props.socket.emit('show-hand', {});
                this.state.player.showHand();
                // re-render because show-hand button should be hidden
                this.setState((state, props) => ({player: this.state.player}));
            },
            'bet': () => {
                this.setState((state, props) => ({betActionsOpen: !state.betActionsOpen}));
            },
            'raise': () => {
                this.setState((state, props) => ({betActionsOpen: !state.betActionsOpen}));
            },
        };
    }
    componentDidMount() {
        this.props.socket.on('get-buyin-info', this.getBuyInListener);
    }
    componentWillUnmount() {
        this.props.socket.off('get-buyin-info', this.getBuyInListener)
    }
    getBuyInListener(data) {
        this.setState({buyInData: data})
    }
    openBuyInLog() {
        this.props.socket.emit('get-buyin-info');
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
    toggleBetSlider() {
        this.setState((state, props) => ({betActionsOpen: !state.betActionsOpen}));
    }
    render() {
        let actionData = this.props.manager.getAvailableActions(this.props.player? this.props.player.playerName: undefined);
        return (
            <div className="below-table u-full-width">
                {this.state.isBuyInLogOpen &&
                <BuyInLog buyInData={this.state.buyInData} onClose={this.closeBuyInLog} width="100%"/>}
                {/*<BuyInLog buyInData={} onClose={this.closeBuyInLog} width={this.state.isBuyInLogOpen? "100%": "0%"}/>*/}
                {this.state.isGameLogOpen &&
                <GameLog onClose={this.closeGameLog} width="100%"/>}
                {/*<GameLog onClose={this.closeGameLog} width={this.state.isGameLogOpen? "100%": "0%"}/>*/}
                <ChatRoomContainer socket={this.props.socket}
                                   messages={this.props.messages}
                                   feedbackText={this.props.feedbackText}
                                   openGameLog={this.openGameLog}
                                   openBuyInLog={this.openBuyInLog}
                                   collapse={this.state.betActionsOpen}/>
                <Actions availableActions={actionData.availableActions}
                         canPerformPremoves={actionData.canPerformPremoves}
                         manager={this.props.manager}
                         player={this.props.player}
                         socket={this.props.socket}
                         betActionsOpen={this.state.betActionsOpen}
                         toggleBetSlider={this.toggleBetSlider}
                         actionHandlers={this.actionButtonClickHandlers}
                         volumeOn={this.props.volumeOn}/>
            </div>
        );
    }
}
