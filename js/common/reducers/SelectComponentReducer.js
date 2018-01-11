// @flow
import {OPTIONLISTDATA, TOGGLEDATA} from '../../utils/constants';

export default function dropDownData(state = [], action = {}) {  	
	switch (action.type) {
	    case OPTIONLISTDATA:
	      return action.payload;
	    case TOGGLEDATA:
	      return action.payload;  	    
	    default:
	      return state;
	  }      
}
