import base from './base';

const seat_layout = {

  // TODO : split decode and merging
  // could be reused while block
  getAudiData(audiReq, bookReq) {
    return new Promise((resolve, reject) => {
      this.getBookingMergedLayout(audiReq, bookReq).then((data) => {
        return resolve({ result: reverseAdaptor([data.result])[0] });
      }).catch((error) => { reject(error) });
    });
  },

  getBookingMergedLayout(audiReq, bookReq) {
    return new Promise((resolve, reject) => {
      base.select(audiReq).then((data) => {
        let res = [data.result];
        decode(res, 1);
        fetchInventory(bookReq, function (inventory) {
          if (inventory.error) {
            return reject(inventory);
          }
          let mergerdLayout = combineLayoutAndInventory(res, inventory);
          return resolve({ result: mergerdLayout });
        })
      }).catch((error) => { reject(error) });
    });
  }

}

module.exports = seat_layout;

/************************************************************************/

/*
 This function decode seat-status, as per whom to shown seat_layout i.e. admin or user.s
 */
const userStatus = { /*Status shown to user*/
  AVAILABLE: 0,
  NOT_AVAILABLE: 1,
  TELEBLOCK: 2
};
const layoutStatus = { /*Status in seat_layout table */
  AVAILABLE: 1,
  NO_SEAT: 2,
  DAMAGED: 4,
  NOT_AVAILABLE: 8,
  RESERVED: 16
};
const admin = { /*Internal status of seats*/
  AVAILABLE: 1,
  BLOCK: 2,
  BOOK: 4,
  ENTRY: 8,
  UNBLOCK: 16,
  SCRIPT_UNBLOCK: 32
};

function decodeSeatStatus(type, seat, seatEle) {
  var max = 0;
  for (var s in seat) {
    seat[s] = seat[s].split('-');
    if (!type) { /*Decode as seat_layout*/
      seatEle[seat[s][0]] = {
        seatNumber: Number(seat[s][2]),
        /*SeatLable*/
        SeatStatus: Number(seat[s][1]),
        GridSeatNum: Number(seat[s][0]),
        /*col-Index in 2D matrix*/
      };
    } else { /*Decode as simple user seat*/
      if (layoutStatus.AVAILABLE == seat[s][1]) {
        seatEle[seat[s][0]] = {
          seatNumber: Number(seat[s][2]),
          SeatStatus: Number(userStatus.AVAILABLE),
          GridSeatNum: Number(seat[s][0]),
        };
      } else if (layoutStatus.RESERVED == seat[s][1]) {
        seatEle[seat[s][0]] = {
          seatNumber: Number(seat[s][2]),
          SeatStatus: Number(userStatus.AVAILABLE),
          GridSeatNum: Number(seat[s][0]),
          ReservedSeat: true
        };
      } else if (layoutStatus.DAMAGED == seat[s][1] || layoutStatus.NOT_AVAILABLE == seat[s][1]) {
        seatEle[seat[s][0]] = {
          seatNumber: Number(seat[s][2]),
          SeatStatus: Number(userStatus.NOT_AVAILABLE),
          GridSeatNum: Number(seat[s][0]),
        };
      }
      if (Number(seat[s][0]) > max) {
        max = Number(seat[s][0]);
      }
    }
  }
  return max;
}

function decodeCategory(data, type) {
  var category_map = {};
  /*<category_lbl>-<max_rows>-<max_cols>-<is_column_reversed>-<seat_count>-<is_row_reversed>
   -<free_seating>-<catgId>-<future-use>*/
  if (data.seat_category_map) {
    var cat = data.seat_category_map.split(';');
    for (var i in cat) {
      var details = cat[i].split("-");
      //<catgId>-<max_rows>-<max_cols>-<is_column_reversed>-<seat_count>-<is_row_reversed>-<free_seating>-<CatgLabel>
      category_map[details[0]] = {
        AreaDesc: (details[7] || details[0]),
        /*Or to support old seat_layout Cat Lable*/
        max_rows: Number(details[1]),
        max_cols: Number(details[2]),
        is_column_reversed: Number(details[3]),
        seat_count: Number(details[4]),
        is_row_reversed: Number(details[5]) || 0,
        free_seating: Number(details[6]) || 0,
        AreaCode: details[0],
        /*Cat code*/
      };
    }
  }
  if (!type) { /*decode and add */
    data.seat_category_map = category_map;
  }
  return category_map;
}

