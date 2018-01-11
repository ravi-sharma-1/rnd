// @flow

import { MODALACTION } from '../../constants/AppConstants';


export function handleModalAction(showModal) {
  return (dispatch: Function) => {
      dispatch({
        type: MODALACTION,
        payload: showModal
      });
  };
}