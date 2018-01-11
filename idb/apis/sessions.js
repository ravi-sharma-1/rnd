import _ from 'lodash';
import base from './base';

/*1.Find the seat category details from booking table using booking id
  2. Find sessions using bookingObj['ssn_instance_id'] and 
  then update available_count and refund_count in sessions table
*/
export async function updateAvailableCountInSession(bookingObj, isOnline) {
    let bookingSeats = bookingObj['seat_details'].split('|')[0], categorySeatCounts = {};
    _.each(bookingSeats.split(';'), function (cat, i) {
        let sign = cat.substr(0, cat.indexOf('-'));
        if (categorySeatCounts[sign]) {
            ++categorySeatCounts[sign];
        } else {
            categorySeatCounts[sign] = 1;
        }
    });
    return await new Promise((resolve, reject) => {
        base.select({ table: 'sessions', data: { id: bookingObj['ssn_instance_id'] } }).then((data) => {
            data.result.isOnline = isOnline ? 1 : 0;
            _.map(data.result.categories, (cat, i) => {
                if (categorySeatCounts[cat.seat_category]) {
                    let seatCount = cat['available_count'];
                    let availCount = seatCount + categorySeatCounts[cat.seat_category];
                    if (availCount > cat['total_count']) {
                        cat['available_count'] = cat['total_count']
                    } else {
                        cat['available_count'] = seatCount + categorySeatCounts[cat.seat_category];
                    }
                    if (cat['refund_count']) {
                        cat['refund_count'] += categorySeatCounts[cat.seat_category];
                    } else {
                        cat['refund_count'] = categorySeatCounts[cat.seat_category];
                    }
                }
            });
            base.add({ table: 'sessions', data: [data.result] }).then((res) => {
                return resolve(res);
            }).catch((error) => {
                reject(error)
            });
        }).catch((error) => { reject(error) });
    });
}


//This function fetches all sessions which have been edited in offline mode
export async function getAllOfflineSessions() {
    return base.select({ table: 'sessions', data: { isOnline: 0 } });
}

export async function getSessionById(_id) {
    return await new Promise((resolve, reject) => {
        base.select({ table: 'sessions', data: { id: _id } }).then((data) => {
            return resolve(data.result);
        }).catch((error) => { reject(error); })
    });
}

export async function getAllSessionsData() {
    return await new Promise((resolve, reject) => {
        base.select({ table: 'sessions', data: {} }).then((data) => {
            return resolve(data.result);
        }).catch((error) => { reject(error); });
    });
}

