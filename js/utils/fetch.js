
import 'whatwg-fetch';

export const fetch = self.fetch.bind(self);

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }
  //Error handling
    throw response;
}

export const fetchWithError = async(url, params = {}) => {
  //will add successcallback and error callback here
    let response;
    try {
        response = fetch(url, params)
            .then(checkStatus)
            .then(r => r.json());
    } finally {
      //required as we can't add just try block
    }
    return response;
};

export const fetchRetry = async (url, options, count) => {

    let retries = 3;
    let retryDelay = 1000;

    if (options && options.retries) {
        retries = options.retries;
    }

    if (options && options.retryDelay) {
        retryDelay = options.retryDelay;
    }

    return new Promise((resolve, reject) =>{
        let wrappedFetch = (n) => {
            fetch(url, options)
                .then((response) => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response);
                    }else{
                        if (n > 0) {
                            setTimeout(() =>{
                                count(n);
                                wrappedFetch(--n);
                            }, retryDelay);
                        } else {
                            reject(response);
                        }
                    }

                });
        };
        wrappedFetch(retries);
    });
};
