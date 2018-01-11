import postman from './postman';
import IdbRTC from '../utils/idb_rtc';
import { fetchWithError } from '../utils/fetch';
import { sendDbDumpFromIndexedDb } from './urls';

export function getUpdateEventInfo(type, cb){
	 postman.subscribe(type, function (obj) {
          cb(obj);
     });
}

export function getDumpFromIndexedDB(data, cb){
    if(data.table && data.cinemaId && data.browserId && data.transactionId) {
        let { table, cinemaId, browserId, transactionId } = data;
        IdbRTC.getDumpData(data).then(function(dump) {
            let req = {
                cinemaId,
                table,
                data: dump,
                type: 'posDbDump',
                browserId,
                transactionId
            };
            let resp = sendDBDump(req);
                resp.catch(err => {
                    cb('Pos dump sent request failed');
                });
            });
    }
    cb('Not valid request.');
}

async function sendDBDump(data) {
    return await fetchWithError(sendDbDumpFromIndexedDb, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(data)
    });
}
