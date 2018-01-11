'use strict';
import async from 'async';
import IndexedDB from '../cfg/db';

class model {

  constructor() { }

  add(opt, cb) {
    return IndexedDB.storeData(opt.table, opt.data, cb);
  }

  remove(opt, cb) {
    if (opt.data.id instanceof Array) {
      if (!opt.data.id.length) {
        return cb({ error: true, code: 'BASE_JS_DB_ERROR', message: 'No Id Provided to delete' });
      }
      // TODO: check for unique ids
      let done = [];
      let failed = [];
      return async.each(opt.data.id, iterateeFunc, asyncCB);
      function iterateeFunc(id, callback) {
        IndexedDB.removeData(opt.table, { id: id }, (res) => {
          if (res.error) {
            failed.push(id);
            return callback();
          }
          done.push(id);
          return callback();
        });
      }
      function asyncCB() {
        return cb({ result: { done: done, failed: failed } });
      }
    }
    return IndexedDB.removeData(opt.table, opt.data, cb);
  }

  select(opt, cb) {
    if (opt.data && opt.data.id && opt.data.id instanceof Array) {
      if (!opt.data.id.length) {
        return cb({ result: [] });
      }
      // TODO: check for unique ids
      let done = [];
      return async.each(opt.data.id, iterateeFunc, asyncCB);
      function iterateeFunc(id, callback) {
        IndexedDB.select(opt.table, { id: id }, (res) => {
          if (res.__ndf && res.message === 'No Data Found') {
            return callback();
          } else if (res.error && res.code === 'DB_ERROR') {
            return callback(res);
          }
          done.push(res.result);
          return callback();
        });
      }

      function asyncCB(err) {
        if (err) {
          return cb(err);
        }
        return cb({ result: done });
      }
    }
    return IndexedDB.select(opt.table, opt.data, cb);
  }

}

export default new model();
