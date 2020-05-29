import React from "react";
import "../css/stylesheet.css";
import "../img/CloudpokerTable.png";

export default function TableImage({id, className, children}) {
    className = className? "table-img " + className: "table-img";
    return (
        <div className={className} id={id}>
            {children}
        </div>
    );
}