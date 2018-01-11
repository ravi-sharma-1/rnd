import _ from 'lodash';
import postman from '../utils/postman';
import webApis from '../../idb/apis/webApis';
import { sendMessage } from '../utils/sockets';
import { getCinemas } from '../../idb/apis/cinemas';
import blockCall from '../../idb/apis/blockSeat';
import { getMovieDetails, getMoviesById } from '../../idb/apis/movies';
import { cancelBooking } from '../../idb/apis/bookings';
import base from '../../idb/apis/base';
import seat_layout from '../../idb/apis/seatLayout';
import { updateAvailableCountInSession, getSessionById } from '../../idb/apis/sessions';
import { updateSeatStatusAfterRefund } from '../../idb/apis/sessionSeatingInfo';
const teleBlock = require('../../idb/apis/telebooking');

let isMaster = '';

webApis.findMasterInfo().then((data) => {
    isMaster = _.get(data, 'result[0].is_master', '');
});

postman.subscribe('updatedmasterInfo', () => {
    webApis.findMasterInfo().then((data) => {
        isMaster = _.get(data, 'result[0].is_master', '');
    });
});

function createRTCPromise(str, data) {
    postman.publish('showLoader', 'rtc.' + str);
    return new Promise((resolve, reject) => {
        sendMessage({ msg: 'rtc.' + str, data: data });
        let successEvt = postman.subscribe('rtc.' + str + '.answer', (data) => {
            resolve(data);
            successEvt.remove();
            FailureEvt.remove();
            postman.publish('hideLoader', 'rtc.' + str);
        });
        let FailureEvt = postman.subscribe('rtc.' + str + '.error', (data) => {
            reject(data);
            successEvt.remove();
            FailureEvt.remove();
            postman.publish('hideLoader', 'rtc.' + str);
        });
    });
}

function defaultHandle() {
    return new Promise((resolve, reject) => { reject({ code: 'NO_MASTER_INFO', message: 'No Master Info to proceed.' }); });
}

class IdbRTC {

    findMasterInfo() {
        return webApis.findMasterInfo();
    }

    updateMasterInfo() {
        return webApis.updateMasterInfo();
    }

    realTimeSync(tempObj, fullObjInfo) {
        return webApis.realTimeSync(tempObj, fullObjInfo);
    }

    deleteRelatedSessions(table, id) {
        return webApis.deleteRelatedSessions(table, id);
    }

    getLog() {
        return webApis.getLog();
    }

    addLog(log) {
        return webApis.addLog(log);
    }

    deleteLog(logs) {
        return webApis.deleteLog(logs);
    }

    getAllNeededSessionsBooking(neededSessions) {
        return isMaster === 1 ? webApis.getAllNeededSessionsBooking(neededSessions) : isMaster === 0 ? createRTCPromise('getAllNeededSessionsBooking', { neededSessions }) : defaultHandle();
    }

    getAllNeededMovies(neededMovies) {
        return isMaster === 1 ? webApis.getAllNeededMovies(neededMovies) : isMaster === 0 ? createRTCPromise('getAllNeededMovies', { neededMovies }) : defaultHandle();
    }

    findAudiDetails() {
        return isMaster === 1 ? webApis.findAudiDetails() : isMaster === 0 ? createRTCPromise('findAudiDetails', {}) : defaultHandle();
    }

    getMovieDetails() {
        return isMaster === 1 ? getMovieDetails() : isMaster === 0 ? createRTCPromise('getMovieDetails', {}) : defaultHandle();
    }

    getCinemas() {
        return isMaster === 1 ? getCinemas() : isMaster === 0 ? createRTCPromise('getCinemas', {}) : defaultHandle();
    }

    findAllAudi() {
        return isMaster === 1 ? webApis.findAllAudi() : isMaster === 0 ? createRTCPromise('findAllAudi', {}) : defaultHandle();
    }

    findAllSessions() {
        return isMaster === 1 ? webApis.findAllSessions() : isMaster === 0 ? createRTCPromise('findAllSessions', {}) : defaultHandle();
    }

    getBookingsBySessions(id) {
        return isMaster === 1 ? webApis.getBookingsBySessions(id) : isMaster === 0 ? createRTCPromise('getBookingsBySessions', { id }) : defaultHandle();
    }

    findBooking(bkingId) {
        return isMaster === 1 ? webApis.findBooking(bkingId) : isMaster === 0 ? createRTCPromise('findBooking', { bkingId }) : defaultHandle();
    }

    getUsers() {
        return isMaster === 1 ? webApis.getUsers() : isMaster === 0 ? createRTCPromise('getUsers', {}) : defaultHandle();
    }

    cancelBooking(booking, isOnline) {
        return isMaster === 1 ? cancelBooking(booking, isOnline) : isMaster === 0 ? createRTCPromise('cancelBooking', { booking, isOnline }) : defaultHandle();
    }

    findAudiDetails() {
        return isMaster === 1 ? webApis.findAudiDetails() : isMaster === 0 ? createRTCPromise('findAudiDetails', {}) : defaultHandle();
    }

    findAllMovies() {
        return isMaster === 1 ? webApis.findAllMovies() : isMaster === 0 ? createRTCPromise('findAllMovies', {}) : defaultHandle();
    }

    getAudiData(layoutReq, bookingReq) {
        return isMaster === 1 ? seat_layout.getAudiData(layoutReq, bookingReq) : isMaster === 0 ? createRTCPromise('getAudiData', { layoutReq, bookingReq }) : defaultHandle();
    }

