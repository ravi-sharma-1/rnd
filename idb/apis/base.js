/*
 This module do validation and other checks before hitting DB.
 DO NOT write DB functions in this module.
 */
'use strict';

import { schema } from '../cfg/schema';
import model from '../model/base';
// TODO - We need to figure out the replacement of clientLogging and serverLogging in this file.
//import { serverLogging, clientLogging } from '../../js/utils/logging'
// TODO : add checks for correct operation on tables.
// disable an operation on a table

class base {

    constructor() { }

    validateAdd(table, data) {
        //check for JSON data
        /*try {
         opt.data = JSON.parse(opt.data);
         } catch {
         return cb("Expected JSON data, Invalid data received");
         }*/

        var fields;
        if (schema[table].reqdFilter) {
            fields = schema[table].reqdFilter;
        } else {
            fields = schema[table].addFilter;
        }
        for (let i in data) {
            var error = [];
            // trim all string data
            for (var key in data[i]) {
                if (typeof (data[i][key]) == 'string')
                    data[i][key] = data[i][key].trim();
            }
            fields.forEach(function (key) {
                if (data[i][key] === undefined) {
                    error.push(key);
                }
            });
            if (error.length) {
                return 0;
            }
        }
        return 1;
    }


    add(opt) {
        return new Promise((resolve, reject) => {
            if (!opt.table || opt.table == '') {
                return reject({ error: true, code: 'No_TABLE', message: "Table/ Store Name needed to perform operation" });
            }
            if (!opt.data || !(opt.data instanceof Array)) {
                return reject({ error: true, code: 'NO_DATA_TO_ADD', message: "No Data to add" });
            }
            if (!this.validateAdd(opt.table, opt.data)) {
                return reject({ error: true, code: 'INVALID_DATA', message: "Provided Data invalid" });
            }
            model.add(opt, (data) => {
                data.error ? reject(data) : resolve(data);
                return;
            });
        });
    }

    remove(opt) {
        return new Promise((resolve, reject) => {
            if (!opt.table || opt.table == '') {
                return reject({ error: true, code: 'NO_TABLE', message: "Table/ Store Name needed to perform operation" });
            }
            if (!opt.data || !opt.data.id) {
                return reject({ error: true, code: 'ID_MISSING', message: "Provide Id to perform delete operation" });
            }
            model.remove(opt, (data) => {
                data.error ? reject(data) : resolve(data);
                return;
            });
        });
    }

    select(opt) {
        return new Promise((resolve, reject) => {
            if (!opt.table || opt.table == '') {
                return reject({ error: true, code: 'NO_TABLE', message: "Table/ Store Name needed to perform operation" });
            }
            if (!schema.hasOwnProperty(opt.table)) {
                return reject({ error: true, code: 'NO_TABLE', message: "Table/ Store to be accessed is not present." });
            }
            model.select(opt, (data) => {
                data.error ? reject(data) : resolve(data);
                return;
            });
        });
    }
}

export default new base();