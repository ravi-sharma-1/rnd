import io from 'socket.io-client';
import _ from 'lodash';
import postman from './postman';
import { socketConnectionURL } from '../utils/urls.js';
import webApis from '../../idb/apis/webApis';
import { clientLogging, serverLogging } from './logging';
import webRTCCallbacks from './webRTCCallbacks';
import httpcallbacks from './httpCallbacks_rtc';
import realTimeEvents from './realTimeEvents';

let socket;
/* Variable to point to the socket connection */
let userDetailsSaved = {};
/* This will store the details of the user logged in */
let disconnectTime = new Date();
/* This will maintain the time stamp when socket client disconnected from server */
let socketConnected = false;
/* Initially marking the socket connection flag as false */
let socketRegistered = false;
/* Initially marking the socket registration flag as false */
let webRTCWaitingQueue = [];
let pendingRTCRequests = [];

/* This is just to make programming functional */
function socketLogging(message, level) {
    clientLogging('socket', message, 'info');
    serverLogging(message);
}

function resetRTC() {
    myConnectionDict = {};
    dataChannelDict = {};
    connectedUserId = '';
    myId = '';
    localStorage.webrtcCon = '';
    localStorage.webrtcDC = '';
    loadAndLogingOnWebRTC();
}

/* This function registers all the listeners to socket events from BO server */
function registerListeners(userDetails) {
    /* We only get user details during registration and not during reregistration, and hence storing the user details below */
    userDetailsSaved = userDetails;
    socketLogging(`saving userDetails as ${JSON.stringify(userDetailsSaved)}`);
    /* Listener to receive any message from BO server to client */
    socket.on('msgtcln', function (obj, callbackFn) {
        socketLogging(`received message from server ${callbackFn ? 'with' : 'without'} callback function : ${JSON.stringify(obj)}`);
        if (obj.data.message === 'MASTER_CONNECT') {
            webApis.findMasterInfo().then(function (data) {
                data = data.result;
                if (data[0].is_master === 0) {
                    resetRTC();
                }
            });
        }
        postman.publish('msgtcln', { obj, callbackFn });
    });

    socket.on('fdisconnect', function (obj, callbackFn) {
        socket.disconnect();
        connectSocket(userDetailsSaved);
    });

    /* Listener to receive connection event from BO server to client */
    socket.on('connect', function () {
        socketLogging('Socket Connected successfully, marking socketConnected as true');
        socketConnected = true;
        postman.publish('socketConnected');
        registerSocket(userDetails, true);
    });

    socket.on('disconnect', function (reason) {
        postman.publish('socketDisconnected');
        socketConnected = false;
        socketRegistered = false;
        socketLogging(`Socket Connection Disconnected due to ${reason}`);
        if (reason !== 'ping timeout') {
            disconnectTime = new Date();
            socketLogging(`setting disconnectTime as  ${disconnectTime}`);
        }
    });

    socket.on('error', function (err) {
        // Handle error here
    });

    //This is a webRTC event.
    socket.on('webRtcMessage', (message) => {
        webRTCLogging(`Received Message from server: ${JSON.stringify(message)}`);
        let data = message.data;


        switch (data.type) {
            case 'login':
                //onLogin(data.success, data.id);
                break;
            case 'offer':
                onOffer(data.offer, data.id);
                break;
            case 'answer':
                onAnswer(data.answer, data.id);
                break;
            case 'candidate':
                onCandidate(data.candidate, data.id);
                break;
            case 'masterDetected':
                sendRequestForConnection(data.id, data.myId);
                break;
            default:
                break;
        }
    });

}

/* This function will be called for reregistration, whenever the socket disconnects */
function reRegisterWithServer() {
    socketConnected = true;
    socketLogging(`marked socketConnected as ${socketConnected}`);
    postman.publish('socketConnected');
    socketLogging(`reconnecting with userdetails as: ${JSON.stringify(userDetailsSaved)}`);
    registerSocket(userDetailsSaved, false);
}

/* This function whwnever called returns the current status of socket connection */
export function isSocketConnected() {
    socketLogging(`Returned socket connection status as: ${socketConnected}`);
    return socketConnected;
}

/* This function whenever called returns the currnt status of socket registration */
export function isSocketRegistered() {
    socketLogging(`Returned socket registration status as: ${socketRegistered}`);
    return socketRegistered;
}

/* This function connects the socket client to BO server at the provided socketConnectionURL */
export function connectSocket(userDetails) {
    if (!socketConnected) {
        socket = io.connect(socketConnectionURL, { path: '/v1/seats/socket.io', transports: ['websocket'] });
        socketLogging(`Connectection request sent to server @ ${socketConnectionURL} with user details as: ${JSON.stringify(userDetails)}`);
        registerListeners(userDetails);
    }
}

