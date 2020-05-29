import {GameState, Player, TableState} from "./table-state";
import {TableStateManager} from "./table-state-manager";

export const transformTable = (table) => {
    // Make game a GameState object
    table.game = table.game === null ? null: Object.assign(new GameState(table.game.bigBlind, table.game.smallBlind), table.game);
    table.allPlayers = table.allPlayers.map(p => p === null ? null: transformPlayer(p));
    return new TableState(table.smallBlind, table.bigBlind, table.minPlayers, table.maxPlayers, table.minBuyIn, table.maxBuyIn, table.straddleLimit, table.dealer, table.allPlayers, table.currentPlayer, table.game);
}

export const transformPlayer = (p) => {
    return Object.assign(new Player(p.playerName, p.chips, p.isStraddling, p.seat, p.isMod), p);
}

export const transformTableState = (data) => {
    let tableState = {};
    tableState.table = transformTable(data.table);
    tableState.player = data.player? transformPlayer(data.player): null;
    tableState.gameInProgress = data.gameInProgress;
    tableState.manager = new TableStateManager(tableState.table, tableState.gameInProgress);
    tableState.raceInProgress = data.raceInProgress;
    tableState.raceSchedule = data.raceSchedule;
    return tableState;
}