function decode(res, type) {
  for (var r in res) {
    decodeCategory(res[r]);
    if (!res[r].layout) {
      continue;
    }
    var layout = res[r].layout.split(';');
    var lay = {
      count: 0,
      intMaxSeatId: 0,
      objArea: {}
    };
    var maxSeatId = 0;

    for (var i in layout) { /*process each row*/
      var info = layout[i].split(',');

      if (!lay.objArea[info[2]]) { /*Category wise result.*/
        lay.objArea[info[2]] = {
          AreaDesc: res[r].seat_category_map[info[2]].AreaDesc, //Category Lable
          max_rows: res[r].seat_category_map[info[2]].max_rows, //Not using
          max_cols: res[r].seat_category_map[info[2]].max_cols, //Not using
          HasCurrentOrder: true, //Not using
          AreaCode: res[r].seat_category_map[info[2]].AreaCode, //Category Code
          AreaNum: lay.count + 1, //Not using
          free_seating: res[r].seat_category_map[info[2]].free_seating,
          objRow: {}
        };
        delete res[r].seat_category_map[info[2]].max_rows;
        delete res[r].seat_category_map[info[2]].max_cols;
        lay.count++;
      }
      var row = lay.objArea[info[2]].objRow;
      row[info[0]] = { /*Add row wise data in each category*/
        GridRowId: Number(info[0]), //Row-num in 2D matrix
        PhyRowId: info[1], //Row-Lable
        objSeat: {}
      };
      var seat = info[3].split('|');
      var seatEle = row[info[0]].objSeat;
      var id = decodeSeatStatus(type, seat, seatEle);
      if (id > maxSeatId) {
        maxSeatId = id;
      }
    }
    lay.intMaxSeatId = maxSeatId;
    res[r].layout = lay;
  }
}

function reverseAdaptor(res) {
  for (var i in res) {
    if (!res[i].layout) {
      continue;
    }
    res[i].free_seating = findSeating(res[i].seat_category_map, 1);
    res[i].layout.objArea = _.values(res[i].layout.objArea);
    var area = res[i].layout.objArea;
    for (var j in area) {
      area[j].objRow = _.values(area[j].objRow);
      var row = area[j].objRow;
      for (var k in row) {
        row[k].objSeat = _.values(row[k].objSeat);
      }
    }
  }
  return res;
}

function findSeating(opt, type) {
  var data;

  if (!type) {
    data = decodeCategory(opt);
  } else {
    data = opt;
  }
  var a = 0;
  var len = Object.keys(data).length;
  for (var i in data) {
    a = a + data[i].free_seating;
  }

  if (!a) {
    return 0;
  } else if (a === len) {
    return 1;
  } else {
    return 2;
  }

}


/*
 * Fetch inventory as per session_instance_id from booking table
 */
// function fetchInventory(data, icb) {
function fetchInventory(opt, cb) {
  return base.select(opt).then((res) => {
    if (res.__ndf && res.message === 'No Data Found') {
      res.result = {};
    } else if (res.error) {
      return cb(res);
    }

    res = res.result;
    var result = [];
    for (var i in res) {

      if (parseInt(res[i].status) != 2 && parseInt(res[i].status) != 4 && parseInt(res[i].status) != 9) {
        /*filter seats which are in state other than block/book*/
        continue;
      }
      var s = res[i].seat_details.split("|")[0].split(";");
      for (var j in s) {
        var temp = {
          seat_code: s[j]
        };
        if (parseInt(res[i].status) == 9) {
          temp.tele_book_no = res[i].tele_book_no;
        }
        result.push(temp);
      }
    }
    return cb(result);
  }).catch((error) => { cb(error) });
}

/* Combine seat_layout and inevntory result to get final seat_layout for sessions*/
function combineLayoutAndInventory(seat_layout, inventory) {
  // if (err || seat_layout.length === 0) {
  //   return cb(err || "No data found");
  // }
  var layout = seat_layout[0].layout;
  var seat_category_map = seat_layout[0].seat_category_map;

  if (inventory) {
    for (var i in inventory) {
      var seat = inventory[i].seat_code.split("-");
      // var catg = seat[0];
      /*Need to Combine inventory only if seat_category when free_seating, not accessing seat_availability*/
      // if (!seat_category_map[seat[0]].free_seating) {
      layout.objArea[seat[0]].objRow[seat[1]].objSeat[seat[2]].SeatStatus = userStatus.NOT_AVAILABLE;
      if (inventory[i].tele_book_no) {
        // append tele_book_no to seat layout, if so.
        layout.objArea[seat[0]].objRow[seat[1]].objSeat[seat[2]].SeatStatus = userStatus.TELEBLOCK;
        layout.objArea[seat[0]].objRow[seat[1]].objSeat[seat[2]].tele_book_no = inventory[i].tele_book_no;
      }
      // }
    }
  }

  return {
    layout: layout,
    seat_category_map: seat_category_map
  };
}
