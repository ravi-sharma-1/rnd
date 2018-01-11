const schema = require('./schema').schema;

class IndexedDB {

  constructor() {
    this.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB ||
      window.msIndexedDB;
    this.dbName = "POS_DB";
    this.dbVersion = 9;
    this.db;
    this.deleteIDBFlag = false;
    this.createObjectStore();
  }

  createObjectStore() {
    // this.dbversion++;
    let request = this.indexedDB.open(this.dbName, this.dbVersion);
    request.onupgradeneeded = function (event) {
      let contentDB = event.target.result;

      for (let i in schema) {
        if (!contentDB.objectStoreNames.contains(i)) {
          let store = contentDB.createObjectStore(i, { keyPath: schema[i].keyPath });

          if (schema[i].indexedFields instanceof Array) {
            for (let j in schema[i].indexedFields) {
              store.createIndex(schema[i].indexName[j], schema[i].indexedFields[j], {
                unique: schema[i].isIndexUnique[j]
              });
            }
          } else {
            store.createIndex(schema[i].indexName, schema[i].indexedFields, {
              unique: true
            });
          }
        } else {
          // This is the scenario in which table exists and then we check for indices to be added
          let tx = event.target.transaction;
          let store = tx.objectStore(i);
          if (schema[i].indexedFields instanceof Array && (schema[i].indexedFields.length > 1)) { // This is condition if there are more than one index
            for (let j in schema[i].indexedFields) {
              if (!(store.indexNames.contains(schema[i].indexName[j]))) {
                store.createIndex(schema[i].indexName[j], schema[i].indexedFields[j], {
                  unique: schema[i].isIndexUnique[j]
                });
              }
            }
          } else { // This is condition if there is only one index
            if (!(store.indexNames.contains(schema[i].indexName))) {
              store.createIndex(schema[i].indexName, schema[i].indexedFields, {
                unique: true
              });
            }
          }
        }
      }
    }

    request.onsuccess = function (event) {
      request.result.close();
    }

    request.onerror = function (event) {
    }
  }


  storeData(section, data, cb) {
    // this.dbVersion++;
    let request = this.indexedDB.open(this.dbName, this.dbVersion);
    // request.onerror
    request.onsuccess = function (event) {
      let db = event.target.result;
      let transaction = db.transaction(section, "readwrite");
      let store = transaction.objectStore(section);
      let i = 0;

      putNext();
      transaction.oncomplete = function () {
        db.close();
      };

      function putNext() {
        if (i < data.length) {
          store.put(data[i]).onsuccess = putNext;
          ++i;
        } else { // complete
          cb({ result: "Done" });
        }
      }
    }

    request.onerror = function (event) {
      return cb({ error: true, code: 'DB_ERR', message: event.target.error.name });
    }
  }

  removeData(section, data, cb) {
    let request = this.indexedDB.open(this.dbName, this.dbVersion);
    //on error
    request.onsuccess = function (event) {
      let db = event.target.result;
      // currently using delete method, while usiing delete index modify as following:
      //exe del inside "versionchange" mode to disable concurrent transaction resquests
      // while this db is modified here in del transaction
      let transaction = db.transaction(section, "readwrite"); //versionchange
      let store = transaction.objectStore(section);
      let del = store.delete(data.id);

      del.onsuccess = function (e) {
        return cb({ result: "Done" });
      };
      del.onerror = function (e) {
        return cb({ error: true, code: 'DB_ERR', message: event.target.error.name });
      };

      transaction.oncomplete = function () {
        db.close();
      };
    }
  }

  select(section, data, cb) {
    let request = this.indexedDB.open(this.dbName, this.dbVersion);
    //on error
    request.onsuccess = function (event) {
      let db = event.target.result;

      if (db.objectStoreNames.contains(section)) {
        let transaction = db.transaction(section, "readonly");
        let store = transaction.objectStore(section);


        let index = schema[section].indexName;
        let ob;

        // TODO : remove these multiple checks
        // add internal to fetch indexNames from schema
        // support for composite indices
        try {
          if ((section === "sessionSeatingInfo" || section === "session") && data.id) {
            let indexVal = data[schema[section].indexedFields];
            ob = store.index(index).get(indexVal);
          } else if (section === "sessions") {
            if (data.hasOwnProperty("isOnline")) {
              ob = store.index('syncsessionIndex').getAll(Number(data.isOnline));
            } else if (data.id) {
              ob = store.index('sessionsIndex').get(data.id);
            } else {
              ob = store.index('sessionsIndex').getAll();
            }
          } else if (data.machine_id || data.phone_number || data.tele_book_no || data.id || data.booking_id || data.ssn_instance_id || (data.hasOwnProperty("isOnline")) || data.status) {
            let indexVal = data[schema[section].indexedFields];
            if (section === "bookings" && data.tele_book_no) {
              // multiple tele_bookings may be present for a phone nuber 
              ob = store.index('teleIndex').getAll(data.tele_book_no);
            } else if (data.id || data.phone_number) {
              ob = store.index(index).get(Number(indexVal));
            } else if (data.booking_id || data.ssn_instance_id || (data.hasOwnProperty("isOnline")) || data.status) {  // this block for bookings table
              if (data.booking_id) {
                ob = store.index('bookingsIndex').get(data.booking_id);
              } else if (data.ssn_instance_id) {
                ob = store.index('instanceIdIndex').getAll(Number(data.ssn_instance_id));
              } else if (section === "bookings" && data.isOnline == 0) {
                ob = store.index('syncIndex').getAll(Number(data.isOnline));
              } else if (data.status) {
                ob = store.index('bookingStatus').getAll(Number(data.status));
              }
            }
          } else {
            ob = store.index(index).getAll(); //when no indices are available in data
          }
        } catch (e) {
          return cb({ error: true, code: 'DB_ERR', message: 'IDB error : The specified index was not found' });
        }

        ob.onsuccess = function (e) {
          if (typeof e.target.result === 'undefined') {
            return cb({ __ndf: true, message: 'No Data Found' });
          }
          for (let i = e.target.result.length - 1; i >= 0; i--) e.target.result[i].is_enabled === 0 && e.target.result.splice(i, 1) // This check should be removed once we have code in place to avoid entries with is_enabled = 0
          return cb({ result: e.target.result });
        };
        ob.onerror = function (e) {
          return cb({ error: true, code: 'DB_ERR', message: e.target.error });
        };

        transaction.oncomplete = function () {
          db.close();
        };
      } else {
        if (!this.deleteIDBFlag) {
          this.deleteIDBFlag = false;
          if (confirm("Do you wish to force clear IndexedDB ?") == true) {
            var DBDeleteRequest = window.indexedDB.deleteDatabase("POS_DB");
            DBDeleteRequest.onerror = function (event) {
              console.log("Error deleting database.");
            };
            DBDeleteRequest.onsuccess = function (event) {
              window.location.reload();
            };
          }
        }
        this.deleteIDBFlag = true;
        return cb({ error: true, code: 'DB_ERR', message: event });
      }
    }
  }

  /*Currently not being used*/

  dbExists(cb) {
    let dbExists = true;
    let request = this.indexedDB.open(this.dbName);
    request.onsuccess = function () {
      request.result.close();
      cb(dbExists);
    }
    request.onupgradeneeded = function () {
      dbExists = false;
    }
  }

}

export default new IndexedDB();