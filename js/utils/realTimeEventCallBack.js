import postman from './postman';
import { sendMessageToAll } from './sockets';
import IdbRTC from './idb_rtc';

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

postman.subscribe('realTimeEvent.blockSeats.answer', (data) => {
    postman.publish("update.blockSeats");
    if (isMaster) {
        sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
    }
});

postman.subscribe('realTimeEvent.unblockSeats.answer', (data) => {
    postman.publish("update.unblockSeats");
    if (isMaster) {
        sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
    }
});

postman.subscribe('realTimeEvent.teleBlocked.answer', (data) => {
    postman.publish("update.teleBlocked");
    if (isMaster) {
        sendMessageToAll({msg: 'realTimeEvent.teleBlocked', data: {}});
    }
});
//Error handling for teleblock
postman.subscribe('rtc.addtelebookSeat.error', (data) => {
    postman.publish("update.addtelebookSeat.error");
});

postman.subscribe('rtc.blockSeats.error', (data) => {
    postman.publish("update.blockSeats.error");
});

postman.subscribe('rtc.unblockSeats.error', (data) => {
    postman.publish("update.unblockSeats.error");
});
