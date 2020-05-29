import React, {Component} from "react";
import BuyInLog from "./buyInLog";
import GameLog from "./gameLog";
import ChatRoomContainer from "./chatRoomContainer";
import Actions from "./actions";
// import HandHistory from "./handHistory";

export default class BelowTable extends Component {
    constructor(props) {
        super(props);
        this.state = {
            // player is a part of state b/c we modify it in show-hand
            player: this.props.player,
            openLogId: '',
            buyInData: [],
            betActionsOpen: false,
        }
        this.openLog = this.openLog.bind(this);
        this.closeLog = this.closeLog.bind(this);
        this.toggleBetSlider = this.toggleBetSlider.bind(this);
        this.getBuyInListener = this.getBuyInListener.bind(this);
        this.buttonsAboveChatroom = this.buttonsAboveChatroom.bind(this);

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
        this.props.socket.off('get-buyin-info', this.getBuyInListener);
    }
    getBuyInListener(data) {
        this.setState({buyInData: data})
    }
    openLog(e) {
        if (e.target.id === 'buyin-log-opn') {
            this.props.socket.emit('get-buyin-info');
        }
        this.setState({openLogId: e.target.id});
    }
    closeLog() {
        this.setState({openLogId: ''});
    }
    toggleBetSlider() {
        this.setState((state, props) => ({betActionsOpen: !state.betActionsOpen}));
    }
    buttonsAboveChatroom() {
        return (
            <div id="buttons-above-chatroom">
                <a onClick={this.openLog} className="button" id="game-log-opn">Log</a>
                <a onClick={this.openLog} className="button" id="buyin-log-opn">Buy-ins</a>
                {/*<a onClick={this.openLog} className="button" id="hand-his-log-opn">Hand History</a>*/}
            </div>
        );
    }

    render() {
        let actionData = this.props.manager.getAvailableActions(this.props.player? this.props.player.playerName: undefined);
        return (
            <div className="below-table u-full-width">
                <BuyInLog buyInData={this.state.buyInData} onClose={this.closeLog} width={this.state.openLogId === 'buyin-log-opn'? "100%": "0%"}/>
                <GameLog onClose={this.closeLog} width={this.state.openLogId === 'game-log-opn'? "100%": "0%"} volumeOn={this.props.volumeOn} socket={this.props.socket}/>
                {/*<HandHistory handEndLog={this.props.handEndLog} onClose={this.closeLog} width={this.state.openLogId === 'game-log-opn'? "100%": "0%"}/>*/}
                <ChatRoomContainer socket={this.props.socket}
                                   messages={this.props.messages}
                                   feedbackText={this.props.feedbackText}
                                   buttonsAbove={this.buttonsAboveChatroom()}
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
