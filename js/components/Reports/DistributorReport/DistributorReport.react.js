
import $ from 'jquery';
import React from 'react';
import moment from 'moment';
import { DateRange } from 'react-date-range';
import './DistributorReport.scss';
import IdbRTC from '../../../utils/idb_rtc';
import postman from '../../../utils/postman';
import { sendMessage } from '../../../utils/sockets';
import { getReport } from '../../../actions/reportsActions';

var _this;

class Distributor extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            showDatePicker: false, /* state to show and hide the datepicker */
            selectedStartDate: null, /* selected start date to be sent to BO server */
            selectedEndDate: null, /* selected end date to be sent to BO server */
            allMovies: [], /* This is the lisyt of all movies which we need to show in 'select' */
            allAudis: [], /* This is the list of all the audis that we need to show in 'select'  */
            selectedMovie: '', /* selected movie which will be sent to BO server */
            selectedAudi: '', /* selected audi that we need to send to BO server */
            distributor: '' /* This is the distributor for which reports needs to be generated */
        };
        _this = this;
    }

    openDatePicker() {
        _this.setState({ showDatePicker: true });
    }

    handleSelect(date) {
        _this.setState({
            showDatePicker: false,
            selectedStartDate: date.startDate.format('YYYY-MM-DD'),
            selectedEndDate: date.endDate.format('YYYY-MM-DD')
        });
    }

    clearForm() {
        /* Here we need to clear by setting the state to null or empty */
        _this.setState({
            showDatePicker: false,
            selectedStartDate: null,
            selectedEndDate: null,
            selectedMovie: '',
            selectedAudi: '',
            distributor: ''
        });
    }

    handleUpdateName(event) {
        _this.setState({
            distributor: event.target.value
        });
    }

    generateReport(type) {
        /* If all fields are valid we will make call to actions to get reports */
        _this.allFieldsValid() && getReport(['distributor', _this.state.distributor, _this.state.selectedStartDate, _this.state.selectedEndDate, _this.state.selectedAudi, _this.state.selectedMovie], type);
    }

    allDatesValid() {
        /* Check if dates are not null */
        return _this.state.selectedStartDate !== null && _this.state.selectedEndDate !== null;
    }

    allFieldsValid() {
        /* Check if dates are not null and audi and movie is selected */
        return _this.allDatesValid() && _this.state.selectedMovie !== '' && _this.state.selectedAudi !== '' && _this.state.distributor !== '';
    }

    movieChange(event) {
        _this.setState({ selectedMovie: event.target.value });
    }

    audiChange(event) {
        _this.setState({ selectedAudi: event.target.value });
    }


    componentWillUnmount() {
        this.closeDp.remove();
    }

    /* In this function we get the list of audis and movies of the corresponding cinema */
    componentDidMount() {
        IdbRTC.findAllMovies().then((res) => {
            _this.setState({ allMovies: res });
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
            _this.setState({ allMovies: [] });
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

    render() {
        const { showDatePicker, selectedStartDate, selectedEndDate, allMovies, allAudis, selectedMovie, selectedAudi } = _this.state;
        return (
            <div className='distributorReport'>
                <div>Distributor Report</div>
                <div className='form'>
                    <div className='leftDiv'>
                        <div>Date</div>
                        <div>Audi</div>
                        <div>Movie</div>
                        <div>Distributor Name</div>
                    </div>
                    <div className='rightDiv dateDialog'>
                        <div><input
                            placeholder='Select Date'
                            onClick={() => { _this.openDatePicker(); }}
                            value={_this.allDatesValid() ? `${moment(selectedStartDate).format('LL')} to ${moment(selectedEndDate).format('LL')}` : ''} />

                            <div className='datePicker'>
                                {showDatePicker &&
                                    <DateRange
                                        twoStepChange={true}
                                        onChange={_this.handleSelect}
                                        maxDate={moment().add(6, 'days')}
                                        startDate={selectedStartDate !== null ? moment(selectedStartDate) : moment()}
                                        endDate={selectedEndDate !== null ? moment(selectedEndDate) : moment()} />}
                            </div>
                        </div>
                        <div><select onChange={_this.audiChange}
                            value={selectedAudi}
                            className={selectedAudi === '' ? 'grey' : ''}>
                            <option disabled value=''>Select Audi</option>
                            <option value='all'>All</option>
                            {allAudis && allAudis.length > 0 && allAudis.map((audi, key) => {
                                return (<option key={key} value={audi.id}>{audi.name}</option>);
                            })}
                        </select></div>
                        <div><select onChange={_this.movieChange}
                            value={selectedMovie}
                            className={selectedMovie === '' ? 'grey' : ''}>
                            <option disabled value=''>Select Movie</option>
                            {allMovies && allMovies.length > 0 && allMovies.map((movie, key) => {
                                return (<option key={key} value={movie.id}>{movie.display}</option>);
                            })}
                        </select></div>
                        <div><input value={_this.state.distributor} onChange={_this.handleUpdateName} type="text" placeholder="Distributor Name" /></div>
                    </div>
                    <div className='buttons'>
                        <button className={_this.allFieldsValid() ? 'apply' : 'applyDisabled'}
                            onClick={() => { _this.generateReport('pdf'); }}>Download PDF
                        </button>
                        <button className={_this.allFieldsValid() ? 'apply' : 'applyDisabled'}
                            onClick={() => { _this.generateReport('excel'); }}>Download Excel
                        </button>
                        <button className='clear' onClick={() => { _this.clearForm(); }}>Clear</button>
                    </div>
                </div>
            </div>
        );
    }
}

export default Distributor;