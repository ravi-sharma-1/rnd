import 'whatwg-fetch';
import seatLayoutData from '../components/Layout/SeatLayout.json';
import layoutConfigForBlock from '../components/Layout/blockConfig.json';
import { GOTAPIDATA, SELECTEDSEATS, SESSIONDATA } from '../constants/AppConstants';

import { sendMessage, sendMessageToAll } from '../utils/sockets';
import { getOnlineStatusLocal } from '../actions/confirmBookingActions';
import IdbRTC from '../utils/idb_rtc';
import { blockSeatData, teleBlockOnline, modifyTeleBlockOnline } from '../utils/urls';
const seat_layout = require('../../idb/apis/seatLayout');
const blockCall = require('../../idb/apis/blockSeat');
const teleBlock = require('../../idb/apis/telebooking');
import postman from '../utils/postman';
import _ from 'lodash';
let isMaster = '';
let tr_id = '';
let br_id = '';
/**
 * This event is for udating master details of currently running app
 * */
postman.subscribe('updatedmasterInfo', () => {
    IdbRTC.findMasterInfo().then((data) => {
        isMaster = data.result[0].is_master;
        tr_id = data.result[0].transaction_id;
        br_id = data.result[0].machine_id;
    });
});

/**
 * This action method is used for getting seatlayout data from indexdb.
 * */
export function getSeatData(audiId, ssnId) {
    let layoutReq = {
        table: 'audis',
        data: {
            id: audiId
        }
    };
    let bookingReq = {
        table: 'bookings',
        data: {
            ssn_instance_id: ssnId
        }
    };
    return IdbRTC.getAudiData(layoutReq, bookingReq);
}
/**
 * This is idb method for blocking seats offline
 * */

export async function setOfflineBlocking(objForBlock) {
    return await new Promise((resolve, reject) => {
        IdbRTC.blockSeatOffline(objForBlock).then((data) => {
            resolve(data);
        }).catch((error) => { reject(error); });
    });
}

/**
 * This is optional method can be use to get all the orders from booking table
 *
 * **/

export async function getOrderData() {
    return await new Promise((resolve) => {
        IdbRTC.getOfflineBookData({ 'status': 4 }).then((data) => {
            resolve(data);
        });
    });
}
/**
 *
 * This is IDB method for setting block online mode
 * **/

export async function addTeleBlock(data) {
    return await new Promise((resolve) => {
        IdbRTC.addtelebookSeat(data).then((data) => {
            resolve(data);
        });
    });
}
/**
 * This is an idb mehtod to get if phone number already exist
 * */

export async function getPhoneNumberStatus(data) {
    return await new Promise((resolve) => {
        IdbRTC.getBookingsviaPhoneNumber(data).then((data) => {
            resolve(data);
        });
    });
}
/**
 *
 * Get all the teleblocked seats for a sepecific session
 * */

export async function getTeleBookedBySSNId(data) {
    return await new Promise((resolve) => {
        IdbRTC.fetchAllTelebookingBySSNId(data).then((data) => {
            resolve(data);
        });
    });
}

/**
 *
 * This is for modifying the teleblocked seats locally
 * */

export async function modifyTeleBlockedLocal(data) {
    return await new Promise((resolve) => {
        IdbRTC.modifyTelebooking(data).then((data) => {
            resolve(data);
        });
    });
}

/**
 * This is for teleblock seats online
 * **/

