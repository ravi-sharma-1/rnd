import {GOTAPIDATA}  from '../constants/MessageConstants';
import {fetchRetry} from '../utils/fetch';
import postman from '../utils/postman';
import {serverLogging, clientLogging} from '../../js/utils/logging';

/**
 * Logs the current user out
 */
import { CONFIGINFO } from '../constants/AppConstants';
export function setConfigData(msg) {
  return dispatch => {
    dispatch({ type: CONFIGINFO, message: msg });
  };
}


/*export async function sendAllAffectedSession(obj) {
  return await fetchRetry(sendAffectedSession, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(obj)
  }, function(count){
      if(count==1){
        localStorage.setItem("affectedInstances","");
        postman.publish("SessionSyncUpdated");
      }
  });
}*/
//
// export async function updateAffectedSession(affectedSess){
//   return await new Promise((resolve) => {
//     closingReport.init_inst_report(affectedSess, function(data){
//       resolve(data);
//     });
//   });
// }


