import React, {Component} from "react";
import BoardCards from "./boardCards";
import Pot from "./pot";
import {Hand, PlayerNameContainer} from "./hand";
import Field from "./field";

function getWinnerFields(tableState) {
    let fieldList = [];
    let winners = tableState.table.game.winners;
    for (let i = 0; i < winners.length; i++) {
        const player = tableState.table.allPlayers[winners[i].seat]
        let playerNameContainer = <PlayerNameContainer highlightActionSeat={false} player={player}/>;
        fieldList.push((
            <Field key={`field-${i}`}>
                <Hand playerNameContainer={playerNameContainer} player={player}/>
            </Field>
        ));
    }

    return fieldList;
}

function HandRow({time, tableState, handleReplayClick}) {
    let playersInHandCount = tableState.table.allPlayers.filter(p=>p!==null&&p.inHand).length;
    return (
        <div className="log-row row">
            <BoardCards className="log-board log-element" volumeOn={false} board={tableState.table.game.board}/>
            {/*TODO: potAmount will not be correct for everyoneFolded cases because the server
                handles such cases in a hacky way. see SessionManager.handleEveryoneFolded*/}
            <div className="log-element">
                {getWinnerFields(tableState)}
            </div>
            <div className="log-element">
                <Pot potAmount={tableState.table.game.pot}/>
            </div>
            <div className="log-element">
                <div className="playerCount">{playersInHandCount} players</div>
                {/*TODO: this will not work for split pots*/}
                <div className="winner">{tableState.table.game.winners[0].playerName} won</div>
            </div>
            <div className="replay-game">
                <button className="replay-game-btn" onClick={handleReplayClick}>Replay Game</button>
            </div>
        </div>
    );
}

class HandLogRows extends Component {
    constructor(props) {
        super(props);
        this.handleClickReplay = this.handleClickReplay.bind(this);
    }

    handleClickReplay(index, event) {
        if (index >= this.props.handEndLog.length) {
            alert(`tried to get replay for game at index ${index} but only ${this.props.handEndLog.length} games have finished. this is a huge bug`);
            return;
        }
        this.props.socket.emit('get-hand-replay', {gameIndex: index, display: true});
    }

    render() {
        return (
            <div className="hand-log-rows">
                {this.props.handEndLog.map((tableState, i)=><HandRow key={i} handleReplayClick={e => {this.handleClickReplay(i, e)}} time={tableState.time} tableState={tableState.finalState}/>)}
            </div>
        );
    }
}


export default class HandHistory extends Component {
    constructor(props) {
        super(props);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    handleKeyDown(e) {
        // esc key
        if (e.keyCode === 27) {
            e.stopPropagation();
            this.props.onClose(e);
        }
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.width === "100%" && this.props.width !== prevProps.width) {
            document.addEventListener('keydown', this.handleKeyDown);
        } else if (this.props.width !== "100%" && this.props.width !== prevProps.width) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
    }
    render() {
        return (
            <div id="hand-log" className="overlay" style={{width: this.props.width}}>
                <a onClick={this.props.onClose} className="closebtn" id="closeHandLog">&times;</a>
                <div className="game-log-page overlay-content">
                    <HandLogRows handEndLog={this.props.handEndLog} socket={this.props.socket}/>
                </div>
            </div>
        );
    }
}
