// @flow
import  { fetch, fetchWithError }  from '../utils/fetch';
import { syncDataUrl, ackSyncDone, syncUrl } from '../utils/urls';
import { extEndPoints } from 'boxoffice-config';

/*
 * This method used to fetch list of sync APIS.
 * @Params: cinemaId, machineId
 * @Returns: Promise response
 */
//Not a valid function anymore. can be removed. We use boxoffice-config to read all tables to be synced
export async function getSyncApis(machineId) {
    let syncUrl = syncDataUrl+'/' +machineId+'/get';
    return await fetchWithError(syncUrl, {
        method: 'GET',
        headers:{
            'Content-Type':'application/json',
            'Accept': 'application/json'
        }
    });
}

/*
 * This method used to sync data from Box office cloud server to local indexedDb.
 * This method will be used when user logs in first time and after logout.
 * @Params: Object received from boxoffice-config module
 * @Returns: Promise response
 */

export async function syncData(table, browserId, transactionId, firstTimeSync) {
    let body = {
        browserId,
        transactionId,
        type: table
    };
    if(table) {
        let syncurl = firstTimeSync ? `${syncUrl}?all=true` : syncUrl;
        return await fetchWithError(syncurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });
    }
}

/*
 * This method used to sync data from Box office cloud server to local indexedDb.
 * This method will be used when user logs in first time and after logout.
 * @Params: Api Object received from getSyncApis call
 * @Returns: Promise response
 */

export async function ackSyncStatusToBO(syncData) {
    let ids = [];
    syncData.data.map((datum) => {
        ids.push(datum.id);
    });
    if(syncData.ack_id) {
        return await fetch(ackSyncDone, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: JSON.stringify({cinema_id: syncData.cinema_id, table: syncData.table, ids, ackId: syncData.ack_id})
        });
    }
}

