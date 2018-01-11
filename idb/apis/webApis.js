import _ from 'lodash';
import base from './base';
import blockSeat from '../../idb/apis/blockSeat';
class webApis {

    /*
    * This function returns the booking details using booking id
    */
    async findBooking(booking_id) {
        return await new Promise((resolve, reject) => {
            base.select({ table: 'bookings', data: { booking_id } }).then((bookingData) => {
                if (!bookingData.error) {
                    let booking = bookingData.result;
                    this.findSessionDetails(booking.ssn_instance_id).then((session) => {
                        Promise.all([this.findAudiDetails(session.audi_id), this.findMovieDetails(session.movie_id)]).then(([audi, movie, ...xyz]) => {
                            return resolve({ booking, session, audi, movie });
                        }, () => {
                            return reject({ error: true, code: 'WEB_APIS_ERR', message: 'No audi/movie details available for the searched booking!' })
                        });
                    }, () => {
                        return reject({ error: true, code: 'WEB_APIS_ERR', message: 'No session details available for the searched booking!' })
                    });
                } else {
                    return reject({ error: true, code: 'WEB_APIS_ERR', message: 'No such booking exists!' })
                }
            }).catch((error) => {
                reject({ error: true, code: 'WEB_APIS_ERR', message: error.message || 'Unknown error in web apis' })
            });
        });
    }

    findSessionDetails(ssnId) {
        let sessionReq = { table: 'sessions', data: { id: ssnId } };
        return new Promise((resolve, reject) => {
            base.select(sessionReq).then((data) => {
                return resolve(data.result);
            }).catch((error) => { reject(error); });
        });
    }

    findAllSessions() {
        let sessionsReq = { table: 'sessions', data: {} };
        return new Promise((resolve, reject) => {
            base.select(sessionsReq).then((data) => {
                for (let i = data.result.length - 1; i >= 0; i--) {
                    !data.result[i].is_enabled && data.result.splice(i, 1);
                }
                return resolve(data.result);
            }).catch((error) => { reject(error); });
        });
    }

    findMovieDetails(mvId) {
        let mvReq = { table: 'movies', data: { id: mvId } }
        return new Promise((resolve, reject) => {
            base.select(mvReq).then((data) => {
                return resolve(data.result);
            }).catch((error) => { reject(error); });
        });

    }

    async findAudiDetails(audiId) {
        let audiReq = { table: 'audis', data: { id: audiId } }
        return await new Promise((resolve, reject) => {
            base.select(audiReq).then((data) => {
                return resolve(data.result);
            }).catch((error) => { reject(error); });
        });
    }

    findAllAudi() {
        let audiReq = { table: 'audis', data: {} };
        return new Promise((resolve, reject) => {
            base.select(audiReq).then((data) => {
                return resolve(data.result);
            }).catch((error) => { reject(error); });
        });
    }

    findAllMovies() {
        return new Promise((resolve, reject) => {
            base.select({ table: 'movies', data: {} }).then((data) => {
                return resolve(data.result);
            }).catch((error) => { reject(error); });
        });
    }

    findCinemaDetails() {
        let cinemaReq = { table: 'cinemas', data: {} }
        return new Promise((resolve, reject) => {
            base.select(cinemaReq).then((data) => {
                return resolve(data.result);
            }).catch((error) => { reject(error); });
        });
    }

    async findMasterInfo() {
        return base.select({ table: 'masterInfo', data: {} });
    }

    async updateMasterInfo(masterInfo) {
        return base.add(masterInfo);
    }

    async addLog(log) {
        return base.add(log);
    }

    async deleteLog(ids) {
        return base.remove({ table: 'logs', data: { id: ids } });
    }

    deleteRelatedSessions(obj) {
        return new Promise((resolve, reject) => {
            let idsToBeDeleted = [];
            base.select({ table: 'sessions', data: {} }).then((data) => {
                data.result.map(session => {
                    session[obj.table.slice(0, -1) + '_id'] === obj.id && idsToBeDeleted.push(session.id);
                });
                base.remove({ table: 'sessions', data: { id: idsToBeDeleted } });
            }).catch((error) => { reject(error); });
        });
    }

    async getLog() {
        return base.select({ table: 'logs', data: {} });

    }

    async getUsers() {
        return base.select({ table: 'users', data: {} });

    }

    async realTimeSync(obj, fullObjInfo) {
        return await new Promise((resolve, reject) => {
            let isSessionData = obj.dataForDB.table == "sessions";
            if (isSessionData) {
                // This is to check array if add call and in delete call we have object
                if (obj.dataForDB.data && (obj.dataForDB.data instanceof Array)) {
                    obj.dataForDB.data.map(datum => {
                        datum.isOnline = 1;
                    })
                }
            }
            base[obj.fnName](obj.dataForDB).then((data) => {
                return resolve(data);
            }).catch((error) => { reject(error); });
        })
    }

    async addUpdateBooking(bookingObj, onlineStatus) {
        let result = bookingObj.data.result;
        let reqData = {
            table: 'bookings',
            data: [{
                booking_id: _.get(result, 'id', null),
                pos_user_id: result.pos_user_id == 'null' ? 0 : _.get(result, 'pos_user_id', 0),
                print_status: _.get(result, 'print_status', null),
                seat_count: _.get(result, 'seatCount', null),
                seat_details: _.get(result, 'seatDetails', null),
                ssn_instance_id: _.get(result, 'ssnInstanceId', null),
                isOnline: onlineStatus,
                status: 4,
                payment_mode: _.get(result, 'payment_mode', null),
                booking_type: _.get(result, 'booking_type', null),
                invoice: _.get(result, 'invoice', null),
                created_at: _.get(result, 'created_at', new Date().toISOString()),
                updated_at: _.get(result, 'updated_at', new Date().toISOString())
            }]

        };
        return base.add(reqData);
    }

    async cancelBooking(bookingObj) {
        bookingObj.status = 32;
        let reqData = { table: 'bookings', data: [bookingObj] }
        return base.add(reqData);
    }

    async getDumpData(data) {
        return base.select({ table: data.table, data: {} });

    }

    getBookingsBySessions(instanceId) {
        return base.select({ table: 'bookings', data: { ssn_instance_id: instanceId } });
    }

    getAllNeededSessionsBooking(neededSessions) {
        let allData = {};
        return new Promise((resolve, reject) => {
            neededSessions.map((id) => {
                this.getBookingsBySessions(id).then((data) => {
                    allData[id] = data;
                    if (Object.keys(allData).length === neededSessions.length) {
                        return resolve(allData);
                    }
                }).catch((error) => {
                    reject(error);
                })
            });
        })
    }

    getAllNeededMovies(neededMovies) {
        let allData = {};
        return new Promise((resolve, reject) => {
            neededMovies.map((id) => {
                this.findMovieDetails(id).then((data) => {

                    allData[id] = data;
                    if (Object.keys(allData).length === neededMovies.length) {
                        return resolve(allData);
                    }
                }).catch((error) => {
                    reject(error);
                })
            });
        })
    }

}

export default new webApis();
