import _ from 'lodash';
import async from 'async';
import base from './base';
const blockSeat = require('./blockSeat');
import { isValidMobileNum } from '../../js/utils/utils';

export function getBookingsviaPhoneNumber(data) {
	return new Promise((resolve, reject) => {
		data.tele_book_no = data.tele_book_no.toString();
		if (!data.tele_book_no || !isValidMobileNum(data.tele_book_no)) {
			return reject({ error: 'Invalid Phone Number' });
		}
		return base.select({ table: 'bookings', data: { tele_book_no: data.tele_book_no } }).then((selres) => {
			let x = _.groupBy(selres.result, 'status');
			return resolve({ result: x })
		}).catch((error) => { reject(error) });
	});
}

export function addtelebookSeat(data) {
	return new Promise((resolve, reject) => {
		data.tele_book_no = data.tele_book_no.toString();
		if (!data.tele_book_no || !isValidMobileNum(data.tele_book_no)) {
			return reject({ error: 'Invalid Phone Number' });
		}

		if ((typeof (data.pax_info.name) != 'string') || data.pax_info.name.trim() == '') {
			return reject({ error: 'Invalid Name for Telebooking' });
		}

		// data.status = 9
		data.updated_at = new Date().toISOString();
		let keys = blockSeat.dataforSeatingStore(data);

		return async.series([
			async.apply(blockSeat.updateSessionSeatingInfo, { add: keys }, 'TELEBOOK'),  // add to sessionSeatingInfo store
			async.apply(addtoBooking, data),                                          // add to bookings store
			async.apply(updateSessionStoreforTelebook, data)                          // add to sessions store,  update seat_availablity data
		],
			(err, res) => {
				if (err) {
					base.remove({ table: 'sessionSeatingInfo', data: { id: keys } }).then((res) => {
						//TODO : add logging for unsuccessful removal.
					}).catch((error) => { reject(error) });
					return reject(err);
				}
				// result of booking store
				return resolve(res[1]);
			});
	});
}

export function modifyTelebooking(data) {
	return new Promise((resolve, reject) => {
		/*data = {
				seat_details:".........";
				old_seat_details: "...........";
				+
				as in booking data
			}
	*/

		let seat = data.seat_details.split('|')[0].split(';');
		let oldSeat = data.old_seat_details.split('|')[0].split(';');

		let rem = _.reject(oldSeat, function (o) { return seat.indexOf(o) > -1; });
		let add = _.reject(seat, function (o) { return oldSeat.indexOf(o) > -1; });

		for (let i in rem) {
			rem[i] = data.ssn_instance_id.toString() + '_' + rem[i];
		}

		for (let i in add) {
			add[i] = data.ssn_instance_id.toString() + '_' + add[i];
		}

		return async.series([
			async.apply(blockSeat.updateSessionSeatingInfo, { add, rem }, 'TELEBOOK'),  // add to sessionSeatingInfo store
			async.apply(addtoBooking, data),                                          // add to bookings store
			async.apply(updateSessionStoreforTelebook, data)                          // add to sessions store, edit seat_availablity data
		], (err, res) => {
			if (err) {
				base.remove({ table: 'sessionSeatingInfo', data: { id: add } }).then((res) => {
					//TODO : add logging for unsuccessful removal.
				}).catch((error) => { reject(error) });
				return reject(err);
			}
			// result of booking store
			return resolve(res[1]);
		});
	});
}

function addtoBooking(data, cb) {
	return base.add({ table: 'bookings', data: [data] }).then((res) => {
		cb(null, res);
	}).catch((error) => { cb(error) });
}

function updateSessionStoreforTelebook(data, cb) {
	const sessData = { table: 'sessions', data: { id: data.ssn_instance_id } };
	let oldCount = 0, newCount = 0;
	let oldCategory = '', newCategory = '';
	if (data.old_seat_details) {
		oldCount = data.old_seat_details.split('|')[0].split(';').length;
		oldCategory = data.old_seat_details.split('|')[0].split(';')[0].split('-')[0];
	}
	newCount = data.seat_details.split('|')[0].split(';').length;
	newCategory = data.seat_details.split('|')[0].split(';')[0].split('-')[0];
	// when no change in category and number of seats. NO update needed.
	if (oldCategory == newCategory && !(newCount - oldCount)) {
		return cb();
	}
	return base.select(sessData).then((res) => {
		let sessRes = res.result;
		sessRes.categories = _.keyBy(sessRes.categories, function (o) { return o.seat_category });
		if (oldCategory == newCategory && (newCount - oldCount)) {  // when no change in category but number of seats.
			sessRes.categories[newCategory].available_count = sessRes.categories[newCategory].available_count - (newCount - oldCount);
		} else if (oldCategory != newCategory) {                   // when category changes
			sessRes.categories[newCategory].available_count = sessRes.categories[newCategory].available_count - newCount;
			if (oldCategory != '') {                              // while adding for first time.
				sessRes.categories[oldCategory].available_count = sessRes.categories[oldCategory].available_count + oldCount;
			}
		}
		sessRes.updated_at = new Date().toISOString();
		sessRes.categories = _.map(sessRes.categories);
		return base.add({ table: 'sessions', data: [sessRes] }).then((res) => {
			if (res.error) { return cb(res); }
			return cb(null, res);
		}).catch((error) => { cb(error) });
	}).catch((error) => { cb(error) });
}

export function fetchAllTelebookingBySSNId(data) {
	return new Promise((resolve, reject) => {
		base.select({ table: 'bookings', data: { ssn_instance_id: data.ssn_instance_id } }).then((res) => {
			res = res.result;
			res = _.groupBy(res, 'status');
			// return only telebooking data.
			return resolve({ result: res['9'] || [] });
		}).catch((error) => { reject(error) });
	});
}
