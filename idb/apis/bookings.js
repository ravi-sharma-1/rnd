import base from './base';

export async function cancelBooking(bookingObj, isOnline) {
    bookingObj.status = 64;
    bookingObj.isOnline = isOnline ? 1 : 0;
    bookingObj['rpos_user_id'] = parseInt(localStorage.getItem('userId'));
    let reqData = { table: 'bookings', data: [bookingObj] };
    return await new Promise((resolve, reject) => {
        base.add(reqData).then((data) => {
            return resolve(data);
        }).catch((errror) => { reject(error) });
    })
}
