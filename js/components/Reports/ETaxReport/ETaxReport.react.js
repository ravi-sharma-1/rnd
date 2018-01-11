import $ from 'jquery';
import React from 'react';
import moment from 'moment';
import { Calendar } from 'react-date-range';
import './ETaxReport.scss';
import IdbRTC from '../../../utils/idb_rtc';
import postman from '../../../utils/postman';
import { sendMessage } from '../../../utils/sockets';
import { getReport } from '../../../actions/reportsActions';

var _this, allSessions = [];

class ETaxReport extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            showDatePicker: false, /* state to show and hide the datepicker */
            selectedDate: null, /* selected date to be sent to BO server */
            selectedDateSessions: [], /* This is the list of all sessions which we need to show in 'select' */
            allAudis: [], /* This is the list of all the audis that we need to show in 'select'  */
            selectedSession: '', /* selected session which will be sent to BO server */
            selectedAudi: '' /* selected audi that we need to send to BO server */
        };
        _this = this;
    }

    openDatePicker() {
        _this.setState({ showDatePicker: true });
    }

    handleSelect(date) {
        _this.setState({
            showDatePicker: false,
            selectedDate: date.format('YYYY-MM-DD')
        }, () => {
            _this.filterSessionsForDisplay();
        });
    }

    clearForm() {
        /* Here we need to clear by setting the state to null or empty */
        _this.setState({
            showDatePicker: false,
            selectedDate: null,
            selectedSession: '',
            selectedAudi: '',
            selectedDateSessions: []
        });
    }

    generateReport() {
        /* If all fields are valid we will make call to actions to get reports */
        _this.allFieldsValid() && getReport(['etax', _this.state.selectedDate, _this.state.selectedAudi, _this.state.selectedSession]);
    }

    allDatesValid() {
        /* Check if dates are not null */
        return _this.state.selectedDate !== null;
    }

    allFieldsValid() {
        /* Check if dates are not null and audi and session is selected */
        return _this.allDatesValid() && _this.state.selectedSession !== '' && _this.state.selectedAudi !== '';
    }

    sessionChange(event) {
        _this.setState({ selectedSession: event.target.value });
    }

    audiChange(event) {
        _this.setState({ selectedAudi: event.target.value }, () => {
            _this.filterSessionsForDisplay();
        });
    }

    filterSessionsForDisplay() {
        let { selectedDate, selectedAudi, selectedSession } = _this.state;
        let sessionForDisplay = [];
        allSessions.map((session) => {
            if (!((selectedDate && moment(session.start_date_time).format('YYYY-MM-DD') !== moment(selectedDate).format('YYYY-MM-DD')) ||
                (selectedAudi && Number(selectedAudi) !== Number(session.audi_id)))) {
                sessionForDisplay.push(session);
            }
        });
        sessionForDisplay.sort((a, b) => {
            return new Date(a.start_date_time) - new Date(b.start_date_time);
        });
        _this.setState({ selectedDateSessions: sessionForDisplay, selectedSession: sessionForDisplay.length === 0 ? '' : selectedSession });
    }

    /* In this function we get the list of audis and sessions of the corresponding cinema */
    componentDidMount() {
        allSessions = [];
        IdbRTC.findAllSessions().then((res) => {
            Object.keys(res).map(function (key) {
                allSessions.push(res[key]);
            });
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
        });

        IdbRTC.findAudiDetails().then((res) => {
            _this.setState({ allAudis: res });
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
            _this.setState({ allAudis: [] });
        });

        this.closeDp = $(document).click((event) => {
            if (!$(event.target).closest('.dateDialog').length) {
                _this.setState({ showDatePicker: false });
            }
        });
    }

    componentWillUnmount() {
        this.closeDp.remove();
    }

    render() {
        const { showDatePicker, selectedDate, selectedDateSessions, allAudis, selectedSession, selectedAudi } = _this.state;
        return (
            <div className='eTaxReport'>
                <div>Entertainment Tax Report</div>
                <div className='form'>
                    <div className='leftDiv'>
                        <div>Date</div>
                        <div>Audi</div>
                        <div>Session</div>
                    </div>
                    <div className='rightDiv dateDialog'>
                        <div>
                            <input
                                placeholder='Select Date'
                                onClick={() => { _this.openDatePicker(); }}
                                value={_this.allDatesValid() ? `${moment(selectedDate).format('LL')}` : ''} />
                        </div>
                        <div className='datePicker'>
                            {showDatePicker &&
                                <Calendar onChange={_this.handleSelect}
                                    date={selectedDate !== null ? moment(selectedDate) : moment()} />}
                        </div>
                        <div>
                            <select onChange={_this.audiChange}
                                value={selectedAudi}
                                className={selectedAudi === '' ? 'grey' : ''}>
                                <option disabled value=''>Select Audi</option>
                                {allAudis && allAudis.length > 0 && allAudis.map((audi, key) => {
                                    return (<option key={key} value={audi.id}>{audi.name}</option>);
                                })}
                            </select>
                        </div>
                        <div>
                            <select onChange={_this.sessionChange}
                                value={selectedSession}
                                className={selectedSession === '' ? 'grey' : ''}>
                                <option disabled value=''>Select Session</option>
                                {selectedDateSessions && selectedDateSessions.length > 0 && selectedDateSessions.map((session, key) => {
                                    return (<option key={key}
                                        value={session.id}>{`Show ${key + 1} ( ${moment(session.start_date_time).format('h:mm A')} )`}</option>);
                                })}
                            </select>
                        </div>
                    </div>
                    <div className='buttons'>
                        <button className={_this.allFieldsValid() ? 'apply' : 'applyDisabled'}
                            onClick={() => { _this.generateReport(); }}>Apply
                        </button>
                        <button className='clear' onClick={() => { _this.clearForm(); }}>Clear</button>
                    </div>
                </div>
            </div>
        );
    }
}

export default ETaxReport;