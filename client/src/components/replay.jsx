import React, {Component} from "react";
import $ from 'jquery';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/resizable';
import TableImage from "./tableImage";
import Table from "./table";
import {transformTableState} from "../funcs";
import {applyPatch} from "fast-json-patch";
import Board from "./board";
import BoardCards from "./boardCards";

export default class ReplaySubContainer extends Component {
    constructor(props) {
        super(props);
        this.onGetHandReplay = this.onGetHandReplay.bind(this);
        this.onCloseReplay = this.onCloseReplay.bind(this);
        this.state = {handLog: null, gameIndex: null, display: false, validatePatch: false};
    }
    componentDidMount() {
        this.props.socket.on('get-hand-replay', this.onGetHandReplay);
    }
    componentWillUnmount() {
        this.props.socket.off('get-hand-replay', this.onGetHandReplay);
    }
    onGetHandReplay({handLog, gameIndex, display, validatePatch}) {
        this.setState({handLog, gameIndex, display, validatePatch});
    }
    onCloseReplay() {
        this.setState({handLog: null, gameIndex: null, display: false});
    }

    render() {
        return (
            <ReplayContainer id={null}>
                {this.state.handLog && this.state.display?
                    <Replay handLog={this.state.handLog}
                            gameIndex={this.state.gameIndex}
                            validatePatch={this.state.validatePatch}
                            onCloseReplay={this.onCloseReplay}/> :
                    null}
            </ReplayContainer>
        );
    }
}

const PAUSED = 'paused';
const PLAYING = 'playing';
const FINISHED = 'finished';

export class Replay extends Component {
    constructor(props) {
        super(props);
        this.state = {
            logIndex: 0,
            tableState: transformTableState(this.props.handLog[0].initialState),
            playbackState: PAUSED,
            nextPatchTimer: null,
        }
        this.getId = this.getId.bind(this);
        this.validateLogIndex = this.validateLogIndex.bind(this);
        this.setTableState = this.setTableState.bind(this);
        this.onResize = this.onResize.bind(this);
    }
    getId() {
        return `replay-${this.props.gameIndex}`;
    }
    validateLogIndex(index) {
        if (index < 0) throw new Error(`index ${index} is less than 0`);
        if (index >= this.props.handLog.length) throw new Error(`index ${index} >= this.props.handLog.length ${this.props.handLog.length}`);
    }
    setTableState(desiredIndex) {
        this.validateLogIndex(desiredIndex);
        this.setState((state, props) => {
            let currentState = state.tableState;
            let currentIndex = state.logIndex;
            if (desiredIndex < state.logIndex) {
                currentState = transformTableState(props.handLog[0].initialState);
                currentIndex = 0;
            }
            while (currentIndex < desiredIndex) {
                console.log(props.handLog[currentIndex + 1].patch);
                applyPatch(currentState, props.handLog[currentIndex + 1].patch, props.validatePatch);
                currentIndex++;
            }
            return {tableState: currentState, logIndex: currentIndex};
        });
    }
    pausePlayback() {
        if (this.state.playbackState === PAUSED) return;
        clearTimeout(this.state.nextPatchTimer);
        this.setState({nextPatchTimer: null, playbackState: PAUSED});
    }
    nextPatch() {
        if (this.state.nextPatchTimer) clearTimeout(this.state.nextPatchTimer);
        let nextIndex = this.state.logIndex + 1;
        this.setTableState(nextIndex);

        if (nextIndex === 5) { // DELETE THIS IF STATEMENT. USED FOR DEV
            console.log('pausing playback')
            this.pausePlayback();
            return;
        }
        if (nextIndex === this.props.handLog.length - 1) {
            this.setState({playbackState: FINISHED, nextPatchTimer: null});
            this.props.onCloseReplay();
        } else {
            let timeToNextAction = this.props.handLog[nextIndex + 1].time - this.props.handLog[nextIndex].time;
            let nextPatchTimer = setTimeout(() => {
                this.nextPatch();
            }, timeToNextAction);
            this.setState({nextPatchTimer: nextPatchTimer, playbackState: PLAYING});
        }
    }
    onResize() {
        this.setState({logIndex: this.state.logIndex}); // trigger re-render
    }
    componentDidMount() {
        this.nextPatch();

        $('#replay-ovalparent').resize(this.onResize)
    }
    render() {
        return <ReplayTable tableState={this.state.tableState}/>;
    }
}

class ReplayContainer extends Component {
    componentDidMount() {
        $('.replay').draggable();
        $('#replay-table-img').resizable({
            alsoResize: "#replay-ovalparent"
        });
    }

    render() {
        return (
            <div className="replay container" id={this.props.id}>
                <TableImage id="replay-table-img">
                    <div id="replay-ovalparent">
                        {this.props.children}
                    </div>
                </TableImage>
            </div>
        )
    }
}

function ReplayTable({tableState}) {
    let board = (
        <Board>
            <BoardCards className="replay-board-cards" volumeOn={false} board={tableState.manager.table.game.board}/>
        </Board>
    );
    return (<Table volumeOn={false}
                   id="replay-table"
                   board={board}
                   raceInProgress={tableState.raceInProgress}
                   raceSchedule={tableState.raceSchedule}
                   manager={tableState.manager}
                   betWidth={60}
                   betHeight={35}
                   tableWidth={$('#replay-ovalparent').width()}
                   tableHeight={Math.floor($('#replay-ovalparent').width()/2)}/>);
}
