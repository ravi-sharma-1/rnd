
import { UPDATELOGININFO, LOGOUT } from '../constants/AppConstants';
import { setItemInLocalStorage, getItemFromLocalStorage } from '../utils/utils';

const initialState = {
    loggedIn: getItemFromLocalStorage('isLoggedIn') || false,
    userData: getItemFromLocalStorage('userData') || {}
};

export default function loginReducer(state =initialState, action = {}) {
  let newState = {};
  switch (action.type) {
    case UPDATELOGININFO:
        setItemInLocalStorage('isLoggedIn', true);
        setItemInLocalStorage('userData', action.payload);
      newState = {
        loggedIn: true,
        userData: action.payload
      };
      break;
    case LOGOUT:
        setItemInLocalStorage('isLoggedIn', false);   // Not removing user data after login because we need to sync data even after logout
      newState = {
          loggedIn: false,
          userData: action.payload
      };
      break;
    default:
      newState = state;
  }
  return newState;
}
