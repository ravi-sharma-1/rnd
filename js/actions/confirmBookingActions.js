import IdbRTC from '../utils/idb_rtc';
import WorkerTimer from 'worker-timer';
import async from 'async';
import base from '../../idb/apis/base';
import blockCall from '../../idb/apis/blockSeat';
import moment from 'moment';
import postman from '../utils/postman';
import { fetch, fetchWithError, fetchRetry } from '../utils/fetch';
import { getAllSessionsData } from '../../idb/apis/sessions';
import { getCinemas } from '../../idb/apis/cinemas';
import { getItemFromLocalStorage } from '../utils/utils';
import { getTeleBookedBySSNId } from '../actions/layoutAction';
import { isSocketRegistered, isSocketConnected, sendMessage, sendMessageToAll } from '../utils/sockets';
import { seatUnBlockingUrl, printStatus, bookUrl, bookMaster, unblockMaster, syncUpBookingData, syncUpRefundStatus } from '../utils/urls';
import { serverLogging, clientLogging } from '../utils/logging';
import { updateAvailableCountInSession } from '../../idb/apis/sessions';
import { updateSeatStatusAfterRefund } from '../../idb/apis/sessionSeatingInfo';

let allowOnline = 'no';
let isMaster = '';
let tr_id = '';
let br_id = '';

/*
 * This hits unblblock seat offline api and returns the promise response.
 * @Params: booking object, navigator status=>offline || online
 * @Returns: Promise response
 */
postman.subscribe('updatedmasterInfo', () => {
    IdbRTC.findMasterInfo().then((data) => {
        isMaster = data.result[0].is_master;
        tr_id = data.result[0].transaction_id;
        br_id = data.result[0].machine_id;
    });
});

/**
 * This method we are using for unblock the seats in offline scenarios local idb endpoints
 * */
export async function unBlockSeatsOffline(objForBlock, navOnlineStatus) {
    return await new Promise((resolve) => {
        IdbRTC.unblockSeat(objForBlock, navOnlineStatus).then((data) => {
            resolve(data);
        });
    });
}

/**
 * Idb endpoints for updating the print status
 * */

export async function updatePrintStatus(objForPrint, isOnline) {
    let obj = {
        booking_id: objForPrint.booking_id,
        pos_user_id: parseInt(localStorage.getItem('userId'))
    };
    return await new Promise((resolve) => {
        IdbRTC.printTicket(obj, isOnline).then((data) => {
            resolve(data);
        });
    });
}

/*
 * This is to get all offline booking data and sync up to the server used in add master
 * */
export async function syncUpTheData() {
    return await new Promise((resolve) => {
        IdbRTC.getOfflineBookData({ isOnline: 0 }).then((data) => {
            resolve(data);
        });
    });
}

/**
 * This end point hit in add master, simply set the status of offline to online
 ***/
export async function updateOfflineBookingsAfterSync(bookingResp) {
    return await new Promise((resolve) => {
        IdbRTC.updateOfflineBookingsAfterSync(bookingResp).then((data) => {
            resolve(data);
        });
    });
}

/**
 * This is for updating the sessions after sync
 * **/
export async function updateOfflineSessionsAfterSync(bookingResp) {
    return await new Promise((resolve) => {
        IdbRTC.updateOfflineSessionsAfterSync(bookingResp).then((data) => {
            resolve(data);
        });
    });
}



/**
 * Sync up routes
 * */
export function syncUpOnlineSend(bookingObj) {
    bookingObj['pos_user_id'] = parseInt(localStorage.getItem('userId'));
    if (isMaster === 1) {
        return fetchWithError(syncUpBookingData, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(bookingObj)
        });
    } else if (isMaster === 0) {
        delete bookingObj['pos_user_id'];
        return new Promise((resolve, reject) => {
            sendMessage({ msg: 'rtcHttp.syncUpOnlineSend', data: { bookingObj } });
            let evt = postman.subscribe('rtcHttp.syncUpOnlineSend.answer', (data) => {
                let respData = JSON.parse(data);
                resolve(respData);
            });
        });
    }
}

/*
 * This hits confirm print ticket api and returns the promise response.
 *  @Params: booking id
 *  @Returns: Promise response
 *
 */

