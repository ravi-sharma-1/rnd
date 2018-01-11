import 'whatwg-fetch';
import _ from 'lodash';
import postman from './postman';
import IdbRTC from '../utils/idb_rtc';
import { statusMaster, printMaster } from './urls';
import { isBooked } from '../../idb/apis/blockSeat';
import { generateCount, updatePrintStatusOnPrintEvent } from '../actions/confirmBookingActions';
import { schema } from '../../idb/cfg/schema';

let stores = Object.keys(schema);

function getStatusFromIDB(booking_id, transaction_id, tryAgain) {
    isBooked({ booking_id }, resp => {
        if (!resp.error) {
            if (resp.result === 'Booked') {
                fetch(statusMaster, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ id: booking_id, transactionId: transaction_id })
                });
            }
            postman.publish('showToast', {
                message: 'Sent to BO Server the booking status',
                type: 'success'
            });
        } else {
            if (tryAgain) {
                postman.publish('showToast', {
                    message: 'Failed to get the status from DB, trying again !!',
                    type: 'warning'
                });
                getStatusFromIDB(booking_id, transaction_id, false);
            } else {
                postman.publish('showToast', {
                    message: 'Failed to get the status from DB',
                    type: 'error'
                });
            }
        }
    });
}

function performRealTimeSync(obj, fullObjInfo) {
    let { table, content } = obj;
    if (stores.lastIndexOf(table) > -1) {
        let tempObj = obj.operation === 'delete'
            ? { fnName: 'remove', dataForDB: { table, data: { id: content[0].id } } }
            : { fnName: 'add', dataForDB: { table, data: content } };
        obj.operation === 'delete' && (table === 'audis' || table === 'movies') && IdbRTC.deleteRelatedSessions({ table, id: content[0].id });
        IdbRTC.realTimeSync(tempObj, fullObjInfo).then(() => {
            postman.publish('realTimeSync' + table);
        });
    }
}

function transactionEventHandler(res) {
    let transaction_id = _.get(res, 'obj.result.transactionId', null);
    let cb = res && res.callbackFn;
    IdbRTC.findMasterInfo().then(data => {
        data = data.result;
        data[0].transaction_id = transaction_id;
        IdbRTC.updateMasterInfo({
            table: 'masterInfo',
            data: [data[0]]
        }).then((resp) => {
            postman.publish('updatedmasterInfo');
            cb(resp && resp.result === 'Done' ? 1 : 0);
        });
    });
}

function statusEventHandler(res) {
    let booking_id = _.get(res, 'obj.data.result.id', null);
    let transaction_id = _.get(res, 'obj.data.result.transactionId', null);
    if (booking_id !== null && transaction_id !== null) {
        getStatusFromIDB(booking_id, transaction_id, true);
    } else {
        //error handling for booking and transaction id as null
    }
}

function printMasterEventHandler(res) {
    let booking_id = _.get(res, 'obj.data.result.id', null);
    let pos_user_id = _.get(res, 'obj.data.result.pos_user_id', null);
    let transaction_id = _.get(res, 'obj.data.result.transactionId', null);
    // if 'booking_id' or 'transaction_id' is null, we won't proceed further and throw error instead
    if (booking_id !== null && transaction_id !== null) {
        // Extracting Booking Details from IDB related to booking ID provided bt BO server
        IdbRTC.findBooking(booking_id).then((bookingDetails) => {
            let { payment_mode, seat_count, booking_type, seat_details, ssn_instance_id } = bookingDetails.booking;
            let { projection } = bookingDetails.movie;
            booking_type = Number(payment_mode) === 1
                ? String(seat_count) + '-0-0-' + (projection === '2D' ? '2D' : '3D')
                : booking_type;
            if (!(payment_mode && seat_count && booking_type && seat_details && ssn_instance_id && projection)) {
                postman.publish('showToast', {
                    message: 'Parameters for generating closing count can not be undefined',
                    type: 'error'
                });
            } else {
                // Generating count from 'inst_reports' table with the below mentioned params
                generateCount({
                    booking_id,
                    payment_mode,
                    seat_details,
                    ssn_instance_id,
                    booking_type
                }).then((counter) => {
                    IdbRTC.findMasterInfo().then(data => {
                        data = data.result;
                        // POST call to Print Master
                        fetch(printMaster, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({
                                browserId: data[0].machine_id,
                                transactionId: transaction_id,
                                id: booking_id,
                                counter: counter
                            })
                        });
                        updatePrintStatusOnPrintEvent({
                            data: {
                                message: 'PRINT',
                                result: { id: booking_id, pos_user_id: pos_user_id, print_status: 1 }
                            }
                        });
                    }, (err) => {
                        postman.publish('showToast', {
                            message: typeof err === 'string' ? err : 'Not able to find master info while sending Print Master call',
                            type: 'error'
                        });
                    });
                }, (err) => {
                    postman.publish('showToast', {
                        message: typeof err === 'string' ? err : `Not able to find closing count for Booking ID ${booking_id}`,
                        type: 'error'
                    });
                });
            }
        }, (err) => {
            postman.publish('showToast', {
                message: typeof err === 'string' ? err : `Not able to find Booking Details for Booking ID ${booking_id}`,
                type: 'error'
            });
        });
    } else {
        postman.publish('showToast', {
            message: `${booking_id === null && 'Booking ID is null in PRINTMASTER.'} ${transaction_id === null && 'Transaction ID is null in PRINTMASTER.'}`,
            type: 'error'
        });
    }
}

postman.subscribe('msgtcln', function (res) {
    let obj = {
        table: _.get(res, 'obj.data.msg', null),
        content: _.get(res, 'obj.data.content', []),
        operation: _.get(res, 'obj.data.operation', null)
    };
    performRealTimeSync(obj, res.obj.data);
});

postman.subscribe('msgtcln', (res) => {
    switch (_.get(res, 'obj.data.message', null)) {
        case 'TRANSACTION':
            transactionEventHandler(res);
            break;
        case 'STATUS':
            statusEventHandler(res);
            break;
        case 'PRINTMASTER':
            printMasterEventHandler(res);
            break;
    }
});