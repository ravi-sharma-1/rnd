import $ from 'jquery';
import _ from 'lodash';
import React from 'react';
import moment from 'moment';
import { Calendar } from 'react-date-range';
import './QuickReport.scss';
import IdbRTC from '../../../utils/idb_rtc';
import { getReport } from '../../../actions/reportsActions';
import { getItemFromLocalStorage } from '../../../utils/utils';

var _this, allSessions = [];
let paymentCashmode = 2;

class Quick extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            showDatePicker: false, /* state to show and hide the datepicker */
            selectedDate: null, /* selected date to be sent to BO server */
            selectedDateSessions: [], /* This is the list of all sessions which we need to show in 'select' */
            allAudis: [], /* This is the list of all the audis that we need to show in 'select'  */
            selectedSession: '', /* selected session which will be sent to BO server */
            selectedAudi: '', /* selected audi that we need to send to BO server */
            users: {},
            totalOnlineSeats: 0,
            totalOnlineCashSeats: 0,
            showReport: false,
            categories: {},
            catWiseTotal: 0,
            catWiseGross: 0,
            catWiseNett: 0,
            grossParams: ['price', 'cgst', 'sgst', 'ltax', '3D_cgst', '3D_ltax', '3D_nett', '3D_sgst'],
            report: {
                'textAlign': 'center',
                border: '1px solid grey',
                padding: '20px'
            },
            flex: { display: 'flex' },
            header: {
                'fontWeight': 'bold',
                'borderBottom': '1px solid',
                'marginTop': '10px',
                display: 'inline-block'
            },
            flexP: { width: '30%' },
            boldFont: {
                'fontWeight': 'bold'
            }
        };
        _this = this;
    }

    componentWillMount() {
        IdbRTC.getCinemas().then(cinemaDetails => {
            _this.setState({
                cinemaDetails: cinemaDetails.length > 0 ? cinemaDetails[0] : {}
            });
        });

        IdbRTC.getUsers().then(userDetails => {
            _this.setState({
                userDetails: userDetails.result
            });
        });
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
            showReport: false,
            selectedDateSessions: []
        });
    }

    generateReport() {
        let users = {}, totalOnlineSeats = 0, totalOnlineCashSeats = 0;
        let { categories } = _this.state;
        let catWiseTotal = 0, catWiseNett = 0, catWiseGross = 0;
        if (_this.allFieldsValid()) {
            IdbRTC.getBookingsBySessions(_this.state.selectedSession).then(function (res) {
                res.result.map(function (booking) {
                    let user = _this.state.userDetails.filter(function (user) { return user.id == booking.pos_user_id; });
                    let seatDetails = booking.seat_details.split('|');
                    if (seatDetails && seatDetails.length) {
                        let catName = seatDetails[0].split(';');
                        for (let j = 0; j < catName.length; j++) {
                            let cat = catName[j].split('-')[0];
                            if (categories[cat]) {
                                categories[cat].seats++;
                                catWiseTotal++;
                                catWiseNett += categories[cat].net;
                                catWiseGross += categories[cat].gross;
                                if (!booking.isOnline) {
                                    if (booking.payment_mode == paymentCashmode) {
                                        totalOnlineCashSeats += categories[cat].net;
                                    }
                                    totalOnlineSeats += categories[cat].net;
                                } else {
                                    if (users[booking.pos_user_id]) {
                                        users[booking.pos_user_id].seats += categories[cat].net;
                                        if (booking.payment_mode == paymentCashmode) {
                                            users[booking.pos_user_id].cash += categories[cat].net;
                                        }
                                    } else {
                                        users[booking.pos_user_id] = {
                                            seats: categories[cat].gross,
                                            name: user && user.length ? user[0].username : '',
                                            cash: 0
                                        };
                                        if (booking.payment_mode == paymentCashmode) {
                                            users[booking.pos_user_id].cash = categories[cat].net;
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                _this.setState({ users, totalOnlineSeats, totalOnlineCashSeats, showReport: true, categories, catWiseTotal, catWiseNett, catWiseGross });
            });
        }
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
        let selectedSession = event.target.value;
        let categories = _this.state.categories;
        IdbRTC.findSessionDetails(parseInt(selectedSession)).then(function (session) {
            session.categories.map(function (cat) {
                categories[cat.seat_category] = {
                    name: cat.seat_category,
                    id: cat.id,
                    seats: 0,
                    net: cat.price,
                    gross: _this.state.grossParams.reduce(function (total, param) {
                        return total + (cat[param] ? cat[param] : 0);
                    }, 0)
                };
            });
            IdbRTC.findMovieDetails(session.movie_id).then(function (movie) {
                _this.setState({ selectedSession, categories, selectedMovie: movie, selectedSessionDetails: session });
            });
        });
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
        });

        IdbRTC.findAudiDetails().then((res) => {
            _this.setState({ allAudis: res });
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

    print() {
        var content = document.getElementById('ticket');
        var pri = document.getElementById('ticketcontentstoprint').contentWindow;
        pri.document.open();
        pri.document.write(content.innerHTML);
        pri.focus();
        pri.print();
        pri.document.close();
    }

    render() {
        let framestyle = {
            height: '0px',
            width: '0px',
            position: 'absolute',
            visibility: 'hidden'
        };
        let { report, flexP, flex, boldFont, header } = _this.state;

        let totalCashSales = 0, totalSales = 0;
        const { showDatePicker, selectedDate, selectedDateSessions, allAudis, selectedSession, selectedAudi } = _this.state;
        _.map(_this.state.users, function (user) {
            totalSales += user.seats;
            totalCashSales += user.cash;
        });
        return (
            <div className='quickReport'>
                <div>Quick Report</div>
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
                            onClick={() => { _this.generateReport(); }}>View
                        </button>
                        <button className={_this.state.showReport ? 'apply' : 'applyDisabled'}
                            onClick={() => { _this.print(); }}>Print
                        </button>
                        <button className='clear' onClick={() => { _this.clearForm(); }}>Clear</button>
                    </div>
                </div>
                <iframe id="ticketcontentstoprint" style={framestyle}></iframe>
                <div id="ticket">
                    {_this.state.showReport && <div className='report' style={{
                        'textAlign': 'center',
                        border: '1px solid grey',
                        padding: '20px',
                        position: 'relative'
                    }}>
                        <header style={{
                            'fontWeight': 'bold',
                            'borderBottom': '1px solid',
                            'marginTop': '10px',
                            display: 'inline-block'
                        }}>Quick Report: {_this.state.cinemaDetails ? _this.state.cinemaDetails.name : ''}</header>
                        <div>
                            <p>{_this.state.selectedMovie ? _this.state.selectedMovie.title : ''}</p>
                            <p>{_this.state.selectedSessionDetails ? new Date(_this.state.selectedSessionDetails.start_date_time).toLocaleString() : ''}</p>
                        </div>
                        <div>
                            <header style={{
                                'fontWeight': 'bold',
                                'borderBottom': '1px solid',
                                'marginTop': '10px',
                                display: 'inline-block'
                            }}>Reconciliation Report</header>
                            <div>
                                <div className='flex boldFont' style={{ display: 'flex', fontWeight: 'bold' }}>
                                    <p style={{ width: '30%' }}>User</p>
                                    <p style={{ width: '30%' }}>Cash Collected</p>
                                    <p style={{ width: '30%' }}>Total</p>
                                </div>
                                {_.map(_this.state.users, function (user) {
                                    return (<div className='flex' style={{ display: 'flex' }}>
                                        <p style={{ width: '30%' }}>{user.name}</p>
                                        <p style={{ width: '30%' }}>{user.cash}</p>
                                        <p style={{ width: '30%' }}>{user.seats}</p>
                                    </div>);
                                })
                                }
                            </div>
                            <div className='flex' style={{ display: 'flex', borderTop: '1px dotted' }}>
                                <p style={{ width: '30%' }}>Pos Sales</p>
                                <p style={{ width: '30%' }}>{totalCashSales}</p>
                                <p style={{ width: '30%' }}>{totalSales}</p>
                            </div>
                            <div className='flex' style={{ display: 'flex', borderTop: '1px dotted' }}>
                                <p style={{ width: '30%' }}>Online Sales</p>
                                <p style={{ width: '30%' }}>{_this.state.totalOnlineCashSeats}</p>
                                <p style={{ width: '30%' }}>{_this.state.totalOnlineSeats}</p>
                            </div>
                            <div className='flex' style={{ display: 'flex', borderTop: '1px dotted' }}>
                                <p style={{ width: '30%' }}>Total Sales</p>
                                <p style={{ width: '30%' }}>{_this.state.totalOnlineCashSeats + totalCashSales}</p>
                                <p style={{ width: '30%' }}>{_this.state.totalOnlineSeats + totalSales}</p>
                            </div>
                        </div>
                        <div>
                            <header style={{
                                'fontWeight': 'bold',
                                'borderBottom': '1px solid',
                                'marginTop': '10px',
                                display: 'inline-block'
                            }}>Distributor Report</header>
                            <div>
                                <div className='flex boldFont' style={{ display: 'flex' }}>
                                    <p style={{ width: '30%' }}>Category</p>
                                    <p style={{ width: '30%' }}>Seats</p>
                                    <p style={{ width: '30%' }}>Gross</p>
                                    <p style={{ width: '30%' }}>Nett</p>
                                </div>
                                {_.map(_this.state.categories, function (cat) {
                                    return (<div className='flex' style={{ display: 'flex' }}>
                                        <p style={{ width: '30%' }}>{cat.name}</p>
                                        <p style={{ width: '30%' }}>{cat.seats}</p>
                                        <p style={{ width: '30%' }}>{cat.seats * cat.gross}</p>
                                        <p style={{ width: '30%' }}>{cat.seats * cat.net}</p>
                                    </div>);
                                })
                                }
                                <div className='flex' style={{ display: 'flex', borderTop: '1px dotted' }}>
                                    <p style={{ width: '30%' }}>Total Sales</p>
                                    <p style={{ width: '30%' }}>{_this.state.catWiseTotal}</p>
                                    <p style={{ width: '30%' }}>{_this.state.catWiseGross}</p>
                                    <p style={{ width: '30%' }}>{_this.state.catWiseNett}</p>
                                </div>
                            </div>
                        </div>
                        <div className='footer'>
                            <p style={{ borderBottom: '1px dotted' }}>Note: Nett = Gross Total - 3D - Maintenance Charges - GST on ticket, 3d and MC</p>
                            <p>
                                Printed By: {`${getItemFromLocalStorage('userData') ? getItemFromLocalStorage('userData').username : ''}, ${new Date().toLocaleString()}`}
                            </p>
                        </div>
                    </div>}
                </div>
            </div>
        );
    }
}

export default Quick;