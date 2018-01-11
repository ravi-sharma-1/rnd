import React from 'react';
import ReactDOM from 'react-dom';

let notificationWrapperId = 'notification-wrapper';
let defaultTimeout = 5000; // ms
let animationDuration = 300; // ms

/* Colors */
const colorWhite = 'white';
const colorError = '#E85742';
const colorSuccess = '#55CA92';
const colorWarning = '#F5E273';
const textColorWarning = '#333333';

/* React Notification Component */
class Toast extends React.Component { // eslint-disable-line no-unused-vars

    state = {
        styleParent: null
    };

    getStyles() {
        let styles = {};

        const containerStyle = {
            position: 'fixed',
            width: '70%',
            margin: '0 auto',
            right: '0px',
            top: '-100px',
            left: '0px',
            textAlign: 'center',
            zIndex: '999',
            pointerEvents: 'none',
            transition: 'all ' + animationDuration + 'ms ease',
            transform: 'translateY(0px)',
            // Vendor Prefixes
            msTransition: 'all ' + animationDuration + 'ms ease',
            msTransform: 'translateY(0px)',
            WebkitTransition: 'all ' + animationDuration + 'ms ease',
            WebkitTransform: 'translateY(0px)',
            OTransition: 'all ' + animationDuration + 'ms ease',
            OTransform: 'translateY(0px)',
            MozTransition: 'all ' + animationDuration + 'ms ease',
            MozTransform: 'translateY(0px)'
        };

        const contentStyle = {
            cursor: 'pointer',
            display: 'inline',
            width: 'auto',
            borderRadius: '0 0 4px 4px',
            backgroundColor: 'white',
            padding: '10px 30px',
            pointerEvents: 'all'
        };

        /* If type is set, merge toast action styles with base */
        switch (this.props.type) {
            case 'success':
                styles.content = Object.assign({}, contentStyle, {
                    backgroundColor: colorSuccess,
                    color: colorWhite
                });
                break;

            case 'error':
                styles.content = Object.assign({}, contentStyle, {
                    backgroundColor: colorError,
                    color: colorWhite
                });
                break;

            case 'warning':
                styles.content = Object.assign({}, contentStyle, {
                    backgroundColor: colorWarning,
                    color: textColorWarning
                });
                break;

            case 'custom':
                styles.content = Object.assign({}, contentStyle, {
                    backgroundColor: this.props.color.background,
                    color: this.props.color.text
                });
                break;

            default:
                styles.content = Object.assign({}, contentStyle);
                break;
        }

        styles.container = containerStyle;

        return styles;
    }

    getVisibleState(context) {
        let base = this.getStyles().container;

        // Show
        const stylesShow = {
            transform: 'translateY(108px)',
            msTransform: 'translateY(108px)',
            WebkitTransform: 'translateY(108px)',
            OTransform: 'translateY(108px)',
            MozTransform: 'translateY(108px)'
        };

        setTimeout(function () {
            context.updateStyle(base, stylesShow);
        }, 100); // wait 100ms after the component is called to animate toast.

        if (this.props.timeout === -1) {
            return;
        }

        // Hide after timeout
        const stylesHide = {
            transform: 'translateY(-108px)',
            msTransform: 'translateY(-108px)',
            WebkitTransform: 'translateY(-108px)',
            OTransform: 'translateY(-108px)',
            MozTransform: 'translateY(-108px)'
        };

        setTimeout(function () {
            context.updateStyle(base, stylesHide);
        }, this.props.timeout);
    }

    updateStyle(base, update) {
        this.setState({ styleParent: Object.assign({}, base, update) });
    }

    getBaseStyle() {
        this.setState({ styleParent: this.getStyles().container });
    }

    componentDidMount() {
        this.getBaseStyle();
        this.getVisibleState(this);
    }

    render() {
        let { text, type } = this.props;
        let styles = this.getStyles();
        let { styleParent } = this.state;
        return (
            <div className="toast-notification" style={styleParent}>
                <span className={type} style={styles.content}>{text}</span>
            </div>
        );
    }
}

/* Private Functions */

/* Render React component */
function renderToast(text, type, timeout, color) {
    ReactDOM.render(
        <Toast text={text} timeout={timeout} type={type} color={color} />,
        document.getElementById(notificationWrapperId)
    );
}

/* Unmount React component */
function hideToast() {
    ReactDOM.unmountComponentAtNode(document.getElementById(notificationWrapperId));
}

/* Public functions */

/* Show Animated Toast Message */
function show(text, type, timeout, color) {
    if (typeof text !== 'string') {
        return;
    }
    //if (!document.getElementById(notificationWrapperId).hasChildNodes()) {
    let renderTimeout = timeout || 5000;

    // Use default timeout if not set.
    if (!renderTimeout) {
        renderTimeout = defaultTimeout;
    }

    // Render Component with Props.
    renderToast(text, type, renderTimeout, color);

    if (timeout === -1) {
        return;
    }

    // Unmount react component after the animation finished.
    setTimeout(function () {
        hideToast();
    }, renderTimeout + animationDuration);
    // }
}


/* Export notification container */
export default class extends React.Component {
    render() {
        return (
            <div id={notificationWrapperId}></div>
        );
    }
}

/* Export notification functions */
export let notify = {
    show
};
