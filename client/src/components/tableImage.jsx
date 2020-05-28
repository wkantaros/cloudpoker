import React from "react";
import "../css/stylesheet.css";
import "../img/CloudpokerTable.png";

export default function TableImage({children}) {
    return (
        <div id="table-img">
            {children}
        </div>
    );
}