export function updatePrintStatusBO(printStatusObj) {
    printStatusObj['pos_user_id'] = parseInt(localStorage.getItem('userId'));
    if (isMaster === 1) {
        let onlineStatus = getOnlineStatusLocal();
        if (onlineStatus == 'yes') {
            return fetch(printStatus, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(printStatusObj)
            });
        } else if (onlineStatus == 'no') {
            return new Promise((resolve) => {
                resolve({ 'mstatus': 'moffline' });
            });
        }

    } else if (isMaster === 0) {
        return new Promise((resolve, reject) => {
            delete printStatusObj['pos_user_id'];
            sendMessage({ msg: 'rtcHttp.updatePrintStatusBO', data: { printStatusObj } });
            let evt = postman.subscribe('rtcHttp.updatePrintStatusBO.answer', (data) => {
                let respData = JSON.parse(data);
                resolve(respData);
            });
        });
    }
}

/*
 * This function is used to handle cancel booking call and returns the promise response.
 *  @Params: booking id
 *  @Returns: Promise response
 */
export function cancelBooking(bookingObj) {
    let url = seatUnBlockingUrl + bookingObj.id;
    let onlineStatus = getOnlineStatusLocal();
    if (isMaster === 1) {
        if (onlineStatus == 'yes') {
            bookingObj['transactionId'] = tr_id;
            bookingObj['browserId'] = br_id;
            return fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(bookingObj)
            });
        } else if (onlineStatus == 'no') {
            return new Promise((resolve) => {
                resolve({ 'mstatus': 'moffline' });
            });
        }

    } else if (isMaster === 0) {
        return new Promise((resolve, reject) => {
            sendMessage({ msg: 'rtcHttp.cancelBooking', data: { bookingObj } });
            let evt = postman.subscribe('rtcHttp.cancelBooking.answer', (data) => {
                let respData = JSON.parse(data);
                resolve(respData);
            });
        });
    }
}

/*
 * This function is used to handle online booking call and returns the promise response.
 *  @Params: booking id, machine id
 *  @Returns: Promise response
 */
export async function onlineBooking(bookingObj) {
    if (isMaster === 1) {
        let onlineStatus = getOnlineStatusLocal();
        if (onlineStatus == 'yes') {
            bookingObj['transactionId'] = tr_id;
            bookingObj['browserId'] = br_id;
            return fetch(bookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(bookingObj)
            });
        } else if (onlineStatus == 'no') {
            return new Promise((resolve) => {
                resolve({ 'mstatus': 'moffline' });
            });
        }
    } else if (isMaster === 0) {
        return new Promise((resolve, reject) => {
            sendMessage({ msg: 'rtcHttp.onlineBooking', data: { bookingObj } });
            let evt = postman.subscribe('rtcHttp.onlineBooking.answer', (data) => {
                let respData = JSON.parse(data);
                resolve(respData);
            });
        });
    }
}

/*
 * @Param: Date
 * @Param: type => date or time
 * @Returns: formated date or time e.g Date- 1st March, Time- 11:02 AM
 * @Required: sessionData props in store
 */
export function getMovieDateTime(mvdate, type) {
    if (type == 'date') {
        let mvDate = moment(mvdate).format('Do');
        let mvMonth = moment(mvdate).format('MMM');
        return mvDate + ' ' + mvMonth;
    } else {
        return moment(mvdate).format('h:mm A');
    }
}

/*
 * @Param: Time in minutes
 * @Returns: formated movie duration like - 1Hr 3o Mins
 * @Required: sessionData props in store
 */

export function getMovieDuration(mvDration) {
    let hours = Math.floor(mvDration / 60);
    let minutes = Math.floor(mvDration % 60);
    return hours + 'Hr ' + minutes + ' Mins';
}

export async function getCinemaAddress() {
    let response = await getCinemaDetails();
    if (response.status === 400) {
        return 'NA';
    } else {
        const data = await response.json();
        if (data.address || data.city) {
            return data.address + ', ' + data.city;
        } else {
            return 'NA';
        }
    }
}

/*
 * Read props selectedValue and get booked seats
 * @Required: selectedValue props in store
 * @Returns: string of sorted array of booked seats like A-1,2,3..
 */

