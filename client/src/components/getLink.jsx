import React, {Component} from "react";

function copyStringToClipboard(str) {
    // Create new element
    let el = document.createElement('textarea');
    // Set value (string to be copied)
    el.value = str;
    // Set non-editable to avoid focus and move outside of view
    el.setAttribute('readonly', '');
    el.style = {
        position: 'absolute',
        left: '-9999px'
    };
    document.body.appendChild(el);
    // Select text inside element
    el.select();
    // Copy text to clipboard
    document.execCommand('copy');
    // Remove temporary element
    document.body.removeChild(el);
}

export default class GetLink extends Component {
    constructor(props) {
        super(props);
        this.handleClick = this.handleClick.bind(this);
        this.state = {linkCopied: false}
    }

    handleClick() {
        copyStringToClipboard(window.location.href);
        this.setState({linkCopied: true});
        setTimeout(() => {
            this.setState({linkCopied: false});
        }, 2000);
    }

    render() {
        let buttonText = this.state.linkCopied? 'Link Copied!': 'Get Sharable Link';
        return <button className="button button-primary" id="getLink" onClick={this.handleClick}>{buttonText}</button>;
    }
}