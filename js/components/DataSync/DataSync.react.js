import React, { Component } from 'react';
import 'whatwg-fetch';
import { connect } from 'react-redux';
import base from '../../../idb/apis/base';
import postman from '../../utils/postman';
import './DataSync.scss';
import * as syncActions from '../../actions/dataSyncAction';
import async from 'async';
import { requiredTablesForFirstTimeSync } from '../../../idb/cfg/schema';
import { logout } from '../../actions/loginAction';
import config from 'boxoffice-config';

class DataSync extends Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            'syncDone': false
        };
    }

    componentWillMount() {
        this.triggerSync();
    }

    triggerSync() {
        if (!this.props.isMaster) {
            this.syncDone();
            return;
        }
        if (this.props.machineId) {
            let machineId = this.props.machineId;
            if (machineId) {

                let data = config.extEndPoints.syncType;
                if (!this.props.syncBookings)
                    data.pop();

                if (Array.isArray(data)) {
                    async.map(data, (table, cb) => {
                        this.handleIndexedbSync(table, machineId, cb);
                    }, ((err, res) => {
                        if (err) {
                        if ((this.props.firstTimeLogin && requiredTablesForFirstTimeSync.indexOf(err.tableName) > -1) || !this.props.isMaster) {
                                this.props.logout();
                                postman.publish('showToast', { message: 'Sync API issue', type: 'error' });
                            } else {
                                this.syncDone();
                            }
                        } else {
                            this.syncDone();
                        }
                    }));
                } else {
                }
            }
        } else {
            postman.publish('showToast', {
                message: 'Cinema id not found!',
                type: 'error'
            });
        }

    }

    syncDone() {
        postman.publish('showToast', {
            message: 'Sync process done.',
            type: 'success'
        });
        this.setState({
            'syncDone': true
        });
        postman.publish('syncDoneStatus', this.state.syncDone);
    }

    /*
     * This function hits individual api provided in get call
     * @Params: Individual object received in /sync_url/ get call and laststep: true or false
     * @Returns: add data in indexedDb and redirect to BookTicket screen after all sync done
     */


    async handleIndexedbSync(table, posId, cb) {
        let resp = syncActions.syncData(table, posId, this.props.transactionId, this.props.firstTimeLogin);
        resp.then(data => {
            if (data) {
                if (data.table == 'bookings' || data.table == 'sessions') { //append isOnline field bookings data, needed for validation
                    for (let i in data.data) {
                        data.data[i].isOnline = 1;
                    }
                }
                base.add(data).then((addedData) => {
                    this.handleAckToBo(data, table, cb); //send acknowledgment to box office that data sync is done
                }).catch((error) => {
                    postman.publish('showToast', {
                        message: error.message,
                        type: 'error'
                    });
                });
            }
        }).catch((error) => {
            return cb({ tableName: table.type }, null);
        });
    }

    handleAckToBo(syncData, table, cb) {
        let resp = syncActions.ackSyncStatusToBO(syncData);
        resp.then(response => {
            cb(null);
        }).catch(error => {
            cb({ message: error, tableName: table.type });
        });
    }

    render() {
        return (<div>
            {!this.state.syncDone &&
                <div className="dataSync">
                    <div className="dataSyncBlock">
                        <div className="loader"> </div>
                        <div className="shortText" > Data sync in progess, please be patient... </div>
                    </div>
                </div>
            }
        </div>);
    }
}

// Which props do we want to inject, given the global state?
function select(state) {
    return {
        tabData: state
    };
}

// Wrap the component to inject dispatch and state into it
export default connect(select, (dispatch) => {
    return {
        logout: () => {
            dispatch(logout());
        }
    };
})(DataSync);