export function getSeats(seatsString, type) {
    let seats = {};
    let seatsArray = [], newSeatsArray = [];
    let bookedSeats = '';
    let patt = /-(\D+-\d+)/, items, newStr, pipeIndex;
    pipeIndex = seatsString.indexOf('|');
    newStr = seatsString.slice((pipeIndex + 1), (seatsString.length));
    let item = newStr.split(';');
    item.map(function (val, index) {
        items = val.match(patt);
        if (items && items.length) {
            seatsArray.push(items[1]);
        }
    });
    seatsArray = seatsArray.sort();
    if (type == 'object') {
        return seatsArray;
    } else if (type == 'string') {
        return seatsArray.join(',');
    }
}
// Utility methods

export function gtNoOfTickets(seatsString) {
    let seatsArray = [];
    if (seatsString && seatsString.indexOf(';') > -1) {
        seatsArray = seatsString ? seatsString.split(';') : [];
    } else {
        seatsArray.push(seatsString);
    }

    return seatsArray.length;

}
//Supporting methods

export function getCatName(seatsString) {
    return { cats: seatsString.split('-')[0] };
}

// This method is used when booking is happening from App
export function updateLocalBooking(bookingObj, navOnlineStatus) {
    let bookingId = bookingObj.data.result.id;
    let reaqData = {
        booking_id: bookingId,
        payment_mode: bookingObj.data.result.payment_mode,
        invoice: bookingObj.data.result.invoice,
        booking_type: bookingObj.data.result.booking_type
    };
    if (bookingId) {
        IdbRTC.findMasterInfo().then((data) => {
            data = data.result;
            if (data[0]) {
                var isMaster = data[0].is_master;
                reaqData['is_slave'] = isMaster;
                bookingObj.data.result['updated_at'] = new Date().toISOString();
                IdbRTC.bookSeat(reaqData, navOnlineStatus).then((data) => {
                    if (data.result == 'Done') {
                        postman.publish('LOCALBOOKINGUPDATED', {
                            data: bookingObj.data.result,
                            type: 'success'
                        });
                    } else {
                        postman.publish('LOCALBOOKINGUPDATED', {
                            data: bookingObj.data.result,
                            type: 'error'
                        });
                    }

                });
            }
        });
    } else {
        postman.publish('LOCALBOOKINGUPDATED', {
            type: 'error'
        });
    }
}

//

export async function updateBookMaster(masterBookObj, isOnlineStatus, statusBM) {

    let bookingId = masterBookObj.data.result.id;
    let reqData = {
        booking_id: bookingId,
        payment_mode: masterBookObj.data.result.payment_mode,
        transactionId: masterBookObj.data.result.transactionId,
        seat_count: masterBookObj.data.result.seatCount,
        seat_details: masterBookObj.data.result.seatDetails,
        pos_user_id: masterBookObj.data.result.pos_user_id,
        ssn_instance_id: masterBookObj.data.result.ssnInstanceId,
        print_status: masterBookObj.data.result.print_status,
        booking_type: masterBookObj.data.result.booking_type
    };
    //Add counter object in masterObj needed at BO
    //counter object should not be appended in case of app or web bookings
    //generate opening/closing count in IDB if booking received from slave
    if (masterBookObj.data.result.payment_mode !== 1) {
        /* await generateCount(reqData).then((data)=>{
         reqData.counter = data;
         reqData.counter.ssn_instance_id= masterBookObj.data.result.ssnInstanceId;
         masterBookObj.data.result.counter = data;
         masterBookObj.data.result.counter.ssn_instance_id = masterBookObj.data.result.ssnInstanceId;
         });*/
    }

    if (bookingId) {
        IdbRTC.findMasterInfo().then((data) => {
            data = data.result;
            if (data[0]) {
                var isMaster = data[0].is_master;
                reqData['is_slave'] = isMaster;
                IdbRTC.bookSeat(reqData, isOnlineStatus).then((data) => {
                    if (data.result == 'Done') {
                        if ((statusBM == 'bm') && reqData && reqData.pos_user_id) {
                            updatePrintStatusOnPrintEvent(masterBookObj);
                        }
                    } else {
                        serverLogging(`Error while Booking in IndexedDb: ${bookingId}`, data);
                        postman.publish('showToast', {
                            message: 'Error while updating booking for master!',
                            type: 'error'
                        });
                    }

                });
                // blockCall.bookSeat(reqData, isOnlineStatus, (data) => {
                //     if (data.result == 'Done') {
                //         if ((statusBM == "bm") && reqData && reqData.pos_user_id) {
                //             updatePrintStatusOnPrintEvent(masterBookObj);
                //         }
                //     } else {
                //         serverLogging(`Error while Booking in IndexedDb: ${bookingId}`, data);
                //         postman.publish('showToast', {
                //             message: 'Error while updating booking for master!',
                //             type: 'error'
                //         });
                //     }
                //
                // }, (invoiceData) => {
                //     masterBookObj.data.result["invoice"] = invoiceData;
                //     updateBO(masterBookObj).then((response) => {
                //         if (response.status === 200) {
                //             serverLogging(`BO server acknowledged successfully : ${bookingId}`, masterBookObj);
                //             postman.publish('showToast', {
                //                 message: 'Acknowledge to Box Office successful!',
                //                 type: 'success'
                //             });
                //         }
                //     }).catch(e => {
                //         serverLogging(`Error while acknowledging to BO server : ${bookingId}`, masterBookObj);
                //     });
                // });
            }
        });
    }


}

