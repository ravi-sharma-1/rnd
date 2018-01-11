import _ from 'lodash';
import moment from 'moment';
import base from './base';

export function getMovieDetails() {
    let movie = { table: 'movies', data: {} };
    let session = { table: 'sessions', data: {} };
    return new Promise(function (resolve, reject) {
        let result = {};
        let validAudis = [];
        let audiMapper = {};
        base.select(movie).then((data) => {
            let movies = data.result;
            if (data.error || (!movies && !movies.length)) {
                return resolve(result);
            }
            else {
                _.map(movies, movie => {
                    if (result[movie.id]) {
                        result[movie.id].push(movie);
                    }
                    else {
                        movie.sessions = [];
                        result[movie.id] = movie;
                    }
                });
                base.select({ table: 'audis', data: {} }).then((audiData) => {
                    audiData.result.map(audi => {
                        audi.is_active === 1 && validAudis.push(audi.id);
                        audiMapper[audi.id] = audi.name;
                    });
                    base.select(session).then((data) => {
                        let sessions = data.result;
                        _.map(sessions, session => {
                            if (result[session.movie_id]) {
                                result[session.movie_id].sessions.push(session);
                            }
                        });
                        base.select({ table: 'cinemas', data: {} }).then((cinema) => {
                            return resolve(filterMovieShows(result, _.get(cinema, 'result[0].pos_cutoff_time', 0), validAudis, audiMapper));
                        }).catch((error) => {
                            return reject(error);
                        });
                    }).catch((error) => {
                        return reject(error);
                    });
                }).catch((error) => {
                    return reject(error);
                });
            }
        }).catch((error) => {
            reject(error);
        });
    });
}

function filterMovieShows(result, POSCutOffTime, validAudis, audiMapper) {
    if (Object.keys(result).length === 0) {
        return {};
    }
    let movie, session;
    Object.keys(result).map((resultkey) => {
        movie = result[resultkey];
        if (!(
            movie.is_active && // This is check for movie being active
            movie.is_enabled  // This is check for movie being enabled
        )) {
            delete result[resultkey];
        } else {
            for (let i = movie.sessions.length - 1; i >= 0; i--) {
                session = movie.sessions[i];
                if (!(
                    validAudis.indexOf(session.audi_id) > -1 &&  // This is check for audi being active and non disabled
                    session.is_enabled &&  // This is check for session being enabled
                    session.is_active &&   // This is check for session being active
                    moment(session.start_date_time).add(POSCutOffTime, 'minutes').format() > moment(new Date()).format() &&  // This is check that session POS cut off time did not pass yet
                    moment(session.start_date_time).format('YYYY-MM-DD') <= moment(new Date()).add(6, 'days').format('YYYY-MM-DD')  // This is a check on session if it falls within nexy 7 days
                )) {
                    movie.sessions.splice(i, 1);
                }
                session.audi_name = audiMapper && audiMapper[session.audi_id];
            }
            movie.sessions.length === 0 && delete result[resultkey]; // This is final check on movie that, if there is no valid session in the movie, we remove the movie from the object to be returned
        }
    });
    return result;
}

export async function getMoviesById(_id) {
    return await new Promise((resolve, reject) => {
        base.select({ table: 'movies', data: { id: _id } }).then((data) => {
            return resolve(data.result)
        }).catch((error) => { reject(error); })
    });
}