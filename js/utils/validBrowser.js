import postman from './postman';

function isChrome() {
    let isChromium = window.chrome,
        winNav = window.navigator,
        vendorName = winNav.vendor,
        isOpera = winNav.userAgent.indexOf('OPR') > -1,
        isIEedge = winNav.userAgent.indexOf('Edge') > -1,
        isIOSChrome = winNav.userAgent.match('CriOS');
    return isIOSChrome || (isChromium !== null && isChromium !== undefined && vendorName === 'Google Inc.' && isOpera == false && isIEedge == false);
}

function retry(isDone, next) {
    let current_trial = 0, max_retry = 50, is_timeout = false;
    var id = window.setInterval(
        () => {
            if (isDone()) {
                window.clearInterval(id);
                next(is_timeout);
            }
            if (current_trial++ > max_retry) {
                window.clearInterval(id);
                is_timeout = true;
                next(is_timeout);
            }
        },
        10
    );
}

function isIE10OrLater(user_agent) {
    var ua = user_agent.toLowerCase();
    if (ua.indexOf('msie') === 0 && ua.indexOf('trident') === 0) {
        return false;
    }
    var match = /(?:msie|rv:)\s?([\d\.]+)/.exec(ua);
    return Boolean((match && parseInt(match[1], 10) >= 10));

}

function detectPrivateMode(callback) {
    var is_private;

    if (window.webkitRequestFileSystem) {
        window.webkitRequestFileSystem(
            window.TEMPORARY, 1,
            function () {
                is_private = false;
            },
            function () {
                is_private = true;
            }
        );
    } else if (window.indexedDB && /Firefox/.test(window.navigator.userAgent)) {
        var db;
        try {
            db = window.indexedDB.open('test');
        } catch (e) {
            is_private = true;
        }

        if (typeof is_private === 'undefined') {
            retry(
                function isDone() {
                    return db.readyState === 'done';
                },
                function next(is_timeout) {
                    if (!is_timeout) {
                        is_private = db.result ? false : true;
                    }
                }
            );
        }
    } else if (isIE10OrLater(window.navigator.userAgent)) {
        is_private = false;
        try {
            if (!window.indexedDB) {
                is_private = true;
            }
        } catch (e) {
            is_private = true;
        }
    } else if (window.localStorage && /Safari/.test(window.navigator.userAgent)) {
        try {
            window.localStorage.setItem('test', 1);
        } catch (e) {
            is_private = true;
        }

        if (typeof is_private === 'undefined') {
            is_private = false;
            window.localStorage.removeItem('test');
        }
    }

    retry(
        function isDone() {
            return typeof is_private !== 'undefined';
        },
        function next() {
            callback(is_private);
        }
    );
}

if (!isChrome()) {
    document.getElementById('browserNotSupported').appendChild(document.createTextNode('This browser is not currently supported. Please use Chrome to access this site.'));
} else {
    detectPrivateMode(
        (is_private) => {
            let result = typeof is_private === 'undefined' ? 'cannot detect' : is_private ? 'private' : 'not private';
            if (result === 'private') {
                document.getElementById('browserNotSupported').appendChild(document.createTextNode('This is an incognito or private window. Please switch to normal window to continue.'));
            } else {
                postman.publish('validBrowser');
            }
        }
    );
}