/**
 * Booking happening through app
 * */

export function bookMasterCallback(masterBookObj, isOnlineStatus, statusBM) {
    if (masterBookObj.data.result.booking_type === null && masterBookObj.data.result.payment_mode === 1) {
        IdbRTC.findSessionDetails(masterBookObj.data.result.ssnInstanceId).then((session) => {
            IdbRTC.findMovieDetails(session.movie_id).then((movie) => {
                masterBookObj.data.result.booking_type = String(masterBookObj.data.result.seatCount) + '-0-0-' + movie.projection;
                updateBookMaster(masterBookObj, isOnlineStatus, statusBM);
            });
        });
    } else {
        updateBookMaster(masterBookObj, isOnlineStatus, statusBM);
    }
}
/**
 * Online end point for book master
 * */
export function updateBO(obj) {
    if (isMaster === 1) {
        return fetchRetry(bookMaster, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(obj.data.result)
        });
    } else if (isMaster === 0) {
        return new Promise((resolve, reject) => {
            sendMessage({ msg: 'rtcHttp.updateBO', data: { obj } });
            let evt = postman.subscribe('rtcHttp.updateBO.answer', (data) => {
                let respData = JSON.parse(data);
                resolve(respData);
            });
        });
    }
}
/**
 * Local IDB end point for unblock
 * */

export function updateUnblock(unblockObj, navigatorStatus) {
    let bookingId = unblockObj.data.result.id;
    let reaqData = {
        booking_id: bookingId
    };
    IdbRTC.unblockSeat(reaqData, navigatorStatus).then((data) => {
        if (data.result == 'Done') {
            postman.publish('unblockdonecompleted');
            postman.publish('UNBLOCKDONE', {
                type: 'success'
            });
            sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
        } else {
            postman.publish('UNBLOCKDONE', {
                type: 'error'
            });
        }

    });
}
/**
 * When booking is done locally it gives confirmation
 * */
export function updateBook(bookObj) {
    let isOnline = isSocketRegistered() && isSocketConnected() ? 1 : 0;
    IdbRTC.addUpdateBooking(bookObj, isOnline).then((data) => {
        postman.publish('showToast', {
            message: data.result === 'Done' ? 'Bookings updated successfully!' : 'Error while bookings update!',
            type: data.result === 'Done' ? 'success' : 'error'
        });
    });
}
/**
 * When unblock happend from app
 * */

