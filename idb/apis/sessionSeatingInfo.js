import async from 'async';
import base from './base';

export async function updateSeatStatusAfterRefund(bookingObj) {
    let ssnId = bookingObj['ssn_instance_id'];
    let seatStatus = bookingObj['seat_details'].split('|'), seatCat = {};
    if (seatStatus && seatStatus.length) {
        let seatStatusId = bookingObj['seat_details'].split('|')[0].split(';');
        return await new Promise((resolve, reject) => {
            async.each(seatStatusId, (seatId, cb) => {
                let data = { table: 'sessionSeatingInfo', data: { id: ssnId + '_' + seatId } };
                base.remove(data).then((res) => {
                    cb(null);
                }).catch((error) => { cb(res.error) });
            }, (err, res) => {
                if (err) {
                    return reject(err);
                } else {
                    return resolve(res);
                }
            });
        });
    }

}