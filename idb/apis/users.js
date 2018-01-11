import crypto from 'crypto';
import base from './base';


/* Local login method
   1. We fetch index phone number from users table. 
   2. We use crypto module to hash the password entered using salt present.
   Then check if the stored hashed password is same as entered password. 
*/
export const localDbLogin = (userPostInfo) => {
    let users = { table: 'users', data: { 'phone_number': userPostInfo.phone_number } };
    return new Promise(function (resolve, reject) {
        base.select(users).then((data) => {
            let user = data.result;
            if (!user)
                return reject({ error: true, code: 'USERS_DB_ERROR', message: 'Phone_Number_Not_Found' });
            if (!(user.password === hashPassword(user.salt, userPostInfo.password).slice(0, 60))) {
                return reject({ error: true, code: 'USERS_DB_ERROR', message: 'Invalid Phone Number or password' });
            }
            return resolve(user);
        }).catch((error) => {
            return reject(error);
        });;
    });

};

const hashPassword = (salt, password) => {
    if (salt && password) {
        return crypto.pbkdf2Sync(password, new Buffer(salt, 'base64'), 10000, 64).toString('base64');
    } else {
        return password;
    }
};

export const getUsers = () => {
    let users = { table: 'users', data: {} };
    return new Promise(function (resolve) {
        base.select(users).then(data => {
            if (!data.error && data.result !== undefined) {
                return resolve(data.result);
            }
        }).catch((error) => { reject(error) });
    });
};