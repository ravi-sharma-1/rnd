/*
 * The reducer takes care of our data
 * Using actions, we can change our application state
 * To add a new action, add it to the switch statement in the homeReducer function
 *
 * Example:
 * case YOUR_ACTION_CONSTANT:
 *   return assign({}, state, {
 *       stateVariable: action.var
 *   });
 */

import { CHANGETAB } from '../constants/AppConstants';
// Object.assign is not yet fully supported in all browsers, so we fallback to
// a polyfill

// The initial application state
// The initial application state
const initialState = {
    currentTab:''
};
// Takes care of changing the application state
export default function headerReducer(state = initialState, action) {
    switch (action.type) {
        case CHANGETAB:
            return action.message;
        default:
            return state;
    }
}
