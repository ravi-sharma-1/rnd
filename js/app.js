/**
 *
 * app.js
 *
 * This is the entry file for the application, mostly just setup and boilerplate
 * code
 *
 */

// Import all the third party stuff
import React from 'react';
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
//import { Router, Route, IndexRoute, browserHistory, hashHistory } from 'react-router';
import { BrowserRouter, Route, Router, Switch } from 'react-router-dom';
import indexReducers from './reducers';
import FontFaceObserver from 'fontfaceobserver';
import './utils/sockets';
import './utils/freeze';
import './utils/backgroundEvents';
import './utils/blockBook';
import './utils/httpCallbacks_rtc';
import './utils/realTimeEvents';
import './utils/logging';
import './utils/validBrowser';
import './utils/realTimeEventCallBack';
import postman from './utils/postman';

// Load the ServiceWorker, the Cache polyfill, the manifest.json file and the .htaccess file
import 'file-loader?name=[name].[ext]!../serviceworker.js';
import 'file-loader?name=[name].[ext]!../serviceworker-cache-polyfill.js';
import 'file-loader?name=[name].[ext]!../.htaccess';
import 'file-loader?name=[name].[ext]!../favicon.ico';
//import 'file-loader?name=[name].[ext]!../favicon.png';



// Import the components used as pages
import HomePage from './components/pages/HomePage.react';
import Login from './components/pages/Login.react';
import App from './components/App.react';

// Import the CSS file, which webpack transfers to the build folder
import './main.scss';
//window.open("http://merchant-dev.paytm.com", "_blank","toolbar=yes,scrollbars=yes,resizable=yes,top=500,left=500,width=4000,height=4000");
postman.subscribe('validBrowser', () => {

    //Check for ServiceWorker support before trying to install it

    function installUninstallServiceWorkerWhileLoading() {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                registration.unregister();
            }
        });
        if ('serviceWorker' in navigator) {
            postman.publish('reloadTriggered');
            // Install ServiceWorker
            navigator.serviceWorker.register('/serviceworker.js').then(() => {
            }).catch((err) => {
                // Installation failed
            });
        } else {
            // No ServiceWorker Support
        }
    }

    installUninstallServiceWorkerWhileLoading();



    // When Open Sans is loaded, add the js-open-sans-loaded class to the body
    // which swaps out the fonts
    const openSansObserver = new FontFaceObserver('Open Sans');

    openSansObserver.load().then(() => {
        document.body.classList.add('js-open-sans-loaded');
    }, (err) => {
        document.body.classList.remove('js-open-sans-loaded');
    });

    // Creates the Redux reducer with the redux-thunk middleware, which allows us
    // to do asynchronous things in the actions
    const createStoreWithMiddleware = compose(applyMiddleware(thunk))(createStore);
    const store = createStoreWithMiddleware(indexReducers, window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());

    // Mostly boilerplate, except for the Routes. These are the pages you can go to,
    // which are all wrapped in the App component, which contains the navigation etc
    ReactDOM.render(
        <Provider store={store}>
            <BrowserRouter>
                <Switch>
                    <Route component={App} />
                    <Route path="/" component={HomePage} />
                </Switch>
            </BrowserRouter>
        </Provider>,
        document.getElementById('app')
    );
});