export function registerSocket(userDetails, firstTime) {
    socketLogging(`${firstTime ? 'registering' : 're-registering'} socket connection`);
    webApis.findMasterInfo().then(function (existingData) {
        existingData = existingData.result;
        socketLogging(`got existing master info as: ${JSON.stringify(existingData)}`);
        let obj = {
            cinemaId: userDetails.cinema_id,
            username: userDetails.username,
            userId: userDetails.id,
            browserId: (existingData && existingData[0] && existingData[0].machine_id) || null
        };
        socketLogging(`Registering with info : ${JSON.stringify(obj)}`);
        socket.emit('register', obj, function (err, res) {
            if (!err) {
                socketLogging(`Got successful response for ${firstTime ? 'registration' : 're-registration'} from server. response : ${JSON.stringify(res)} `);
                socketRegistered = true;
                /* Below variables is to store the value that will be set in IDB */
                let is_master = _.get(existingData, '[0].is_master', 0);
                let machine_id = _.get(existingData, '[0].machine_id', null);
                if ((_.get(res, 'data.mentos', 0)) || machine_id === null) {
                    socketLogging(`Got mentos value as ${res.data.mentos}, hence changing browserID from ${_.get(existingData, '[0].machine_id', null)} to ${res.data.browserId} and changing master  status from ${_.get(existingData, '[0].is_master', null)} to ${res.data.master}`);
                    is_master = res.data.master;
                    machine_id = res.data.browserId;
                }
                webApis.updateMasterInfo({
                    table: 'masterInfo',
                    data: [{
                        'is_master': is_master,
                        'id': 1,
                        'machine_id': machine_id,
                        'transaction_id': res.data.transactionId
                    }]
                }).then(() => {
                    if (
                        (_.get(existingData, '[0].machine_id', null) === null && is_master) || // This condition means that it is first time registration and machine is becoming master
                        ((_.get(res, 'data.mentos', 0)) === 1 && _.get(existingData, '[0].is_master', 0) === 0 && is_master === 1) // This condition is that a slave is going to become master and mentos value should be 1 at that time
                    ) {
                        webApis.findMasterInfo().then((masterInfo) => {
                            masterInfo = masterInfo.result;
                            socketLogging('Acknowledged for master info');
                            socket.emit('ackMaster', {
                                browserId: masterInfo[0].machine_id,
                                transactionId: masterInfo[0].transaction_id,
                                cinemaId: userDetails.cinema_id
                            }, function (err, res) {
                                if (!err && res.success) {
                                    window.onbeforeunload = function () {
                                        return null;
                                    };
                                    location.reload();
                                    socketLogging('Got positive response for acknowledgement');
                                    postman.publish('updatedmasterInfo');
                                    if (res.status === 0) {
                                        postman.publish('msgtcln', { obj: { data: { message: 'MASTER_DISCONNECT' } } });
                                    } else {
                                        postman.publish('msgtcln', { obj: { data: { message: 'MASTER_CONNECT' } } });
                                    }
                                    postman.publish('registered', firstTime);
                                    firstTime ? loadAndLogingOnWebRTC() : resetRTC();
                                } else {
                                    socketLogging('Got negative response for acknowledgement');
                                }
                            });
                        });
                    } else {
                        postman.publish('updatedmasterInfo');
                        if (res.status === 0) {
                            postman.publish('msgtcln', { obj: { data: { message: 'MASTER_DISCONNECT' } } });
                        } else {
                            postman.publish('msgtcln', { obj: { data: { message: 'MASTER_CONNECT' } } });
                        }
                        postman.publish('registered', firstTime);
                        loadAndLogingOnWebRTC();
                    }
                });
            } else {
                socketLogging(`Got Failure response for ${firstTime ? 'registration' : 're-registration'} from server. error: ${JSON.stringify(err)} `);
                if (err.cause && (err.cause === 'MAX_ACTIVE_CLIENT' || err.cause === 'MAX_REGISTERED_CLIENT')) {
                    postman.publish('showToast', {
                        message: `Maximum number of ${err.cause === 'MAX_ACTIVE_CLIENT' ? 'active' : 'registered'} device limit reached.`,
                        type: 'error'
                    });
                }
                let duration = Number(err.retry);
                if (duration === 0) {
                    socket.disconnect();
                    postman.publish('logoutUser');
                    postman.publish('showToast', {
                        message: err.cause,
                        type: 'error'
                    });
                } else {
                    setTimeout(() => {
                        registerSocket(userDetailsSaved, false);
                    }, duration * 1000);
                }
                socketRegistered = false;
                postman.publish('socketConnectionFail');
            }
        });
    }, function (err) {
        socketLogging(`Could not get Master info from IDB and hence can't register socket connection. err is : ${JSON.stringify(err)}`);
    });
}


