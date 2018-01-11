// @flow
import DataSync from '../components/DataSync/DataSync.react';
import Freeze from './Freeze/Freeze.react';
import HomePage from '../components/pages/HomePage.react';
import IdbRTC from '../utils/idb_rtc';
import Login from './pages/Login.react';
import Notifications, { notify } from '../utils/toast';
import React, { Component } from 'react';
import _ from 'lodash';
import postman from '../utils/postman';
import { connect } from 'react-redux';
import { connectSocket, isSocketRegistered, isSocketConnected } from '../utils/sockets';
import { getDumpFromIndexedDB } from '../utils/handleOnlineEvent';
import { getItemFromLocalStorage } from '../utils/utils';
import { handleSyncUpDataAtOnline, updateRetryCount, setOnlineStatusLocal, teleBokingCrawler } from '../actions/confirmBookingActions';
import { serverLogging, clientLogging } from '../utils/logging';
let isUpSyncDone = false;
class App extends Component {

    constructor() {
        super();
        this.state = {
            syncState: false,      // syncState and pageRefresh are being used to trigger sync, they can be merged
            syncBookings: true,   // flag to check if bookings table has to be synced. This can be removed now 
            pageRefresh: false,   // flag sets when the page is refreshed
            firstTimeLogin: false,
            statusOnline: false
        };
    }

    componentWillMount() {
        if (this.props.loggedIn && this.props.userData) {   // will be called on page refresh
            connectSocket(this.props.userData);
        }
        IdbRTC.findMasterInfo().then((data) => {
            data = data.result;
            if (data[0] && data[0].machine_id) {
                this.setState({ machineId: data[0].machine_id, isMaster: data[0].is_master });
            }
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
        });
    }

    componentWillReceiveProps(nextProps) {
        const firstTimeLogin = getItemFromLocalStorage('firstTimeLogin');
        if (nextProps.loggedIn && nextProps.userData && !this.props.loggedIn) {
            connectSocket(nextProps.userData);
            this.setState({ pageRefresh: true, firstTimeLogin });
        }
    }

    componentDidMount() {
        /**
         * Up sync
         * */

        let isSocketReg = isSocketRegistered();

        if (isSocketReg) {
            serverLogging('socket was already registered and addmaster called');
            this.dataSyncUpHandler(0);
        }

        this.socketDisconnected = postman.subscribe('socketDisconnected', () => {
            this.setState({
                'statusOnline': false
            });
            isUpSyncDone = false;
            updateRetryCount(1);
            setOnlineStatusLocal('no');
        });

        window.addEventListener('offline', () => {
            setOnlineStatusLocal('no');
        }, false);

        this.updateOnlineStatus = postman.subscribe('updateOnlineStatus', (data) => {
            this.setState({
                'statusOnline': (data == 'yes')
            });
        });

        /**
         * end up sync
         * */

        postman.subscribe('showToast', function (obj) {
            notify.show(obj.message, obj.type, obj.timeout, obj.color);
        });

        // events gete triggered when sync is done successfully
        postman.subscribe('syncDoneStatus', (data) => {
            this.setState({
                syncState: data,
                pageRefresh: false,
                firstTimeLogin: false
            }, ()=>{
                if(!this.state.firstTimeLogin){
                    IdbRTC.findMasterInfo().then((data) => {
                        data = data.result;
                        if (data[0] && data[0].machine_id) {
                            if (data[0].is_master) {
                                teleBokingCrawler();
                            }
                        }
                    });
                }
            });
        });

        // Check for event from BO to send them POS db dump
        postman.subscribe('msgtcln', (o) => {
            let data = _.get(o, 'obj.data', null);
            if (data.msg && data.msg === 'GET_DB_DUMP' && data.cinemaId && data.table) {
                let { table, cinemaId } = data;
                getDumpFromIndexedDB({ table, cinemaId, browserId: this.state.machineId, transactionId: this.state.transactionId }, function (err, res) {
                    //needs to add message for pos dump failure
                    clientLogging('posDump', err, 'error');
                });
            }
        });

        // Initiate sync after refund is done, to fetch data changes on BO backend
        postman.subscribe('syncAfterRefundChanges', (data) => {
            this.setState({
                pageRefresh: true,
                syncState: false,
            });
        });
        postman.subscribe('syncOnSocketConnect', data => {
            this.setState({ syncState: false, syncBookings: false });
        });
        postman.subscribe('registered', data => {
            if (!isUpSyncDone) {
                serverLogging('addmaster called on socket registration');
                this.dataSyncUpHandler(0);
                isUpSyncDone = true;
            }
        });
        // TODO -- Change below line
        postman.subscribe('syncUpDone', data => {
            isSocketConnected() && this.setState({ syncState: false, syncBookings: true, pageRefresh: true });
        });
        postman.subscribe('socketConnectionFail', data => {
            isUpSyncDone = false;
            this.setState({ syncState: true });
        });

        postman.subscribe('updatedmasterInfo', data => {
            IdbRTC.findMasterInfo().then((data) => {

                data = data.result;
                if (data[0] && data[0].machine_id) {
                    this.setState({ machineId: data[0].machine_id, isMaster: data[0].is_master, transactionId: data[0].transaction_id });
                }
            }).catch((error) => {
                postman.publish('showToast', {
                    message: error.message,
                    type: 'error'
                });
            });
        });
        IdbRTC.findMasterInfo().then((data) => {
            data = data.result;
            if (data[0] && data[0].machine_id) {
                if (data[0].is_master) {
                    teleBokingCrawler();
                }
            }
        });
    }
    /*
     *  This is up sync Add master call
     * */

    dataSyncUpHandler(timeStamp) {
        /* setTimeout(()=> {
         }, timeStamp);*/
        serverLogging('Add master end point called');
        handleSyncUpDataAtOnline('', this.state.firstTimeLogin);
    }

    //End up sync
    render() {
        return (
            <div className="rootWrapper">
                <Notifications />
                {this.props.loggedIn && <Freeze />}
                {!this.props.loggedIn && <Login /> || <div>
                    {(isSocketConnected() && !this.state.syncState && this.state.machineId && this.state.transactionId && this.state.pageRefresh && <DataSync isMaster={this.state.isMaster} firstTimeLogin={this.state.firstTimeLogin} machineId={this.state.machineId} transactionId={this.state.transactionId} syncBookings={this.state.syncBookings} />)}
                    {
                        <div style={{ display: isSocketConnected() && !this.state.syncState && this.state.machineId && this.state.transactionId && this.state.pageRefresh ? 'none' : 'block' }}>
                            {(this.state.isMaster === 0 || this.state.isMaster === 1) && <HomePage statusOnline={this.state.statusOnline} isMaster={this.state.isMaster} />}
                        </div>
                    }
                </div>}
                {/* <Nav loggedIn={this.props.data.loggedIn} history={this.props.history} location={this.props.location} dispatch={this.props.dispatch} currentlySending={this.props.data.currentlySending} />*/}
            </div>
        );
    }
}

//Props fetched from redux store
function select(state) {
    return {
        loggedIn: state.loginReducer.loggedIn,
        userData: state.loginReducer.userData
    };
}

// Wrap the component to inject dispatch and state into it
export default connect(select)(App);