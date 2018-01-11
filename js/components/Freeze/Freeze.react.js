import React, { Component } from 'react';
import { connect } from 'react-redux';
import postman from '../../utils/postman';
import './Freeze.scss';
import IdbRTC from '../../utils/idb_rtc';

var _this;
class Freeze extends Component {

    constructor(props, context) {
        super(props, context);
        _this = this;
        let visibility = false;
        _this.state = {
            visible: visibility,
            message: ''
        };
    }

    componentDidMount(){
        postman.subscribe('msgtcln', function (o) {
            let msg = (o && o.obj && o.obj.data && o.obj.data.message) || null;
            if( msg === 'MASTER_CONNECT') {
                _this.setState({visible: false, message: 'Master Connected'});
            } else if (msg === 'MASTER_DISCONNECT') {
                IdbRTC.findMasterInfo().then(function (res) {
                    res = res.result;
                    if(res && res[0] && res[0].is_master === 0) {
                        _this.setState({visible: true, message: 'Master Disconnected'});
                    }
                });
            }
        });
    }

    render() {
        return (
            <div style={{visibility: _this.state.visible ? '' : 'hidden'}} className="overlay">
                <div className="content">
                    <div className="image">
                    </div>
                    <div className="text">
                        <div className="big">{_this.state.message}</div>
                        {_this.state.message === 'Master Disconnected' && <div className="medium">Offline booking will work only on master</div>}
                        <div className="small">Trying to reconnect...</div>
                    </div>
                </div>
            </div>
        );
    }
}

export default connect((state) => {return {};}, (dispatch) => { return {};})(Freeze);