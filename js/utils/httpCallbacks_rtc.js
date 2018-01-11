import { sendMessage } from './sockets';
import postman from './postman';
import { blockSeats } from '../actions/layoutAction';
import { cancelBooking, updatePrintStatusBO, onlineBooking, updateBO, updateBoUnblock, syncUpOnlineSend, refundBooking } from '../actions/confirmBookingActions';
import { teleBlockOnlineEndPoint, modifyTeleBlockOnlineEndPoint } from '../actions/layoutAction';

function httpcallBack(data) {
    let parsedData = JSON.parse(data);
    let msg = parsedData.msg;
    let id = parsedData.id;
    let getData = parsedData.data;
    let returnID = parsedData.returnID;
    let fn = '';
    if (msg && msg.substring(msg.length - 7) === '.answer') {
        postman.publish(msg, parsedData.data);
    } else {
        switch (msg) {
            case 'rtcHttp.blockSeats':
                fn = blockSeats.bind(null, getData.seatInfo);
                break;
            case 'rtcHttp.cancelBooking':
                fn = cancelBooking.bind(null, getData.bookingObj);
                break;
            case 'rtcHttp.updatePrintStatusBO':
                fn = updatePrintStatusBO.bind(null, getData.printStatusObj);
                break;
            case 'rtcHttp.onlineBooking':
                fn = onlineBooking.bind(null, getData.bookingObj);
                break;
            case 'rtcHttp.updateBO':
                fn = updateBO.bind(null, getData.obj);
                break;
            case 'rtcHttp.updateBoUnblock':
                fn = updateBO.bind(null, getData.obj);
                break;
            case 'rtcHttp.syncUpOnlineSend':
                fn = syncUpOnlineSend.bind(null, getData.bookingObj);
                break;
            case 'rtcHttp.refundBooking':
                fn = refundBooking.bind(null, getData.bookingObj);
                break;
            case 'rtcHttp.teleBlockOnlineEndPoint':
                fn = teleBlockOnlineEndPoint.bind(null, getData.data);
                break;
            case 'rtcHttp.modifyTeleBlockOnlineEndPoint':
                fn = modifyTeleBlockOnlineEndPoint.bind(null, getData.data);
                break;
            default:
        }
        handleData(fn, msg, returnID);
    }
}

function handleData(fn, msg, returnID) {
    return new Promise((resolve) => {
        fn().then((data) => {
            if (data.json) {
                data.json().then((respData) => {
                    sendMessage({ msg: msg + '.answer', data: JSON.stringify(respData) }, returnID);
                });
            } else {
                sendMessage({ msg: msg + '.answer', data: JSON.stringify(data) }, returnID);
            }

        });
    });
}

export default httpcallBack;