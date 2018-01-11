import async from 'async';
import moment from 'moment';
import base from './base';
import seat_layout from './seatLayout';
import { getAllOfflineSessions } from './sessions';
// TODO - We need to figure out the replacement of clientLogging and serverLogging in this file.
//import serverLogging from '../../js/utils/logging';

// TODO -- Modify the error format everywhere in this file.
const block = {
  blockSeatOffline(opt) {
    return new Promise((resolve, reject) => {
      const sessOpt = { table: 'sessions', data: { id: opt.ssn_instance_id } };
      base.select(sessOpt).then((sessData) => {
        const audiOpt = { table: 'audis', data: { id: sessData.result.audi_id } };
        const bookingsOpt = { table: 'bookings', data: { ssn_instance_id: opt.ssn_instance_id } };
        const cineOpt = { table: 'cinemas', data: {} };
        base.select(cineOpt).then((cineData) => {
          cineData = cineData.result[0];
          let start = sessData.result.start_date_time;
          if (moment(start).add(cineData.pos_cutoff_time, 'minutes').isBefore(moment())) {
            return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'POS Cutoff time reached' });
          }
          seat_layout.getBookingMergedLayout(audiOpt, bookingsOpt).then((val) => {
            block.processLayout(opt, val.result).then((processRes) => {
              opt.bookID = generate({ cinema_id: opt.cinema_id, audi_id: audiOpt.data.id });
              block.addToBooking(opt).then((data) => resolve(data)).catch((error) => { reject(error) });
            }).catch((error) => { reject(error) });
          }).catch((error) => { reject(error) });
        }).catch((error) => { reject(error) });
      }).catch((error) => { reject(error); });
    })
  },

  blockSeatOnline(opt) {
    return new Promise((resolve, reject) => {
      //marking online flag 1, done online
      opt.data[0].isOnline = 1;
      opt.data[0].status = parseInt(opt.data[0].status);
      opt.data[0].ssn_instance_id = parseInt(opt.data[0].ssn_instance_id);
      opt.data[0].created_at = new Date().toISOString();
      opt.data[0].updated_at = new Date().toISOString();
      return base.add(opt).then(function (data) {
        return resolve({ id: opt.data[0].booking_id });
      }).catch((error) => { reject(error) });
    })
  },

  unblockSeat(data, navFlag) {//data => {booking_id:"asd123"}
    return new Promise((resolve, reject) => {
      if (!data.booking_id || data.booking_id === '') {
        return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Booking ID not found.' });
      }
      const bookingSel = { table: 'bookings', data: { booking_id: data.booking_id } };
      base.select(bookingSel).then((bookRes) => {
        let bookingData = bookRes.result;
        if (bookingData.status == 4) {
          return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Seat you are unblocking is booked' });
        } else if (!(bookingData.status == 2 || bookingData.status == 9)) {
          return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Seat you are unblocking in not blocked' });
        }

        if (bookingData.status == 9) {
          // update seat availability
          // update sessionSeatingInfo table, remove entries.
          // update status to unblocked
          const keys = dataforSeatingStore(bookingData);

          return async.series([
            async.apply(updateSessionSeatingInfo, { rem: keys }, 'TELEBOOK'),
            async.apply(updateSessionStore, { isUnblock: true }, bookingData),
          ], (err, res) => {
            return updateStatus();
          });
        }

        return updateStatus();

        function updateStatus() {
          bookingData.status = 16; // setting booking status to unblock
          bookingData.isOnline = navFlag ? 1 : 0;;
          bookingData.updated_at = new Date().toISOString();
          base.add({ table: 'bookings', data: [bookingData] }).then((data) => {
            resolve(data)
          }).catch((error) => { reject(error) });
        }
      }).catch((error) => { reject(error) });
    });
  },

  bookSeat(data, navFlag) { //data => {booking_id:"asd123", payment_mode: "2"}
    return new Promise((resolve, reject) => {
      if (!data.booking_id || data.booking_id === '') {
        return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Booking Id not provided' });
      }
      const bookingSel = { table: 'bookings', data: { booking_id: data.booking_id } };
      const taxDetails = { table: 'cinemas', data: {} };
      let bookingData = {};

      function getData(data, callback) {
        return base.select(data).then((res) => {
          return callback(null, res.result);
        }).catch((error) => { return callback(error); });
      }
      ;
      // if booking data NA in local DB
      // check if sufficent data provoided to proceed booking
      return async.parallel([
        async.apply(getData, bookingSel),
        async.apply(getData, taxDetails)
      ], pcb);
      function pcb(perr, rpes) {
        if (perr) {
          return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Error fetching Booking/Tax details to proceed booking' });
        }

        let bookRes = rpes[0];
        let taxRes = rpes[1][0];

        if (bookRes.__ndf && bookRes.message === 'No Data Found') {
          if (!isValidData(data, bookingData)) {
            return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Insufficient info to book : Missing booking details' });
          }
        } else if (bookRes.error) {
          return reject(bookRes);
        } else {
          bookingData = bookRes;
        }

        if (taxRes.__ndf && taxRes.message === 'No Data Found') {
          return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Insufficient info to book : Missing Tax data for Cinema' });
        } else if (taxRes.error) {
          return reject(taxRes);
        } else {
          taxRes = taxRes;
        }

        if (!(bookingData.status == 4 || bookingData.status == 2 || bookingData.status == 9)) {
          return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Invalid State to proceed booking.' });
        }

        if (bookingData.status == 4) {
          //booking id for which BOOKMASTER is received is already booked
          return resolve({ result: "Done", bookingData });
        }

        !navFlag && (bookingData.print_status = 1);
        bookingData.isOnline = navFlag ? 1 : 0;
        // bookingData.booking_id = data.booking_id;
        bookingData.payment_mode = data.payment_mode;
        bookingData.booking_type = data.booking_type;
        bookingData.updated_at = new Date().toISOString();

        // if (data.is_slave == 1) {
        //   bookingData.invoice = generateInvoice(taxRes.invoice, bookingData.seat_count);
        // } else if (data.is_slave == 0 && data.invoice) {
        //   bookingData.invoice = data.invoice;
        // }
        bookingData.invoice = generateInvoice(taxRes.invoice, bookingData.seat_count);

        taxRes.invoice = Number(taxRes.invoice) + Number(bookingData.seat_count);

        // check seats for availablity insessionSeatingInfo table before proceeding to book
        // if available: add seats to sessionSeatingInfo table before proceeding to book
        // add data to bookings table
        // if error occurs while adding booking: remove corresponding entries from sessionSeatingInfo store
        // update sessions store for seat availabilt


        if (bookingData.status == 9) { // telebooking
          // update bookingData. 
          bookingData.status = 4;

          // update invoice number in cinemas table.
          // TODO: add failure logs
          base.add({ table: 'cinemas', data: [taxRes] });

          return base.add({ table: 'bookings', data: [bookingData] }).then((resp) => {
            resp.result && (resp.bookingData = bookingData);
            return resolve(resp);
          }).catch((error) => { reject(error) });
        }

        // creating entries for sessonSeatingInfo object store 
        let keys = dataforSeatingStore(data);

        // skip this block while booking teleblock seats, done already while teleblocking
        // just add updated booking data to idb.
        bookingData.status = 4;
        return updateSessionSeatingInfo({ add: keys }, 'BOOK', (resErr, resSeatInfo) => {
          if (resErr) {
            return reject(resErr);
          }
          return base.add({ table: 'bookings', data: [bookingData] }).then((resBook) => {
            base.add({ table: 'cinemas', data: [taxRes] }).then((res123) => { });

            return updateSessionStore(resBook, bookingData, (err, res) => {
              if (err) {
                return reject(err);
              }
              return resolve(res);
            });
          }).catch((error) => {
            //undo entries from session seat info
            // TODO: add failure logs
            base.remove({ table: 'sessionSeatingInfo', data: { id: keys } }).then((delRes) => { }).catch((error) => { });
            return reject(error);
          });
        });//.catch((error)=>{ reject(error);});
      };

      function isValidData(data, bookingData) {
        let obj = {};
        let error = 1;
        ['seat_count', 'seat_details', 'pos_user_id', 'ssn_instance_id', 'print_status'].forEach(function (key) {
          if (data[key] === undefined || ((typeof (data[key]) == 'string') && (data[key].trim() == ''))) {
            error = 0;
          } else {
            bookingData[key] = data[key];
          }
        });
        return error;
      }
    });
  },

  printTicket(data, navFlag) {//data => {booking_id:"asd123"}
    return new Promise((resolve, reject) => {
      if (!data.booking_id || data.booking_id === '') {
        return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Booking Id not found' });
      }
      const bookingSel = { table: 'bookings', data: { booking_id: data.booking_id } };
      return base.select(bookingSel).then((bookRes) => {
        let bookingData = bookRes.result;
        if (isNaN(data.pos_user_id)) {
          return reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Invalid User ID' });
        };
        bookingData.print_status = 1;
        // TODO: bookingData.counter = data.counter;
        // instead append counter data wile booking success.
        bookingData.pos_user_id = Number(data.pos_user_id);
        bookingData.isOnline = navFlag ? 1 : 0;
        bookingData.updated_at = new Date().toISOString();
        base.add({ table: 'bookings', data: [bookingData] }).then((data) => {
          return resolve(data);
        }).catch((error) => { reject(error); });
      }).catch((error) => { reject(error); });;
    });
  },

  isBooked(data) { //data => {booking_id:"asd123"}
    return new Promise((resolve, reject) => {
      const bookingSel = { table: 'bookings', data: { booking_id: data.booking_id } };
      return base.select(bookingSel).then((BookRes) => {
        if (BookRes.result.status == 4) {
          return resolve({ result: "Booked" });
        }
        return resolve({ result: "Not Booked" });
      }).catch((error) => { reject(error) });
    });
  },

  getOfflineBookData(objToFetch) {
    return new Promise((resolve, reject) => {
      const offData = { table: 'bookings', data: objToFetch };
      base.select(offData).then((offRes) => {
        if (offRes.__ndf && offRes.message === 'No Data Found') {
          return resolve({ bookData: [], blockData: [], refundData: [], sessionData: [] });
        } else if (offRes.error) {
          return reject(offRes);
        }
        offRes = offRes.result;
        let bookData = [];
        let blockData = [];
        let refundData = [];
        let sessionData = [];
        let instanceIds = [];
        let tData = [];
        for (let i in offRes) {
          let temp = {
            booking_id: offRes[i].booking_id,
            seatDetails: offRes[i].seat_details,
            seatCount: offRes[i].seat_count,
            ssn_instance_id: offRes[i].ssn_instance_id,
            status: offRes[i].status,
            pos_user_id: offRes[i].pos_user_id,
            print_status: offRes[i].print_status,
            payment_mode: offRes[i].payment_mode,
            booking_type: offRes[i].booking_type ? offRes[i].booking_type : null,
            tele_book_no: offRes[i].tele_book_no ? offRes[i].tele_book_no : null,
            pax_info: offRes[i].tele_book_no ? offRes[i].pax_info : null,
            isOnline: 1,
            invoice: offRes[i].invoice,
            updated_at: offRes[i].updated_at,
            created_at: offRes[i].created_at
          };
          if (offRes[i].rpos_user_id) {
            temp.rpos_user_id = offRes[i].rpos_user_id;
          }
          if (parseInt(offRes[i].status) == 4) {
            temp.payment_mode = offRes[i].payment_mode,
              temp.invoice = offRes[i].invoice,
              bookData.push(temp);
          } else if (parseInt(offRes[i].status) == 2) {
            blockData.push(temp);
          } else if (parseInt(offRes[i].status) == 9) {
            tData.push(temp);
          } else if (parseInt(offRes[i].status) == 64) {
            refundData.push(temp);
          }
          instanceIds.push(offRes[i].ssn_instance_id);
        }
        let getAllOfflineSessionFromDB = (callback) => {
          getAllOfflineSessions().then((res) => {
            res = res.result;
            sessionData = res;
            callback(null, { sessionData: res })
          }).catch((err) => {
            callback(err);
          })
        };
        return async.parallel([getAllOfflineSessionFromDB], function (err, res) {
          return resolve({ bookData, blockData, refundData, sessionData, tData })
        });
      }).catch((error) => { reject(error); });
    });
  },

  updateOfflineBookingsAfterSync(data) {
    //data =>{ bookData: [], blockData:[] }
    let arr = data.bookData.concat(data.blockData).concat(data.refundData);
    let obj = { table: 'bookings', data: [] };
    for (let i in arr) {
      arr[i].seat_count = arr[i].seatCount;
      arr[i].seat_details = arr[i].seatDetails;
      delete arr[i].seatCount;
      delete arr[i].seatDetails;
      obj.data.push(arr[i]);
    }
    return base.add(obj);
  },

  updateOfflineSessionsAfterSync(data) {
    _.each(data, (session) => {
      session.isOnline = 1;
    });
    let obj = { table: 'sessions', data };
    return base.add(obj);
  },

  addToBooking(opt) {
    return new Promise((resolve, reject) => {
      const bookData = {
        table: 'bookings',
        data: [{
          booking_id: opt.bookID,
          ssn_instance_id: Number(opt.ssn_instance_id),
          // transaction_id: opt.transaction_id,
          seat_count: opt.category.length,
          seat_details: opt.seat_details + "|" + opt.user_seat_details,
          pax_info: opt.pax_info,
          status: bookingStatus.BLOCK,
          print_status: 0,
          pos_user_id: parseInt(opt.pos_user_id),
          isOnline: 0, //done offline
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      };
      base.add(bookData).then((res) => {
        return resolve({ id: opt.bookID });
      }).catch((error) => { reject(error) });
    });
  },

  processLayout(opt, res) {
    return new Promise((resolve, reject) => {
      var error = "";
      var layout = res.layout.objArea;
      opt.seat_details = [];
      opt.user_seat_details = [];
      for (var i in opt.category) {
        var category = opt.category[i];
        if (layout[category] !== undefined) {
          if (layout[category].objRow[opt.row[i]] !== undefined) { /*Row check*/
            if (layout[category].objRow[opt.row[i]].objSeat[opt.index[i]] !== undefined) { /*Seat check*/
              if (layout[category].objRow[opt.row[i]].objSeat[opt.index[i]].SeatStatus ===
                userStatus.AVAILABLE) { /*Status check*/
                opt.seat_details.push(category + "-" + opt.row[i] + "-" + opt.index[i]);
                opt.user_seat_details.push(layout[category].AreaDesc + "-" + layout[category].objRow[
                  opt.row[i]].PhyRowId + "-" + layout[category].objRow[opt.row[i]].objSeat[opt.index[
                    i]].seatNumber);
              } else {
                error += "Category-" + category + " Row-" + opt.row[i] + " Seat-" + opt.index[i] +
                  " Current Status- " + userStatus[layout[category].objRow[opt.row[i]].objSeat[opt.index[
                    i]].SeatStatus] + ", ";
              }
            } else {
              error += "Category-" + category + " Row-" + opt.row[i] + " Seat-" + opt.index[i] +
                " doesn't exist, ";
            }
          } else {
            error += "Category-" + category + " Row-" + opt.row[i] + " doesn't exist, ";
          }
        } else {
          error += "Category-" + category + " doesn't exist, ";
        }
      }
      opt.seat_details = opt.seat_details.join(";");
      opt.user_seat_details = opt.user_seat_details.join(";");
      error ? reject(reject({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: error })) : resolve({});
      return;

    });
  },

  updateSessionSeatingInfo: updateSessionSeatingInfo,

  dataforSeatingStore: dataforSeatingStore
};

module.exports = block;

/**********************************************************************/
const userStatus = { /*Status shown to user*/
  0: 'AVAILABLE',
  1: 'NOT_AVAILABLE',

  /*Reverse map*/
  AVAILABLE: 0,
  NOT_AVAILABLE: 1,
};

const bookingStatus = { /*Internal status of seats*/
  1: 'AVAILABLE', //map to available of user
  2: 'BLOCK', //map to not available of user
  4: 'BOOK', //map to not available of user
  8: 'ENTRY',
  16: 'UNBLOCK',
  32: 'SCRIPT_UNBLOCK',
  /*Reverse map*/
  AVAILABLE: 1,
  BLOCK: 2,
  BOOK: 4,
  ENTRY: 8,
  UNBLOCK: 16,
  SCRIPT_UNBLOCK: 32
};

function generate(res) {
  var i, len;
  var cinema = res.cinema_id.toString().slice(-4).split("");
  len = cinema.length;
  for (i = 0; i < (4 - len); i++) {
    cinema.unshift(0);
  }
  cinema = cinema.join("");

  var audi = res.audi_id.toString().slice(-2).split("");
  len = audi.length;
  for (i = 0; i < (2 - len); i++) {
    audi.unshift(0);
  }
  audi = audi.join("");

  var text = cinema + audi;
  var charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (i = 0; i < 7; i++) {
    text += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  text += 'F';

  return text;
}

function generateInvoice(initNum, count) {
  // initNum = initNum.split('-');
  let numbers = [];
  for (let i = 1; i <= count; i++) {
    let num = (Number(initNum) + i).toString().split("");
    let len = num.length;
    for (var k = 0; k < (6 - len); k++) {
      num.unshift(0);
    }
    num = num.join("");
    numbers.push(num);
  }
  return numbers.join(',');
}

function updateSessionStore(data, bookingData, cb) {
  if (data.error) {
    return cb(data);
  }
  const sessData = { table: 'sessions', data: { id: bookingData.ssn_instance_id } };
  let seat_details = bookingData.seat_details;
  let seatCountMap = {};
  seat_details = seat_details.split('|')[0].split(';');
  for (let i in seat_details) {
    let temp = seat_details[i].split('-')[0];
    if (seatCountMap.hasOwnProperty(temp)) {
      seatCountMap[temp] = seatCountMap[temp] + 1;
    } else {
      seatCountMap[temp] = 1;
    }
  }

  return base.select(sessData).then((res) => {
    let sessRes = res.result;
    for (let i in sessRes.categories) {
      if (seatCountMap.hasOwnProperty(sessRes.categories[i].seat_category) && !data.isUnblock) {
        sessRes.categories[i].available_count = sessRes.categories[i].available_count - seatCountMap[sessRes.categories[i].seat_category];
        sessRes.categories[i].updated_at = new Date().toISOString();
      } else if (seatCountMap.hasOwnProperty(sessRes.categories[i].seat_category) && data.isUnblock) {
        sessRes.categories[i].available_count = sessRes.categories[i].available_count + seatCountMap[sessRes.categories[i].seat_category];
        sessRes.categories[i].updated_at = new Date().toISOString();
      }
      sessRes.updated_at = new Date().toISOString();
    }
    return base.add({ table: 'sessions', data: [sessRes] }).then((resp) => {
      resp.result && !data.isUnblock && (resp.bookingData = bookingData);
      return cb(null, resp);
    }).catch((error) => { cb(error) });
  }).catch((error) => { cb(error) });
}

// updates entry in sessionSeatingInfo for booked seats only.
function updateSessionSeatingInfo(data, val, cb) {
  // updates entry in sessionSeatingInfo for booked/telebooked seats only.
  // data = {add : [ssninstId_seat, ....], rem:[ssninstId_seat]}
  if (!(val == 'BOOK' || val == 'TELEBOOK')) {
    return cb({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Unsupported update for Session Seating Info Store' });
  }
  let funcList = [
    async.apply(checkInSessionSeatingInfo, data),       // checks if requested seat is availabile.
    async.apply(addToSeatingStore, data, val),          // adds seats to sessionSeatingInfo store.
    async.apply(removeFromSeatingStore, data, val),     // removes seat from sessionSeatingInfo store, modified from telebooking.
  ];
  return async.series(funcList, (err, res) => {
    return cb(err, res);
  });
  function checkInSessionSeatingInfo(data, cb1) {
    //** check availability before adding **
    if (data.add && data.add instanceof Array && data.add.length) {
      return base.select({ table: 'sessionSeatingInfo', data: { id: data.add } }).then((seatData) => {
        seatData = seatData.result;
        if (seatData.length) {
          return cb1({ error: true, code: 'BLOCK_SEAT_JS_ERROR', message: 'Operation not successful, some of the requested seats are occupied' });
        }
        return cb1();
      }).catch((error) => { return cb1(error); });
    }
    // nothing to check.
    return cb1();
  }

  function addToSeatingStore(data, val, cb2) {
    if (data.add && data.add instanceof Array && data.add.length) {
      let obj = {
        table: 'sessionSeatingInfo',
        data: []
      };
      for (let i in data.add) {
        obj.data.push({ id: data.add[i], status: val });
      }
      // TODO: remove base.add via safe update using 'versionchange'.

      return base.add(obj).then((res) => {
        return cb2(null, res);
      }).catch((error) => { return cb2(error); });
    }
    // nothing to add.
    return cb2();
  }
  function removeFromSeatingStore(data, val, cb3) {
    // removing entry from sessionSeatingInfo only for telebook.
    if ((data.rem && data.rem instanceof Array && data.rem.length) && (val == 'TELEBOOK')) {
      let obj = {
        table: 'sessionSeatingInfo',
        data: {
          id: data.rem
        }
      };
      return base.remove(obj).then((res) => {
        return cb3(null, res);
      }).catch((error) => { return cb3(error); });

    }
    // nothing to remove.
    return cb3();
  }
}

function dataforSeatingStore(data) {
  let seats = data.seat_details.split('|')[0].split(';');
  let ssn_instance_id = data.ssn_instance_id;
  let keys = [];
  for (let i in seats) {
    keys.push(ssn_instance_id.toString() + '_' + seats[i]);
  }
  return keys;
}
