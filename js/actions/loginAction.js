// @flow
import { fetch, fetchWithError } from '../utils/fetch';
import { UPDATELOGININFO, LOGOUT } from '../constants/AppConstants';
import { loginToLocalDb, checkSytemTimeInSyncWithServer } from '../utils/urls';
import { localDbLogin } from '../../idb/apis/users';
import { getCinemas } from '../../idb/apis/cinemas';
import postman from '../utils/postman';
import { isSocketRegistered, isSocketConnected } from '../utils/sockets';
import { setItemInLocalStorage, setOnlineStatus } from '../utils/utils';
import async from 'async';
import _ from 'lodash';


/*This method is to make initial online and then offline login calls
    1. Check if there is an entry in Cinema table. If not, then we initiate First time login
    2. In first time login, we make a post call to the BO with phone number, password, and timestamp
    3. Otherwsie, we make a local db call to check if the user details are valid or not
*/
export function login(userData) {


    let response = {};
    return async dispatch => {
        let cinemaInfoString = await getCinemas();

        const firstTime = !(cinemaInfoString[0] && cinemaInfoString[0].id);
        setItemInLocalStorage('firstTimeLogin', true);
        const userPostInfo = {
            'phone_number': userData.user,
            'password': userData.pwd,
            'reqTime': new Date()
        };

        if (firstTime) {

            let header = new Headers({
                'Content-Type': 'application/x-www-form-urlencoded'
            });

            const PostObjData = Object.keys(userPostInfo).map(key => {
                return encodeURIComponent(key) + '=' + encodeURIComponent(userPostInfo[key]);
            }).join('&');

            const resp = await fetch(loginToLocalDb, {
                method: 'POST',
                mode: 'cors',
                headers: header,
                body: PostObjData
            }).catch(err => {
                postman.publish('showToast', {
                    message: err.message,
                    type: 'error'
                });
            });

            let dataPromise;

            try {
                dataPromise = await resp.json();
            }
            catch (e) {
                postman.publish('showToast', {
                    message: e,
                    type: 'error'
                });
            }

            if (dataPromise) {
                response = await dataPromise;

                if (response.error) {
                    postman.publish('showToast', {
                        message: response.error.message,
                        type: 'error'
                    });
                }
                else {
                    const users = _.get(response, 'user', []);
                    setOnlineStatus('firstTimeLoginSet');
                    dispatch({
                        type: UPDATELOGININFO,
                        payload: users
                    });
                    postman.publish('datasyncUp');
                }
            }
        }
        else {
            setItemInLocalStorage('firstTimeLogin', false);
            let cb = (err, res) => {
                if (err) {
                    postman.publish('showToast', {
                        message: err,
                        type: 'error'
                    });
                    dispatch({
                        type: LOGOUT,
                        payload: []
                    });
                }
            };
            let funcList = [];
            if (isSocketConnected()) {
                funcList.push(checkSystemTimeInSyncWithTheServer);
            }
            funcList.push(async.apply(offlineloginToLocalDB, userPostInfo, dispatch));
            async.series(funcList, cb);
            setOnlineStatus('firstTimeLoginSet');
        }
    };
}

// Method used to check if POS machine's time is same as server time with 5 min limit
async function checkSystemTimeInSyncWithTheServer(cb) {
    let postObj = { reqTime: new Date() };
    await fetchWithError(checkSytemTimeInSyncWithServer, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(postObj)
    }).then((resp) => {
        if (resp && _.get(resp, 'result.message', null)) {
            return cb();
        }
    }).catch(err => {
        err.json().then((error) => {
            return cb(error.error.message, null);
        }).catch(() => {
            cb('System time not correct');
        });
    });
}

//Local db call to check valid user details for login
async function offlineloginToLocalDB(userPostInfo, dispatch, cb) {
    const resp = await localDbLogin(userPostInfo).catch(err => {
        return cb(err);
    });
    let dataPromise;

    try {
        dataPromise = await resp;
    }
    catch (e) {
        return cb(e);
    }
    if (dataPromise) {
        const user = {
            'id': dataPromise.id,
            'username': dataPromise.username,
            'cinema_id': dataPromise.cinema_id,
            'role': dataPromise.role_name
        };

        dispatch({
            type: UPDATELOGININFO,
            payload: user
        });
        return cb();
    }
}

export function logout() {
    return (dispatch => {
        dispatch({
            type: LOGOUT,
            payload: []
        });
    });
}

