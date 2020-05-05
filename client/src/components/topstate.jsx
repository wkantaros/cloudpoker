import React from "react";
import FieldContainer from "./fieldcontainer";
import {createBetList} from "./playerbetcontainer";
import Pot from './pot';
import BoardCards from "./boardcards";
import Board from "./board";

export default function Table({table, player, gameInProgress, betWidth, betHeight, tableWidth, tableHeight}) {
    const playerBets = table.allPlayers.map(p=>p===null ?0:p.bet);
    return (
        <div id="table">
            {/*render pot and board*/}
            <div className="group-actions u-full-width">
                {/*render pot slot (with no number if a game is not in progress)*/}
                <Pot potAmount={table.game ? table.game.pot : null}/>
                {/* render the board (cards) */}
                <Board>
                    <BoardCards board={table.game? table.game.board : []}/>
                </Board>
            </div>

            {/* render player bets, hands, names*/}
            <FieldContainer allPlayers={table.allPlayers} fieldWidth={150} fieldHeight={10} fieldsLength={10} tableWidth={tableWidth} tableHeight={tableHeight}/>
            {createBetList(playerBets, tableWidth, tableHeight, betWidth, betHeight)}
        </div>
    );
}
