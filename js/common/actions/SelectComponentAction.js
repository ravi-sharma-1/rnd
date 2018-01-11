import {OPTIONLISTDATA, TOGGLEDATA} from '../../utils/constants';

export function getOptionList(dataFromOptList) {
  return (dispatch: Function) => {
      dispatch({
        type: OPTIONLISTDATA,
        payload: dataFromOptList
      });
  };
}

export function toggleDropDown(selectData) {
  return (dispatch: Function) => {
    dispatch({
      type: TOGGLEDATA,
      payload: selectData
    });
  };
}
