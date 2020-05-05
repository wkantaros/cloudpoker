import React from "react";

export default function Board({children}) {
    return (
        <div id="board">
            <div id="backdrop"/>
            {children}
        </div>
    );
}
