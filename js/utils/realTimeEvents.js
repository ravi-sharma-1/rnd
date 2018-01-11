import { sendMessage } from './sockets';
import postman from './postman';

function realTimeEventsCallBack(data) {
    let parsedData = JSON.parse(data);
    let msg = parsedData.msg;
    let id = parsedData.id;
    let getData = parsedData.data;
    let returnID = parsedData.returnID;
    let evtType = '';
    if (msg) {
        postman.publish(msg+'.answer', parsedData.data);
    }
}

export default realTimeEventsCallBack;