/*-------------------------------------WebRTC code starts from here---------------------------------------------------*/

let myConnectionDict = {};
let dataChannelDict = {};
let connectedUserId;
let myId;

function webRTCLogging(message, level) {
    clientLogging('webrtcutils', message, level || 'info');
}

function openDataChannel(id) {
    webRTCLogging(`Opening Data Channel for id:  ${id}. Currently 'myConnectionDict' value is ${JSON.stringify(myConnectionDict)}`);
    /* Need to set reliable:false for UDP */
    let dataChannelOptions = { reliable: true };
    let myConn = myConnectionDict[id];
    let dataChannel = myConn.createDataChannel('myDataChannel', dataChannelOptions);

    webRTCLogging(`DataChannel created with options ${dataChannelOptions} --> ${JSON.stringify(dataChannel)}`);

    dataChannel.onopen = function (event) {
        postman.publish('webRTCConnectionEstablished');
        webRTCLogging('Published webRTCConnectionEstablished event');
    };
    dataChannel.onerror = function (error) {
        webRTCLogging(`Got error on datachannel ${JSON.stringify(dataChannel)} --> ${error}`);
    };

    dataChannel.onmessage = function (event) {
        webRTCLogging(`Got message on datachannel ${JSON.stringify(dataChannel)} --> ${event.data}`);
    };
    dataChannelDict[id] = dataChannel;
    localStorage.setItem('webrtcDC', JSON.stringify(dataChannelDict));
}

function onCandidate(candidate, id) {
    webRTCLogging(`Got ICE candidate with id ${id} --> ${JSON.stringify(candidate)}`);
    myConnectionDict[id] && myConnectionDict[id].addIceCandidate(new RTCIceCandidate(candidate));
    myConnectionDict[id] && localStorage.setItem('webrtcCon', JSON.stringify(myConnectionDict));
}

function onAnswer(answer, id) {
    webRTCLogging(`Got answer with id ${id} --> ${JSON.stringify(answer)}`);
    myConnectionDict[id] && myConnectionDict[id].setRemoteDescription(new RTCSessionDescription(answer));
}

//when somebody wants to call us
function onOffer(offer, id) {
    connectedUserId = id;


    webRTCLogging('Received offer with this id:' + id);
    makeNewConnectionAndOpenDataChannel(id);

    var myConn = myConnectionDict[id];

    webRTCLogging('offer reply');
    webRTCLogging(myConn);
    myConn.setRemoteDescription(new RTCSessionDescription(offer));
    myConn.createAnswer(function (answer) {
        myConn.setLocalDescription(answer);
        sendtoSignallingServer({
            type: 'answer',
            answer: answer
        });
    }, function (error) {
        alert('oops...error');
    });
    myConnectionDict[id] = myConn;
    webRTCLogging(myConnectionDict, dataChannelDict);
}

postman.subscribe('webRTCConnectionEstablished', () => {
    postman.publish('msgtcln', { obj: { data: { message: 'MASTER_CONNECT' } } });
    webRTCLogging('received the fired event webRTCConnectionEstablished');
    webRTCWaitingQueue.map((messages) => {
        let { msgInput, id } = messages;
        sendMessage(msgInput, id);
    });
});

//this is for slave

export function sendRequestForConnection(id, my) {
    connectedUserId = id;
    myId = my;
    webRTCLogging('This is sendRequestForConnection and myId', myId);
    webRTCLogging('Connection creating for this Id' + id);
    if (id.length > 0) {
        var myConn = makeNewConnectionAndOpenDataChannel(id);
        myConn.createOffer(function (offer) {
            webRTCLogging('Creating offer for this id:', id);
            sendtoSignallingServer({
                type: 'offer',
                offer: offer
            });
            myConn.setLocalDescription(offer);
        }, function (error) {
            alert('An error has occurred.');
        });

        myConnectionDict[id] = myConn;
    }
}