export function updateUnblockMaster(masterObj) {
    let reqData = {
        table: 'bookings',
        data: {
            booking_id: masterObj.data.result.id
        }
    };
    base.remove(reqData).then((data) => {
        if (data.result == 'Done') {
            updateBoUnblock(masterObj).then((response) => {
                if (response.status === 200) {
                    serverLogging(`MASTERUNBLOCK: BO acknowledged successfully : ${masterObj.data.result.id}`, response);
                    postman.publish('MASTERUNBLOCKDONE', {
                        type: 'success'
                    });
                }
            }).catch((e) => {
                serverLogging(`MASTERUNBLOCK: Error while acknowledging BO  : ${masterObj.data.result.id}`, e);
            });
        }
    }).catch((error) => {
        postman.publish('showToast', {
            message: error.message,
            type: 'error'
        });
        postman.publish('MASTERUNBLOCKDONE', {
            type: 'error'
        });
    });

}
/**
 * After unblock confirm to app
 * */

export function updateBoUnblock(obj) {
    if (isMaster === 1) {
        return fetchRetry(unblockMaster, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(obj.data.result)
        });
    } else if (isMaster === 0) {
        return new Promise((resolve, reject) => {
            sendMessage({ msg: 'rtcHttp.updateBoUnblock', data: { obj } });
            let evt = postman.subscribe('rtcHttp.updateBoUnblock.answer', (data) => {
                let respData = JSON.parse(data);
                resolve(respData);
            });
        });
    }
}

/**
 *  3 times call same syncup data
 **/
let temp = 1;
function retryToSendDataUp() {
    setTimeout(function () {
        if (temp <= 3) {
            handleSyncUpDataAtOnline(temp);
        } else {
            postman.publish('showToast',
                {
                    message: 'Issue in syncing dataup, Please contact admin to work online',
                    type: 'error'
                });
            localStorage.setItem('allowOnline', 'no');
            postman.publish('syncUpDone');
        }
    }, 3000);
}

/**
 * Update retry count
 * */

export function updateRetryCount(count) {
    temp = count;
}

/**
 * get online status from db
 * */
export function getOnlineStatusLocal() {
    return allowOnline;
}
/**
 *
 * set online status to
 * */
export function setOnlineStatusLocal(status) {
    allowOnline = status;
}

/*
 * This is to sync up the data of master
 * */

export function handleSyncUpDataAtOnline(countData, firstTime) {
    IdbRTC.findMasterInfo().then((data) => {
        data = data.result;
        if (data[0]) {
            var isMaster = data[0].is_master;
            var tr_id = data[0].transaction_id;
            let bookingData = {};
            if (!isMaster) {
                setOnlineStatusLocal('yes');
                postman.publish('updateOnlineStatus', 'yes');
                postman.publish('syncUpDone');
                serverLogging('Slave called without add master');
                return;
            }
            if (tr_id && isMaster) {
                bookingData['transactionId'] = tr_id;
                bookingData['browserId'] = data[0].machine_id;
                bookingData['count'] = countData ? countData : temp;
                if (firstTime) {
                    bookingData['sessionData'] = [];
                    bookingData['data'] = [];
                    bookingData['bdata'] = [];
                    bookingData['rdata'] = [];
                    bookingData['tdata'] = [];
                    bookingData['invoice'] = null;
                    var syncUpResp = syncUpOnlineSend(bookingData);
                    syncUpResp.then((respDataFromServ) => {
                        serverLogging('Add master hit online route for first time login');
                        if (respDataFromServ.hasOwnProperty('result')) {
                            serverLogging('Add master hit online route for first time login : add master succeeded');
                        } else {
                            this.retryToSendDataUp();
                        }
                    }).catch(function (err) {
                        serverLogging('Add master hit online route for first time login : error', err);
                    });
                    setOnlineStatusLocal('yes');
                    postman.publish('updateOnlineStatus', 'yes');
                    postman.publish('syncUpDone');
                    return;
                    //Send up the data on register event
                }
                var bookingOfflineData = syncUpTheData();
                bookingOfflineData.then((respOriginal) => {
                    let resp = respOriginal;
                    bookingData['sessionData'] = resp.sessionData;
                    localStorage.setItem('sessionData', JSON.stringify(resp.sessionData));
                    delete resp.sessionData;
                    localStorage.setItem('bookDetail', JSON.stringify(resp));
                    bookingData['data'] = resp.bookData;
                    bookingData['bdata'] = resp.blockData;
                    bookingData['rdata'] = resp.refundData;
                    bookingData['tdata'] = resp.tData;
                    IdbRTC.getCinemas().then(cinemaDetails => {

                        bookingData['invoice'] = cinemaDetails[0] && cinemaDetails[0].invoice || null;
                        //Send up the data on register event
                        var syncUpResp = syncUpOnlineSend(bookingData);
                        serverLogging('Add master hit online route normal : with data', bookingData);
                        syncUpResp.then((respDataFromServ) => {
                            serverLogging('Add master hit online route normal : response from route', respDataFromServ);
                            if (respDataFromServ.hasOwnProperty('result')) {
                                var dataFromLocal = localStorage.getItem('bookDetail');
                                dataFromLocal = JSON.parse(dataFromLocal);
                                updateOfflineBookingsAfterSync(dataFromLocal);
                                updateOfflineSessionsAfterSync(JSON.parse(localStorage.getItem('sessionData')));
                                postman.publish('showToast', {
                                    message: 'Data synced with server successfully',
                                    type: 'success'
                                });
                                postman.publish('syncUpDone');
                                postman.publish('syncOnSocketConnect');
                                setOnlineStatusLocal('yes');
                                postman.publish('updateOnlineStatus', 'yes');
                            }
                        }).catch(function (err) {
                            serverLogging('Add master hit online route normal : error', err);
                            if (err.response && err.response.status == 400) {
                                err.response.json().then(function (errorResp) {
                                    postman.publish('showToast', {
                                        message: errorResp.error.message,
                                        type: 'error'
                                    });
                                    retryToSendDataUp();
                                    setOnlineStatusLocal('no');
                                    postman.publish('updateOnlineStatus', 'no');
                                    temp++;
                                });

                            } else if (err.response && err.response.status == 500) {
                                postman.publish('showToast', {
                                    message: 'Issue in syncing dataup, Please contact admin to work online',
                                    type: 'error'
                                });
                                setOnlineStatusLocal('no');
                                postman.publish('updateOnlineStatus', 'no');

                            } else {
                                setOnlineStatusLocal('no');
                                postman.publish('updateOnlineStatus', 'no');
                            }
                        });
                    });

                });
            }
        }
    });
}
/*
 * This method is to check the status of sheet whether it's online or offline blocked
 * */
