import * as errorMessages  from '../constants/MessageConstants';

/**
 * Logs the current user out
 */
import { CHANGETAB } from '../constants/AppConstants';
export function switchTab(tabs) {
    return dispatch => {
        dispatch({ type: CHANGETAB, message: tabs });
    };
}
