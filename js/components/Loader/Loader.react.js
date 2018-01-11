import React, { Component } from 'react';
import { connect } from 'react-redux';
import postman from '../../utils/postman';
import './Loader.scss';
import { isSocketRegistered } from '../../utils/sockets';
import IdbRTC from '../../utils/idb_rtc';

var _this;
class Loader extends Component {

    constructor(props, context) {
        super(props, context);
        _this = this;
        _this.state = {
            visible: [],
            visibilityForSlave: !isSocketRegistered(),
            isSlave: false
        };
    }

    componentDidMount() {
        postman.subscribe('showLoader', function (key) {
            key = typeof key !== 'string' ? 'nonExistingKey' : key;
            let visible = _this.state.visible;
            visible.push(key);
            _this.setState({ visible });
        });

        postman.subscribe('hideLoader', function (key) {
            key = key || 'nonExistingKey';
            let visible = _this.state.visible;
            visible.splice(visible.indexOf(key), 1);
            _this.setState({ visible });
        });
    }
    render() {
        return (

            <div style={{ visibility: (_this.state.visibilityForSlave && _this.state.isSlave) || _this.state.visible.length > 0 ? '' : 'hidden' }} className="loaderComponent">
                <div className="blockBackground"></div>
                <div className="loaderPos loader"></div>
            </div>
        );
    }
}


export default connect((state) => { return {}; }, (dispatch) => { return {}; })(Loader);
