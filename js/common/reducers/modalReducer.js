// @flow
import { MODALACTION } from '../../utils/constants';

export default function showModal(state = [], action = {}) {  	
	switch (action.type) {
	    case MODALACTION:
	      return action.payload;	        
	    default:
	      return state;
	  }      
}
