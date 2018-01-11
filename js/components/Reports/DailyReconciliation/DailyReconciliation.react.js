import $ from 'jquery';
import React from 'react';
import moment from 'moment';
import { DateRange } from 'react-date-range';
import './DailyReconciliation.scss';
import { getReport } from '../../../actions/reportsActions';

var _this;

class Daily extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            showDatePicker: false,
            selectedStartDate: null,
            selectedEndDate: null
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
        _this.setState({ showDatePicker: false, selectedStartDate: null, selectedEndDate: null });
    }

    allDatesValid() {
        /* Check if dates are not null */
        return _this.state.selectedStartDate !== null && _this.state.selectedEndDate !== null;
    }

    generateReport(type) {
        /* Check if the date is selected and get the reports by calling actions */
        this.allDatesValid() && getReport(['daily', _this.state.selectedStartDate, _this.state.selectedEndDate], type);
    }

    componentDidMount() {
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
        const { showDatePicker, selectedStartDate, selectedEndDate, } = _this.state;
        return (
            <div className='dailyReconciliation'>
                <div>Reconciliation Report</div>
                <div className='form'>
                    <div className='leftDiv'>
                        <div>Date</div>
                    </div>
                    <div className='rightDiv dateDialog'>
                        <div>
                            <input
                                placeholder='Select Date'
                                onClick={() => { _this.openDatePicker(); }}
                                value={_this.allDatesValid() ? `${moment(selectedStartDate).format('LL')} to ${moment(selectedEndDate).format('LL')}` : ''} />
                            <div className='datePicker'>
                                {showDatePicker &&
                                    <DateRange twoStepChange={true} onChange={_this.handleSelect} maxDate={moment().add(6, 'days')}
                                        startDate={selectedStartDate !== null ? moment(selectedStartDate) : moment()}
                                        endDate={selectedEndDate !== null ? moment(selectedEndDate) : moment()} />}
                            </div>
                        </div>
                    </div>
                    <div className='buttons'>
                        <button className={this.allDatesValid() ? 'apply' : 'applyDisabled'}
                            onClick={() => { _this.generateReport('pdf'); }}>Download PDF
                        </button>
                        <button className={this.allDatesValid() ? 'apply' : 'applyDisabled'}
                            onClick={() => { _this.generateReport('excel'); }}>Download Excel
                        </button>
                        <button className='clear' onClick={() => { _this.clearForm(); }}>Clear</button>
                    </div>
                </div>
            </div>
        );
    }
}

export default Daily;