export async function teleBlockOnlineEndPoint(data) {
    let onlineStatus = getOnlineStatusLocal();
    if (isMaster === 1) {
        if (onlineStatus == 'yes') {
            data['transactionId'] = tr_id;
            data['browserId'] = br_id;
            return fetch(teleBlockOnline, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } else if (onlineStatus == 'no') {
            return new Promise((resolve) => {
                resolve({ 'mstatus': 'moffline' });
            });
        }

    } else if (isMaster === 0) {
        return new Promise((resolve, reject) => {
            sendMessage({ msg: 'rtcHttp.teleBlockOnlineEndPoint', data: { data } });
            let evt = postman.subscribe('rtcHttp.teleBlockOnlineEndPoint.answer', (data) => {
                let respData = JSON.parse(data);
                resolve(respData);
            });
        });
    }
}
/**
 *
 * This is for modify the teleblock seats online
 * */

export async function modifyTeleBlockOnlineEndPoint(data) {
    let onlineStatus = getOnlineStatusLocal();
    if (isMaster === 1) {
        if (onlineStatus == 'yes') {
            data['transactionId'] = tr_id;
            data['browserId'] = br_id;
            return fetch(modifyTeleBlockOnline, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } else if (onlineStatus == 'no') {
            return new Promise((resolve) => {
                resolve({ 'mstatus': 'moffline' });
            });
        }

    } else if (isMaster === 0) {
        return new Promise((resolve, reject) => {
            sendMessage({ msg: 'rtcHttp.modifyTeleBlockOnlineEndPoint', data: { data } });
            let evt = postman.subscribe('rtcHttp.modifyTeleBlockOnlineEndPoint.answer', (data) => {
                let respData = JSON.parse(data);
                resolve(respData);
            });
        });
    }
}

/**
 *  Set OnlineBlocking for
 * */

export async function setOnlineBlocking(objForBlock) {
    const modfiedObj = {
        table: 'bookings',
        data: [objForBlock]
    };
    return await new Promise((resolve) => {
        IdbRTC.blockSeatOnline(modfiedObj).then((data) => {
            resolve(data);
        });
    });
}

/**
 * This is online route for block seats on BO. here if master is offline and slave is online trying to do the booking then it sends "mstatus":"moffline" to slave for continuing the booking. And slave directly send an event to master for blocking and master return the response in both the cases.
 * */

export function blockSeats(seatInfo) {
    let onlineStatus = getOnlineStatusLocal();
    if (isMaster === 1) {
        if (onlineStatus == 'yes') {
            seatInfo['transactionId'] = tr_id;
            seatInfo['browserId'] = br_id;
            return fetch(blockSeatData, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(seatInfo)
            });
        } else if (onlineStatus == 'no') {
            return new Promise((resolve) => {
                resolve({ 'mstatus': 'moffline' });
            });
        }

    } else if (isMaster === 0) {
        return new Promise((resolve, reject) => {
            sendMessage({ msg: 'rtcHttp.blockSeats', data: { seatInfo } });
            let evt = postman.subscribe('rtcHttp.blockSeats.answer', (data) => {
                let respData = JSON.parse(data);
                resolve(respData);
            });
        });
    }

}
/**
 *
 * This is reducer method for sharing data between confrim booking.
 * */

export function seatSelectedFromLayout(seatsCollection) {
    return dispatch => {
        dispatch({ type: SELECTEDSEATS, message: seatsCollection });
    };
}

/**
 * This is to get the default config data for making calls compatible to storage
 * */

export function getSeatBlockObjForBackend() {
    return _.cloneDeep(layoutConfigForBlock);
}

/**
 * This is online block update call trough events from app.
 * */

export function handleBlockUpdate(obj) {
    /*This is to update block based on events*/
    var currentPos = localStorage.getItem('userId');
    var blockUpdateInfo = getSeatBlockObjForBackend().seatBlockOnline;
    blockUpdateInfo.booking_id = obj.data.result.id;
    blockUpdateInfo.seat_details = obj.data.result.seatDetails;
    blockUpdateInfo.seat_count = obj.data.result.seatCount;
    blockUpdateInfo.pos_user_id = obj.data.result.pos_user_id ? obj.data.result.pos_user_id : 'App';
    blockUpdateInfo.ssn_instance_id = obj.data.result.ssnInstanceId;
    blockUpdateInfo.print_status = obj.data.result.pos_user_id == currentPos ? 0 : obj.data.result.print_status;
    var seatBlocked = setOnlineBlocking(blockUpdateInfo);
    seatBlocked.then(function (resp) {
        if (resp.hasOwnProperty('error')) {
            postman.publish('showToast', {
                message: resp.error,
                type: 'error'
            });
        } else if (resp.hasOwnProperty('id') && resp.id) {
            postman.publish('blockedSeatGotUpdated');
            postman.publish('showToast', {
                message: 'Blocking updated successfully',
                type: 'success'
            });
            sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
        }
    });
}