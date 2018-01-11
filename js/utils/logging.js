import 'whatwg-fetch';
import moment from 'moment';
import postman from './postman';
import { loggingUrl } from './urls';
import IdbRTC from './idb_rtc';

let lastIndex = 0; /* This will keep track of the index of the last available message in IDB */
let loggingReady = false; /* flag to keep track, if we are logging Ready */
let initialDelay = 10000; /* This is the initial delay that we need before sending the logs to server for the first time */
let mockMessageStore = []; /* This will hold all the messages sent by the application till we are not logging ready */
let messagesPerPostCall = 50; /* This will decide how many logs we will send per POST call to server */
let durationDifference = 120000; /* This is the interval difference we need to maintain before sending logs to server*/
/* Here we need to add module names and the boolean value against these names represents if logging should be enabled for that module or not */
let modules = {
    socket: true,
    block: true,
    BOOKMASTER: true,
    module3: true,
    session: true,
    idb: true,
    webrtcutils: true
};


/*  We need to pull out all the messages from the IDb and then emit 'loggingReady' */
IdbRTC.getLog().then((data) => {
    lastIndex = (data && data.length > 0 && data[data.length - 1] && data[data.length - 1].id) || 0;
    loggingReady = true;
    postman.publish('loggingReady');
});

/* As soon as logging is ready, all the messages pushed to mock store will be stored in DB */
postman.subscribe('loggingReady', () => {
    mockMessageStore.map((val) => {
        serverLogging(val.message, val.obj, val.time);
    });
    mockMessageStore = [];
});

/* This function will be called from entire application to log on server, it just needs the message */
export function serverLogging(message, obj, time) {
    obj = obj || {};
    if (loggingReady) {
        let log = {
            table: 'logs',
            data: [{
                ...obj,
                'time': time || moment().format(),
                'id': lastIndex,
                'message': message,
                'user_id': localStorage && localStorage.getItem('userId') || null
            }]
        };
        lastIndex++;
        IdbRTC.addLog(log);
    } else {
        mockMessageStore.push({ time: moment().format(), message: message, obj: obj });
    }
}

/* This function will be called from entire application to log locally on console, it just needs the message */
export function clientLogging(module, message, level) {
    if (modules[module]) {
        switch (level) {
            case 'info':
                console.info(new Date(), module ? module : '', message); // eslint-disable-line no-console
                break;
            case 'debug':
                console.debug(new Date(), module ? module : '', message); // eslint-disable-line no-console
                break;
            case 'warn':
                console.warn(new Date(), module ? module : '', message); // eslint-disable-line no-console
                break;
            case 'error':
                console.error(new Date(), module ? module : '', message); // eslint-disable-line no-console
                break;
            default:
                console.log(new Date(), module ? module : '', message); // eslint-disable-line no-console
                break;
        }
    }
}

/* We just need to invoke this function in order to send logs to server */
function sendLogsToServer() {
    IdbRTC.getLog().then((data) => {
        if (data && data.length > 0) {
            let counter = 0, tempArray = [], dynamicLength = data.length;
            while (dynamicLength > 0) {
                /* Length of array which will be added to 'tempArray' */
                let len = dynamicLength >= messagesPerPostCall ? messagesPerPostCall : data.length;
                /* From index for slicing the 'data' */
                let from = counter * messagesPerPostCall;
                /* To index for slicing the 'data' */
                let to = from + len;
                tempArray.push(data.slice(from, to));
                dynamicLength = dynamicLength - len;
                counter++;
            }
            tempArray.map((arr) => {
                /* Double check so as we do not increase 4xx error counts on ES servers. */
                arr.length > 0 && postCall(arr);
            });
        }
    });
}

/* This will make a POST call to server and then delete the messages from IDB in case of success */
function postCall(dataToBeSent) {
    let from = 0, to = 0;
    if (dataToBeSent && dataToBeSent.length > 0) {
        from = Number(dataToBeSent[0].id);
        to = Number(dataToBeSent[dataToBeSent.length - 1].id);
    }
    IdbRTC.findMasterInfo().then((IDBresp) => {
        IDBresp = IDBresp.result;
        if (IDBresp.length > 0) {
            fetch(loggingUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ transactionId: IDBresp[0].transaction_id, browserId: IDBresp[0].machine_id, data: dataToBeSent })
            }).then(() => {
                IdbRTC.deleteLog(Array.apply(null, { length: to - from + 1 }).map((val, key) => { return key + from; }));
            }, () => {
                postman.publish('showToast', {
                    message: 'Unable to POST logs to server: ',
                    type: 'error'
                });
            });
        }
    });
}

/*First time logs will be sent to server after a delay of 'initialDelay' seconds */
window.setTimeout(sendLogsToServer, initialDelay);

/*Logs will be sent to server every 'durationDifference' minutes */
setInterval(function () { sendLogsToServer(); }, durationDifference);