function makeNewConnectionAndOpenDataChannel(id) {
    if (true) { // TODO -- Here I have changed the condition
        // var configuration = {
        //     'iceServers': [
        //         {
        //             'url': 'turn:13.126.161.223:3478?transport=tcp',
        //             'credential': 'test',
        //             'username': 'test'
        //         }
        //     ]
        // };
        var configuration = { 'iceServers': [{ 'url': 'stun:stun.services.mozilla.com' }, { 'url': 'stun:stun.l.google.com:19302' }] };

        var myConn = new RTCPeerConnection(configuration, {});
        // myConnection = new RTCPeerConnection(configuration, {});
        webRTCLogging('RTCPeerConnection object was created');
        webRTCLogging(myConn);
        //setup ice handling
        //when the browser finds an ice candidate we send it to another peer
        myConn.onicecandidate = function (event) {
            console.log('*****', event);
            webRTCLogging('Send to other peer');
            if (event.candidate) {
                sendtoSignallingServer({
                    type: 'candidate',
                    candidate: event.candidate
                });
            }
        };
        myConn.ondatachannel = function (event) {
            var receiveChannel = event.channel;
            receiveChannel.onmessage = function (event) {
                webRTCLogging(`Received data on data channel ${event.data}`);
                let msg = JSON.parse(event.data).msg;
                if (msg && msg.substring(msg.length - 7) === '.answer') {
                    pendingRTCRequests.splice(pendingRTCRequests.indexOf(msg.slice(0, -7)), 1);
                }
                let x = JSON.parse(event.data).msg;
                if (x.indexOf('rtcHttp.') !== -1) {
                    httpcallbacks(event.data);
                } else if (x.indexOf('realTimeEvent') !== -1) {
                    realTimeEvents(event.data);
                } else {
                    webRTCCallbacks(event.data);
                }
            };
        };

        myConn.oniceconnectionstatechange = function (event) {
            if (myConn.iceConnectionState === 'failed' || myConn.iceConnectionState === 'disconnected' || myConn.iceConnectionState === 'closed') {
                postman.publish('msgtcln', { obj: { data: { message: 'MASTER_DISCONNECT' } } });
                webRTCLogging(`ICE connection changed. Status - ${myConn.iceConnectionState}`);
                pendingRTCRequests.map((msg) => {
                    postman.publish(msg + '.error', { code: 'MASTER_DISCONNECT', message: 'Failed Connection die to RTC breakage' });
                });
                webApis.findMasterInfo().then((masterInfo) => {
                    masterInfo.result[0].is_master === 0 && resetRTC();
                });
            }
        };

        webRTCLogging('Connection Id====' + id);
        myConnectionDict[id] = myConn;
    }
    openDataChannel(id);
    return myConnectionDict[id];
}

function sendtoSignallingServer(message) {
    message.id = message.id || connectedUserId;
    message.myId = message.myId || myId;
    webRTCLogging(`Sending Message ${JSON.stringify(message)}`);
    // TODO -- Below condition should be removed later
    socket !== null && socket.emit('webRtcSignal', JSON.stringify(message));
}

export function sendMessage(msgInput, id) {
    // 'id' is the machine ID of the machine to whom we need to send the message.
    id = id || Object.keys(dataChannelDict)[0];
    if (id && dataChannelDict[id] && dataChannelDict[id].readyState === 'open') {
        msgInput.id = id;
        msgInput.returnID = myId;
        webRTCLogging(`Sending ${JSON.stringify(msgInput)} to the machine with ID ${id}`);
        let dataChannel = dataChannelDict[id];
        if (msgInput && msgInput.msg && msgInput.msg.substring(0, 4) === 'rtc.') {
            pendingRTCRequests.push(msgInput.msg);
        }
        dataChannel && dataChannel.send(JSON.stringify(msgInput));
    } else {
        webRTCLogging(`Added to webRTCWaitingQueue ${JSON.stringify(msgInput)} to be sent to the machine with ID ${id}`);
        webRTCWaitingQueue.push({ msgInput, id });
    }
}

export function sendMessageToAll(msgInput) {
    // 'id' is the machine ID of the machine to whom we need to send the message.
    for (let id in dataChannelDict) {
        msgInput.id = id;
        msgInput.returnID = myId;
        webRTCLogging(`Sending ${JSON.stringify(msgInput)} to the machine with ID ${id}`);
        let dataChannel = dataChannelDict[id];
        try {
            dataChannel && dataChannel.send(JSON.stringify(msgInput));
        } catch (e) {
            msgInput = {
                resp: 0,
                msg: "RTC Error"
            }
        }
    }
}


export function loadAndLogingOnWebRTC() {
    webRTCLogging('Initiating RTC login procedure');
    webApis.findMasterInfo().then((masterInfo) => {
        myId = masterInfo.result[0].machine_id;
        sendtoSignallingServer({
            type: 'login',
            id: masterInfo.result[0].machine_id,
            cinemaId: userDetailsSaved.cinema_id
        });
    });
}

