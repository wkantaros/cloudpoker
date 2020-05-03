import React, { Component } from "react";
import FieldContainer from "./fieldcontainer";
import {createBetList} from "./playerbetcontainer";

export default class TopState extends Component {
    // constructor(props) {
    //     super(props);
    //     // this.state = {
    //     //     table: transformTable(this.props.table),
    //     //     player: transformPlayer(null, this.props.player),
    //     //     gameInProgress: this.props.gameInProgress,
    //     //     socket: this.props.socket,
    //     //
    //     // }
    // }
    // componentDidMount() {
    //     const socket = this.state.socket;
    //     socket.on('state-snapshot', (data) => {
    //         if (data.table) {
    //             this.setState({
    //                 table: transformTable(data.table)
    //             })
    //         }
    //         if (data.player) {
    //             this.setState((prevState) => {
    //                 return {player: transformPlayer(prevState, data.player)}
    //             })
    //         }
    //         this.setState({gameInProgress: data.gameInProgress});
    //     })
    // }

    render() {
        const playerBets = this.props.table.allPlayers.map(p=>p===null ?0:p.bet);
        return (
            <div>
                <FieldContainer allPlayers={this.props.table.allPlayers} fieldWidth={150} fieldHeight={10} fieldsLength={10} tableWidth={this.props.tableWidth} tableHeight={this.props.tableHeight}/>
                {createBetList(playerBets, this.props.tableWidth, this.props.tableHeight, this.props.betWidth, this.props.betHeight)}
            </div>
        );
    }
}


