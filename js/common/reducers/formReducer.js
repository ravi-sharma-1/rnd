// @flow
import {NUMERICCOUNT, FORMITEMS} from '../../utils/constants';

export default function formReducer(state = [], action = {}) {  	
	switch (action.type) {
	    case NUMERICCOUNT:
	      return action.payload;
	    case FORMITEMS:
	      return action.payload;  	    
	    default:
	      return state;
	  }      
}
