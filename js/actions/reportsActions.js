import { reportsUrl } from '../utils/urls';
import postman from '../utils/postman';
import IdbRTC from '../utils/idb_rtc';

var cinema_id = null;
/* This is to store cinema ID throughout this file, so that again and again we need not hit IDB for cinema_id */

/* Get cinema_id from the IDB initially and save it to the variable 'cinema_id' */
IdbRTC.getCinemas().then((cinema) => {
    cinema_id = cinema.length > 0 ? cinema[0].id : null;
}).catch((error) => {
    // Nothing to be done here, this is just kept to make sure we do not see this error on console. 
});

/* This function returns the required url for getting report from BO server while using 'reportsUrl' and report specific arguments */
function getURL(args, type) {
    switch (args[0]) {
        case 'daily':
            return reportsUrl + `/${args[0]}?fromDate=${args[1]}&toDate=${args[2]}&cinema_id=${cinema_id}&format=${type === 'pdf' ? 'pdf' : 'excel'}`;
        case 'distributor':
            let audiIdField = (args[4] == 'all') ? '' : `&audi_id=${args[4]}`;
            return reportsUrl + `/${args[0]}?dName=${args[1]}&fromDate=${args[2]}&toDate=${args[3]}&cinema_id=${cinema_id}${audiIdField}&movie_id=${args[5]}&format=${type === 'pdf' ? 'pdf' : 'excel'}`;
        case 'etax':
            return reportsUrl + `/${args[0]}?fromDate=${args[1]}&cinema_id=${cinema_id}&audi_id=${args[2]}&session_id=${args[3]}`;
    }
}

/* This function initially checks of we have cinema_id and then using that cinema_id and url from 'getURL' function gets the report from BO server */
export function getReport(args, type) {
    if (cinema_id === null) {
        /* If 'cinema_id' is not set, hit IDB and get it, after that re-run this function */
        IdbRTC.getCinemas().then((cinema) => {
            cinema_id = cinema[0].id;
            getReport(args, type);
        });
    } else {
        IdbRTC.findMasterInfo().then((IDBresp) => {
            IDBresp = IDBresp.result;
            fetch(getURL(args, type), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ transactionId: IDBresp[0].transaction_id, browserId: IDBresp[0].machine_id }),
                responseType: 'arraybuffer'
            }).then((response) => {
                /* Here we need status code check, as there are two cases in +ve scenario we will get content type as 'application/pdf' and in -ve scenariop we will get a JSON error response */
                if (response.status === 200) {
                    /* In case we get a PDF from BO server, we display it using 'window.open()' function */
                    response.blob().then((res) => {
                        window.open(URL.createObjectURL(res));
                    });
                } else {
                    /* In case of JSON error response, we need to show the  message to user using toast. */
                    response.json().then((res) => {
                        if (res.error) {
                            postman.publish('showToast', {
                                message: res.error.message || 'Failed to get report for selected date',
                                type: 'error'
                            });
                        }
                    });
                }
            });
        });
    }
}