export function getBookingById(bookingId, cb) { //data => {booking_id : "asdaf"}
    return base.select({ table: 'bookings', data: { booking_id: bookingId } });
}

/*
 * Unblock sheet when there is sheet blocked for more than 10 minutes.
 * */

function getAllBookingData(statusCode) { //data => {booking_id : "asdaf"}
    const obj = {
        table: 'bookings',
        data: { status: statusCode }
    };
    return base.select(obj);
}

/**
 * Remove data which is more than 10 in block mode
 * */


export function deleteOldBlockedSeat(bookingId) { //data => {booking_id : "asdaf"}
    const obj = {
        table: 'bookings',
        data: { id: bookingId }
    };
    return base.remove(obj);
}



/**
 * This is the status call for blocked sheets
 * */

export function deleteBlockedSheets(timeToDelete) {
    var currentTime = moment().format('YYYY-MM-DD HH:mm');
    var currentDate = new Date(currentTime);
    getAllBookingData(2).then((data) => {
        (data.result && data.result.length > 0) && data.result.map(function (blockingData, index) {
            var blockTime = new Date(blockingData.updated_at);
            var difference = currentDate.getTime() - blockTime.getTime();
            difference = Math.round(difference / 60000);
            if (blockingData.status == 2 && difference >= timeToDelete) {
                let bookingId = blockingData.booking_id;
                deleteOldBlockedSeat(blockingData.booking_id).then((cancelResp) => {
                    let appOnlineAllow = getOnlineStatusLocal();
                    let isOnline = (appOnlineAllow == 'yes') && isOnline ? 1 : 0;
                    isOnline && IdbRTC.findMasterInfo().then((data) => {
                        data = data.result;
                        let browserId = (data && data[0] && data[0].machine_id) || null;
                        let tranId = (data && data[0] && data[0].transaction_id) || null;
                        var cancelBookingObj = {
                            id: bookingId,
                            browserId: browserId,
                            transactionId: tranId
                        };
                        cancelBooking(cancelBookingObj, isOnline);
                    });
                    postman.publish('removedBlockedSheets');
                }).catch((error) => {
                    postman.publish('showToast', {
                        message: 'Issue in unblocking',
                        type: 'error'
                    });
                });
            }
        });
    }).catch((error) => {
        postman.publish('showToast', {
            message: error.message,
            type: 'error'
        });
    });
    getAllBookingData(16).then((data) => {
        (data.result && data.result.length > 0) && data.result.map(function (unBlockingData, index) {
            var blockTime = new Date(unBlockingData.updated_at);
            var difference = currentDate.getTime() - blockTime.getTime();
            difference = Math.round(difference / 60000);
            if (unBlockingData.status == 16 && difference >= timeToDelete) {
                let bookingId = unBlockingData.booking_id;
                deleteOldBlockedSeat(unBlockingData.booking_id).then((cancelResp) => {
                    postman.publish('showToast', {
                        message: 'Issue in unblocking',
                        type: 'error'
                    });
                }).catch((error) => {
                    postman.publish('showToast', {
                        message: 'Issue in unblocking',
                        type: 'error'
                    });
                });
            }
        });
    }).catch((error) => {
        postman.publish('showToast', {
            message: error.message,
            type: 'error'
        });
    });
}
/*
 * This is the timer for unblocking sheets
 * */
