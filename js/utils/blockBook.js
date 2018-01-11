import _ from 'lodash';
import postman from './postman';
import { isSocketConnected } from '../utils/sockets';
import {
    updateLocalBooking, bookMasterCallback, updateUnblock, updateBook,
    updateStatus, updateUnblockMaster, handleSyncUpDataAtOnline,
    handleDownSyncForSlave, updatePrintStatusOnPrintEvent, refundChangesUpdatedInDB
} from '../actions/confirmBookingActions';
import { handleBlockUpdate } from '../actions/layoutAction';


postman.subscribe('msgtcln', (objData) => {
    let message = _.get(objData, 'obj.data.message', '');
    switch (message) {
        case 'BOOKDONE':
            //it gets triggered when slave hits booking call and got confirmation from master and BO
            updateLocalBooking(objData.obj, isSocketConnected());
            break;
        case 'BOOKMASTER':
            //book at master and send acknowledgement to BO(in case there is any booking from slave or app)
            // this event occurs when there is new booking call from slave or app and master need to book locally and inform BO
            bookMasterCallback(objData.obj, isSocketConnected(), 'bm');
            break;
        case 'UNBLOCK':
            //Unblock from IDB using booking_id(for both master & slave)
            updateUnblock(objData.obj, isSocketConnected());
            break;
        case 'BOOK':
            //insert new booking(this event occurs when slave has missed any blocking call)
            updateBook(objData.obj);
            break;
        case 'UNBLOCKMASTER':
            //Unblock master blocking(this even occurs when script runs to delete bookings)
            updateUnblockMaster(objData.obj);
            break;
        case 'BLOCK':
            //Block local seats(this event occurs when there is a block call at BO and broadcasted to all POSs irrespective of master or slave)
            handleBlockUpdate(objData.obj);
            break;
        case 'REFUND':
            //When master sends refund call to BO, then BO send us this event
            refundChangesUpdatedInDB(objData.obj.data.result);
            break;
        case 'PRINT':
            //update print_status in bookings after any ticket printed
            updatePrintStatusOnPrintEvent(objData.obj);
            break;
    }
});