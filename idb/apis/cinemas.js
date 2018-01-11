/**
 * Created by paridhisharma on 22/2/17.
 */

import base from './base';

export const getCinemas = () => {
    let cinema = { table: 'cinemas', data: {} };
    return new Promise(function (resolve, reject) {
        base.select(cinema).then((data) => {
            let cinemas = {};
            if (!data.error && data.result !== undefined) {
                cinemas = data.result;
            }
            return resolve(cinemas);
        }).catch((error) => {
            return reject(error);
        });
    });
};
