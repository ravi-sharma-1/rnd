// @flow

import {NUMERICCOUNT, FORMITEMS} from '../../constants/AppConstants';
import * as formItems from '../components/FormElements/FormElements.json';


export function getFormItems() {
  return (dispatch: Function) => {
      dispatch({
        type: FORMITEMS,
        payload: formItems
      });
  };
}

export function updateFormData(formItems) {
  return (dispatch: Function) => {
    dispatch({
      type: FORMITEMS,
      payload: formItems
    });
  };
}
