import { getMovieDetails, getMoviesById } from '../../idb/apis/movies';
import { sendMessage } from './sockets';
import webApis from '../../idb/apis/webApis';
import { getCinemas } from '../../idb/apis/cinemas';
import postman from './postman';
import base from '../../idb/apis/base';
import { cancelBooking } from '../../idb/apis/bookings';
import { updateAvailableCountInSession, getSessionById } from '../../idb/apis/sessions';
import seat_layout from '../../idb/apis/seatLayout';
import blockCall from '../../idb/apis/blockSeat';
import { updateSeatStatusAfterRefund } from '../../idb/apis/sessionSeatingInfo';
import {addtelebookSeat,getBookingsviaPhoneNumber,modifyTelebooking,fetchAllTelebookingBySSNId} from '../../idb/apis/telebooking';

function webRTCCallbacks(data) {
    let parsedData = JSON.parse(data);
    let msg = parsedData.msg;
    let getData = parsedData.data;
    let returnID = parsedData.returnID;
    let fn = '';
    if (msg && msg.substring(msg.length - 7) === '.answer') {
        postman.publish(msg, parsedData.data);
    }
    else if (msg && msg.substring(msg.length - 6) === '.error') {
        postman.publish(msg, parsedData.data);
    }
    else {
        switch (msg) {
            case 'rtc.getMovieDetails':
                fn = getMovieDetails.bind(this);
                break;
            case 'rtc.getUsers':
                fn = webApis.getUsers.bind(webApis);
                break;
            case 'rtc.findAllAudi':
                fn = webApis.findAllAudi.bind(webApis);
                break;
            case 'rtc.findAllMovies':
                fn = webApis.findAllMovies.bind(webApis);
                break;
            case 'rtc.findAllSessions':
                fn = webApis.findAllSessions.bind(webApis);
                break;
            case 'rtc.getCinemas':
                fn = getCinemas.bind(this);
                break;
            case 'rtc.findMovieDetails':
                fn = webApis.findMovieDetails.bind(webApis, getData.id);
                break;
            case 'rtc.getBookingsBySessions':
                fn = webApis.getBookingsBySessions.bind(webApis, getData.id);
                break;
            case 'rtc.getAllNeededSessionsBooking':
                fn = webApis.getAllNeededSessionsBooking.bind(webApis, getData.neededSessions);
                break;
            case 'rtc.getAllNeededMovies':
                fn = webApis.getAllNeededMovies.bind(webApis, getData.neededMovies);
                break;
            case 'rtc.updateAvailableCountInSession':
                fn = updateAvailableCountInSession.bind(this, getData.bookingData, getData.isOnline);
                break;
            case 'rtc.updateSeatStatusAfterRefund':
                fn = updateSeatStatusAfterRefund.bind(this, getData.bookingData);
                break;
            case 'rtc.cancelBooking':
                fn = cancelBooking.bind(this, getData.booking, getData.isOnline);
                break;
            case 'rtc.findCinemaDetails':
                fn = webApis.findCinemaDetails.bind(webApis);
                break;
            case 'rtc.findBooking':
                fn = webApis.findBooking.bind(webApis, getData.bkingId);
                break;
            /**
             * End points ravi
             * */
            case 'rtc.getAudiData':
                fn = seat_layout.getAudiData.bind(seat_layout, getData.layoutReq, getData.bookingReq);
                break;
            case 'rtc.blockSeatOffline':
                fn = blockCall.blockSeatOffline.bind(this, getData.objForBlock);
                break;
            case 'rtc.getOfflineBookData':
                fn = blockCall.getOfflineBookData.bind(this, getData.status);
                break;
            case 'rtc.blockSeatOnline':
                fn = blockCall.blockSeatOnline.bind(this, getData.modfiedObj);
                break;
            case 'rtc.updateOfflineBookingsAfterSync':
                fn = blockCall.updateOfflineBookingsAfterSync.bind(this, getData.bookingResp);
                break;
            case 'rtc.updateOfflineSessionsAfterSync':
                fn = blockCall.updateOfflineSessionsAfterSync.bind(this, getData.bookingResp);
                break;
            case 'rtc.addData':
                fn = base.add.bind(this, getData.data);
                break;
            case 'rtc.removeData':
                fn = base.remove.bind(this, getData.data);
                break;
            case 'rtc.selectData':
                fn = base.select.bind(this, getData.data);
                break;
            /**
             * Confirm bookking routes
             * */
            case 'rtc.printTicket':
                fn = blockCall.printTicket.bind(this, getData.obj, getData.isOnline);
                break;
            case 'rtc.unblockSeat':
                fn = blockCall.unblockSeat.bind(this, getData.objForBlock, getData.navOnlineStatus);
                break;
            case 'rtc.bookSeat':
                fn = blockCall.bookSeat.bind(this, getData.reaqData, getData.navOnlineStatus);
                break;
            case 'rtc.findSessionDetails':
                fn = webApis.findSessionDetails.bind(this, getData.id);
                break;
            case 'rtc.addUpdateBooking':
                fn = webApis.addUpdateBooking.bind(this, getData.bookObj, getData.isOnline);
                break;
            case 'rtc.findAudiDetails':
                fn = webApis.findAudiDetails.bind(this, getData.id);
                break;
            //Telebooking

            case 'rtc.addtelebookSeat':
                fn = addtelebookSeat.bind(this, getData.data);
                break;
            case 'rtc.getBookingsviaPhoneNumber':
                fn = getBookingsviaPhoneNumber.bind(this, getData.data);
                break;
            case 'rtc.modifyTelebooking':
                fn = modifyTelebooking.bind(this, getData.data);
                break;
            case 'rtc.fetchAllTelebookingBySSNId':
                fn = fetchAllTelebookingBySSNId.bind(this, getData.data);
                break;
            case 'rtc.getSessionById':
                fn = getSessionById.bind(this, getData.sessionId);
                break;
            case 'rtc.getMoviesById':
                fn = getMoviesById.bind(this, getData.movieId);
                break;

            default:
        }
        handleData(fn, msg, returnID);
    }
}

function handleData(fn, msg, returnID) {
    return new Promise(() => {
        fn && fn().then((data) => {
            sendMessage({ msg: msg + '.answer', data: data }, returnID);
        }).catch((error) => {
            sendMessage({ msg: msg + '.error', data: error }, returnID);
        });
    });
}

export default webRTCCallbacks;