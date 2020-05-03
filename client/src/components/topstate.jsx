import React, { Component } from "react";
import FieldContainer from "./fieldcontainer";
import {GameState, Player, TableState} from "../table-state";

const transformTable = (data) => {
    const t = data.table;
    t.allPlayers = t.allPlayers.map(p => p === null ? null: transformPlayer(data));
    // Make game a GameState object
    t.game = t.game === null ? null: Object.assign(new GameState(t.game.bigBlind, t.game.smallBlind), t.game);
    return new TableState(t.smallBlind, t.bigBlind, t.minPlayers, t.maxPlayers, t.minBuyIn, t.maxBuyIn, t.straddleLimit, t.dealer, t.allPlayers, t.currentPlayer, t.game);
}

const transformPlayer = (/*prev, */data) => {
    const p = data.player;
    let player = Object.assign(new Player(p.playerName, p.chips, p.isStraddling, p.seat, p.isMod), p);
    player.isDealer = data.gameInProgress && data.table.players[data.table.dealer].seat === player.seat;
    player.isActionSeat = data.gameInProgress && data.table.players[data.table.currentPlayer].seat === player.seat;
    // TODO: set earnings
    player.earnings = 0;
    return player;
}

export default class TopState extends Component {
    constructor(props) {
        super(props);
        this.state = {
            table: transformTable(this.props.table),
            player: transformPlayer(null, this.props.player),
            gameInProgress: this.props.gameInProgress,
            socket: this.props.socket,

        }
    }
    componentDidMount() {
        const socket = this.state.socket;
        socket.on('state-snapshot', (data) => {
            if (data.table) {
                this.setState({
                    table: transformTable(data.table)
                })
            }
            if (data.player) {
                this.setState((prevState) => {
                    return {player: transformPlayer(prevState, data.player)}
                })
            }
            this.setState({gameInProgress: data.gameInProgress});
        })
    }

    render() {
        return <FieldContainer allPlayers={this.state.table.allPlayers} fieldWidth={150} fieldHeight={10} fieldsLength={10} tableWidth={this.props.tableWidth} tableHeight={this.props.tableHeight}/>;
    }
}


