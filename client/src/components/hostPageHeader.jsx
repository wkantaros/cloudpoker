import React from "react";
export default function HostPageHeader({active, onTabChange}) {
    let gamePrefBtnClassName = "button hd-btn";
    let hostPlayersBtnClassName = "button hd-btn";
    if (active["game-pref-btn"]) {
        gamePrefBtnClassName += " active";
    } else if (active["host-players-btn"]) {
        hostPlayersBtnClassName += " active";
    }
    return (
        <div className="hostpage-header">
            <div className="row">
                <div className="five columns">
                    <a className={hostPlayersBtnClassName} id="host-players-btn" onClick={onTabChange}>Players</a>
                </div>
                <div className="six columns">
                    <a className={gamePrefBtnClassName} id="game-pref-btn" onClick={onTabChange}>Game Preferences</a>
                </div>
                <div className="one columns">
                    <a className="button closebtn-hd" id="closeHostPage" onClick={onTabChange}>&times;</a>
                </div>
            </div>
        </div>
    );
}