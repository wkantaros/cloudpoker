import React from "react";
import {createBetList} from "./playerBetContainer";
import Pot from './pot';
import BoardCards from "./boardCards";
import Board from "./board";
import Field from "./field";
import {Hand} from "./hand";

const radius = 210;

export function getFieldList({raceInProgress, allPlayers, tableWidth, tableHeight, fieldWidth, fieldHeight}) {
    let fieldList = [];
    const step = (2 * Math.PI) / allPlayers.length;
    for (let i = 0; i < allPlayers.length; i++) {
        if (allPlayers[i]) {
            // note consider changing width/455 to 2.5
            let x = Math.round(tableWidth / 2 + radius * ((tableWidth/400) * Math.cos(step * i)) - fieldWidth / 2);
            let y = Math.round(tableHeight / 2 + radius * (1.30 * Math.sin(step * i)) - fieldHeight / 2) - 50;
            fieldList.push((
                <Field key={`field-${i}`} x={x} y={y}>
                    <Hand raceInProgress={raceInProgress} player={allPlayers[i]}/>
                </Field>
            ));
        }
    }

    return fieldList;
}


export default function Table({volumeOn, table, raceInProgress, betWidth, betHeight, tableWidth, tableHeight}) {
    const playerBets = table.allPlayers.map(p=>p===null ?0:p.checked? 'check': p.bet);
    return (
        <div id="table">
            {/*render pot and board*/}
            <div className="group-actions u-full-width">
                {/*render pot slot (with no number if a game is not in progress)*/}
                <Pot potAmount={table.game ? table.game.pot : null}/>
                {/* render the board (cards) */}
                <Board>
                    <BoardCards volumeOn={volumeOn} board={table.game ? table.game.board : []}/>
                </Board>
            </div>

            {/* render player bets, hands, names*/}
            {getFieldList({allPlayers: table.allPlayers, fieldHeight: 10, fieldWidth: 150, tableWidth, tableHeight, raceInProgress})}
            {/*<FieldContainer allPlayers={table.allPlayers} fieldWidth={150} fieldHeight={10} fieldsLength={10} tableWidth={tableWidth} tableHeight={tableHeight}/>*/}
            {createBetList(playerBets, tableWidth, tableHeight, betWidth, betHeight)}
        </div>
    );
}
