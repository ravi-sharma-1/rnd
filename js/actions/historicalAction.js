import  { fetch }  from '../utils/fetch';
import {GETSALESHISTORYDATA} from '../utils/constants';
import historyMockData from '../components/HistoricalStatement/historicalAPI.json';
import { getSalesHistory} from '../utils/urls';

export async function getSalesHistoryData(){
  var uri = getSalesHistory;
  return await fetch(uri, {
    method: 'GET'
  });
}
