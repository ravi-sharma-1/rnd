// @flow
import { combineReducers } from 'redux';
import { routerReducer as routing } from 'react-router-redux';
import homeReducers from './homeReducers';
import headerReducer from './headerReducer';
import layoutReducer from './layoutReducer';
import loginReducer from './loginReducer';
import formReducer from '../common/reducers/formReducer';
import modalReducer from '../common/reducers/modalReducer';

export default combineReducers({
    routing,
    loginReducer,
    homeReducers,
    headerReducer,
    layoutReducer,
    formReducer,
    modalReducer
});