    blockSeatOffline(objForBlock) {
        return isMaster === 1 ? blockCall.blockSeatOffline(objForBlock) : isMaster === 0 ? createRTCPromise('blockSeatOffline', { objForBlock }) : defaultHandle();
    }

    getOfflineBookData(status) {
        return isMaster === 1 ? blockCall.getOfflineBookData(status) : isMaster === 0 ? createRTCPromise('getOfflineBookData', status) : defaultHandle();
    }

    blockSeatOnline(modfiedObj) {
        return isMaster === 1 ? blockCall.blockSeatOnline(modfiedObj) : isMaster === 0 ? createRTCPromise('blockSeatOnline', { modfiedObj }) : defaultHandle();
    }

    unblockSeat(objForBlock, navOnlineStatus) {
        return isMaster === 1 ? blockCall.unblockSeat(objForBlock, navOnlineStatus) : isMaster === 0 ? createRTCPromise('unblockSeat', { objForBlock, navOnlineStatus }) : defaultHandle();
    }

    printTicket(obj, isOnline) {
        return isMaster === 1 ? blockCall.printTicket(obj, isOnline) : isMaster === 0 ? createRTCPromise('printTicket', { obj, isOnline }) : defaultHandle();
    }

    updateOfflineBookingsAfterSync(bookingResp) {
        return isMaster === 1 ? blockCall.updateOfflineBookingsAfterSync(bookingResp) : isMaster === 0 ? createRTCPromise('updateOfflineBookingsAfterSync', { bookingResp }) : defaultHandle();
    }

    updateOfflineSessionsAfterSync(bookingResp) {
        return isMaster === 1 ? blockCall.updateOfflineSessionsAfterSync(bookingResp) : isMaster === 0 ? createRTCPromise('updateOfflineSessionsAfterSync', { bookingResp }) : defaultHandle();
    }

    bookSeat(reaqData, navOnlineStatus) {
        return isMaster === 1 ? blockCall.bookSeat(reaqData, navOnlineStatus) : isMaster === 0 ? createRTCPromise('bookSeat', { reaqData, navOnlineStatus }) : defaultHandle();
    }

    updateAvailableCountInSession(bookingData, isOnline) {
        return isMaster === 1 ? updateAvailableCountInSession(bookingData, isOnline) : isMaster === 0 ? createRTCPromise('updateAvailableCountInSession', { bookingData, isOnline }) : defaultHandle();
    }

    updateSeatStatusAfterRefund(bookingData) {
        return isMaster === 1 ? updateSeatStatusAfterRefund(bookingData) : isMaster === 0 ? createRTCPromise('updateSeatStatusAfterRefund', { bookingData }) : defaultHandle();
    }

    findSessionDetails(id) {
        return isMaster === 1 ? webApis.findSessionDetails(id) : isMaster === 0 ? createRTCPromise('findSessionDetails', { id }) : defaultHandle();
    }

    findMovieDetails(id) {
        return isMaster === 1 ? webApis.findMovieDetails(id) : isMaster === 0 ? createRTCPromise('findMovieDetails', { id }) : defaultHandle();
    }

    addUpdateBooking(bookObj, isOnline) {
        return isMaster === 1 ? webApis.addUpdateBooking(bookObj, isOnline) : isMaster === 0 ? createRTCPromise('addUpdateBooking', { bookObj, isOnline }) : defaultHandle();
    }

    findCinemaDetails() {
        return isMaster === 1 ? webApis.findCinemaDetails() : isMaster === 0 ? createRTCPromise('findCinemaDetails', {}) : defaultHandle();
    }

    addDataToDb(data) {
        return isMaster === 1 ? base.add(data) : isMaster === 0 ? createRTCPromise('addData', { data }) : defaultHandle();
    }

    removeFromDb(data) {
        return isMaster === 1 ? base.remove(data) : isMaster === 0 ? createRTCPromise('removeData', { data }) : defaultHandle();
    }

    selectFromDb(data) {
        return isMaster === 1 ? base.select(data) : isMaster === 0 ? createRTCPromise('selectData', { data }) : defaultHandle();
    }

    findAudiDetails(id) {
        return isMaster === 1 ? webApis.findAudiDetails(id) : isMaster === 0 ? createRTCPromise('findAudiDetails', { id }) : defaultHandle();
    }

    //Telebook routes
    addtelebookSeat(data) {
        return isMaster === 1 ? teleBlock.addtelebookSeat(data) : isMaster === 0 ? createRTCPromise('addtelebookSeat', { data }) : defaultHandle();
    }

    getBookingsviaPhoneNumber(data) {
        return isMaster === 1 ? teleBlock.getBookingsviaPhoneNumber(data) : isMaster === 0 ? createRTCPromise('getBookingsviaPhoneNumber', { data }) : defaultHandle();
    }

    modifyTelebooking(data) {
        return isMaster === 1 ? teleBlock.modifyTelebooking(data) : isMaster === 0 ? createRTCPromise('modifyTelebooking', { data }) : defaultHandle();
    }

    fetchAllTelebookingBySSNId(data) {
        return isMaster === 1 ? teleBlock.fetchAllTelebookingBySSNId(data) : isMaster === 0 ? createRTCPromise('fetchAllTelebookingBySSNId', { data }) : defaultHandle();
    }

    getSessionById(sessionId) {
        return isMaster === 1 ? getSessionById(sessionId) : isMaster === 0 ? createRTCPromise('getSessionById', { sessionId }) : defaultHandle();
    }

    getMoviesById(movieId) {
        return isMaster === 1 ? getMoviesById(movieId) : isMaster === 0 ? createRTCPromise('getMoviesById', { movieId }) : defaultHandle();
    }

}

export default new IdbRTC();