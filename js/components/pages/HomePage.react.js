/*
 * HomePage
 *
 * This is the first thing users see of the app
 * Route: /
 *
 */

import React, { Component } from 'react';
import 'whatwg-fetch';
import { connect } from 'react-redux';
import BookTicket from '../BookTickets/BookTicket.react';
import FindBooking from '../FindBooking/FindBooking.react';
import Reports from '../Reports/Reports.react';
import HistoricalStatement from '../HistoricalStatement/HistoricalStatement.react';
import Header from '../Header/Header.react';
import IdbRTC from '../../utils/idb_rtc';
import {setConfigData} from '../../actions/homeActions';
import Loader from '../Loader/Loader.react';

class HomePage extends Component {
	constructor(props, context){
		super(props, context);
		this.state={
			'name':''
		};
	}
	componentDidMount(){
		let dataFromMaster = IdbRTC.findMasterInfo();
		dataFromMaster.then((configData)=>{
			configData = configData.result;
			this.props.setConfigData(configData);
		});
	}

	render() {
		const currentTab = this.props.tabData.headerReducer;
		return (
			<div>
				<Loader/>
				<Header isMaster={this.props.isMaster} statusOnline={this.props.statusOnline}/>
				{currentTab === 'BookTickets' && <BookTicket isMaster={this.props.isMaster}/>}
				{currentTab === 'HistoricalStatement' && <HistoricalStatement isMaster={this.props.isMaster} />}
				{currentTab === 'FindBooking' && <FindBooking isMaster={this.props.isMaster}/>}
				{currentTab === 'Reports' && <Reports isMaster={this.props.isMaster}/>}
			</div>
		);
	}
}

// Which props do we want to inject, given the global state?
function select(state) {
  return {
    tabData: state
  };
}

// Wrap the component to inject dispatch and state into it
export default connect(select, (dispatch) => {
	return{
		setConfigData: (confData) => {
			dispatch(setConfigData(confData));
		}
	};
})(HomePage);
