function concatWithZero(num) {
  num = num.toString();
  if (num.length == 1) {
    return '0' + num;
  } else {
    return num;
  }
}

export function getAMPM(dt) {
  dt = new Date(dt);
  var hours = dt.getHours();
  return (hours >= 12) ? 'PM' : 'AM';
}

function formatDate(dt, yearFlag, timeFlag, fullDateFlag) {
  var date = new Date(dt);
  var monthName = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!yearFlag) {
    return concatWithZero(date.getDate()) + ' ' + monthName[date.getMonth()] + ' ' + date.getFullYear();
  } else if (timeFlag) {
    return concatWithZero(date.getDate()) + ' ' + monthName[date.getMonth()] + ', ' + concatWithZero(date.getHours()) + ':' + concatWithZero(date.getMinutes());
  } else if (fullDateFlag) {
    return concatWithZero(date.getDate()) + ' ' + monthName[date.getMonth()] + ' ' + date.getFullYear() + ', ' + concatWithZero(date.getHours()) + ':' + concatWithZero(date.getMinutes());
  }
  else {
    return concatWithZero(date.getDate()) + ' ' + monthName[date.getMonth()];
  }
}

export function getTimeInHHMM(dt) {
  var date = new Date(dt);
  return concatWithZero(date.getHours()) + ':' + concatWithZero(date.getMinutes());
}


export function findDay(dt) {
  dt = new Date(dt);
  var todayDate = new Date();
  todayDate = todayDate.getDate();
  dt = dt.getDate();
  if (dt == todayDate) {
    return 'Today';
  } else if (dt == todayDate + 1) {
    return 'Tomorrow';
  } else if (dt == todayDate - 1) {
    return 'Yesterday';
  } else {
    return '';
  }
}

export function modifyDateFormateFullDayDt(dt) {
  dt = new Date(dt);
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var monthName = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return days[dt.getDay()] + ', ' + monthName[dt.getMonth()] + ' ' + dt.getDate();
}

export function formateFinalDate(dt) {
  var dtString = formatDate(dt, true, true, false);
  return dtString + ' ' + getAMPM(dt);
}

export function cloneObj(obj) {
  if (null == obj || 'object' != typeof obj) return obj;
  var copy = obj.constructor();
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
  }
  return copy;
}

export function setItemInLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getItemFromLocalStorage(data) {
  let res = localStorage.getItem(data) || '';
  return res && JSON.parse(res);
}

export function setOnlineStatus() {
}

export function getOnlineStatus(data) {
  return data;
}

export function isValidMobileNum(val) {
  // returns true, if val is a valid ten digit number String
  return val && val.length === 10 && /^\b[1-9][0-9]{9}\b$/.test(String(val));
}
