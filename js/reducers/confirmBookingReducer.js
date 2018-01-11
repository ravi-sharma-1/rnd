// @flow
import {CONFIRMBOOKING} from '../utils/constants';

export function confirmBooking(state = [], action = {}) {
  switch (action.type) {
    case CONFIRMBOOKING:
      return action.payload;
    default:
      return state;
  }
}