export function unblockSeatTimer() {
    let count = 0;
    //Every two minutes unblock call go
    var timeIntervalForUnblock = 1000 * 60 * 2;
    WorkerTimer.setInterval(() => {
        deleteBlockedSheets(15);
    }, timeIntervalForUnblock);
}

export function updatePrintStatusOnPrintEvent(printObj) {
    let obj = {
        booking_id: printObj.data.result.id,
        pos_user_id: printObj.data.result.pos_user_id
    };
    let isOnline = isSocketRegistered() && isSocketConnected();
    let appOnlineAllow = getOnlineStatusLocal();
    isOnline = (appOnlineAllow == 'yes') && isOnline ? 1 : 0;
    IdbRTC.printTicket(obj, isOnline).then((data) => {
        if (data.result == 'Done') {
            postman.publish('showToast', {
                message: 'Print status updated successfully!',
                type: 'success'
            });

        } else {
            postman.publish('showToast', {
                message: data.error,
                type: 'error'
            });
        }
    });
}
/**
 * Same method used for cancellation
 * */
export function handleCancelBooking(id) {
    let appOnlineAllow = getOnlineStatusLocal();
    let isOnline = (appOnlineAllow == 'yes') ? 1 : 0;
    if (appOnlineAllow == 'yes') {
        IdbRTC.findMasterInfo().then((masterInfo) => {
            masterInfo = masterInfo.result;
            if (masterInfo && masterInfo[0]) {
                var isMaster = masterInfo[0].is_master;
                var browserId = (masterInfo && masterInfo[0] && masterInfo[0].machine_id) || null;
                var transactionId = (masterInfo && masterInfo[0] && masterInfo[0].transaction_id) || null;
                let bookingObj = {
                    'id': id,
                    'browserId': browserId,
                    'transactionId': transactionId
                };
                let resp = cancelBooking(bookingObj);
                resp.then((response) => {
                    serverLogging(bookingObj, response + 'auto cancel seats online');
                    if (response.status === 400) {
                        response.json().then((data) => {
                        });
                    } else if (response.status === 200) {
                        let unblockAction = unBlockSeatsOffline({ booking_id: id }, isOnline);
                        unblockAction.then((data) => {
                            postman.publish('teleBlockedSeatsAutoRelease');
                            serverLogging(bookingObj, data + 'auto cancel seats online&&local');
                        });
                    }
                });
            }
        });
    } else if (appOnlineAllow == 'no') {
        let unblockAction = unBlockSeatsOffline({ booking_id: id }, isOnline);
        unblockAction.then((data) => {
            postman.publish('teleBlockedSeatsAutoRelease');
            serverLogging(id, data + 'auto cancel seats offline&&local');
        }, (err)=>{
            console.log(err);
        });
    }
}

/**
 * This method is for releasing the telebooked seats
 * */

export async function releaseTeleBlock() {
    getCinemas().then(cinemaDetails => {
        let teleBlockCutoffTime = cinemaDetails[0] && cinemaDetails[0].tele_cutoff || 0;
        let currentDate = new Date();
        getAllSessionsData().then((res) => {
            res.map((sessionData) => {
                let dt = new Date(sessionData.start_date_time);
                dt.setMinutes(dt.getMinutes() + teleBlockCutoffTime);
                if (currentDate.getTime() >= dt.getTime()) {
                    getTeleBookedBySSNId({ ssn_instance_id: sessionData.id }).then((teleBookedData) => {
                        teleBookedData.result.length > 0 && teleBookedData.result.map((telResp) => {
                            let id = telResp.booking_id || '';
                            if (id) {
                                handleCancelBooking(id);
                            }
                        });
                    }, (error) => {

                    });
                }
            });
        }, (err) => {
            serverLogging('Some issue in fetching sessions', err);
        });
    });
}
/**
 * Here we are auto releasing the teleblocked seats based on cutoff time
 * */
export async function teleBokingCrawler() {
    WorkerTimer.setInterval(() => {
        releaseTeleBlock();
    }, 1000);
}
export async function refundBooking(bookingObj, browserId, transactionId) {
    let user = getItemFromLocalStorage('userData');
    let refundObj = {
        id: bookingObj['booking_id'],
        browserId: browserId || br_id,
        transactionId: transactionId || tr_id,
        rpos_user_id: user['id'],
        cinemaId: user['cinema_id']
    };
    if (isMaster === 1) {
        return fetchRetry(`${syncUpRefundStatus}/${bookingObj.booking_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(refundObj)
        });
    } else if (isMaster === 0) {
        return new Promise((resolve, reject) => {
            sendMessage({ msg: 'rtcHttp.refundBooking', data: { bookingObj } });
            let evt = postman.subscribe('rtcHttp.refundBooking.answer', (data) => {
                let respData = JSON.parse(data);
                resolve(respData);
            });
        });
    }
}


/* 1. Send an online refund call in case the POS is online, else will add isOnline =0 flag in it.
   2. Update available_count in the sessions table
   3. Update seat status in seatsessionInfo table 
   4. Updates booking table with cancel status
*/
export async function refundChangesUpdatedInDB(opt) {
    let cb = function (res) {
        if (res.error) {
            postman.publish('showToast', {
                message: 'Refund changes sent from master could not be updated in bookings' + res.error,
                type: 'error'
            });
        } else {
            async.parallel([function (callback) {
                IdbRTC.updateAvailableCountInSession(bookingData).then(() => {
                    callback(null);
                }).catch((err) => {
                });
            }, function (callback) {
                IdbRTC.updateSeatStatusAfterRefund(bookingData).then(() => {
                    callback(null);
                }).catch((err) => {
                });
            }], function (err, res) {
                if (err) {
                    postman.publish('showToast', {
                        message: 'Refund changes sent from master could not be updated in sessions table',
                        type: 'error'
                    });
                } else {
                    postman.publish('showToast', {
                        message: 'Refund data sent from master saved successfully',
                        type: 'success'
                    });
                    postman.publish('removedBlockedSheets');
                }
            });
        }
    };
    if (!opt || !opt.id) {
        cb({ error: 'Booking Id not found' });
    }
    const bookingSel = {
        table: 'bookings',
        data: {
            booking_id: opt.id
        }
    };

    let bookingData = {};
    return base.select(bookingSel).then((bookRes) => {
        if (bookRes.error) {
            return cb(bookRes);
        }

        bookingData = bookRes.result;
        if (isNaN(opt.rpos_user_id)) {
            return cb({ error: 'Invalid User ID' });
        }

        bookingData.status = 64;
        bookingData.rpos_user_id = Number(opt.rpos_user_id);
        bookingData.isOnline = 1;
        bookingData.updated_at = new Date().toISOString();
        // bookingData.seat_count= opt.seat_count;
        // bookingData.seat_details= opt.seat_details;
        return base.add({ table: 'bookings', data: [bookingData] }).then(cb).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
        });
    }).catch((error) => {
        postman.publish('showToast', {
            message: error.message,
            type: 'error'
        });
    });
}