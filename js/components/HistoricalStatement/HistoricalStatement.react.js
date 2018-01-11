import React from 'react';
import moment from 'moment';
import { connect } from 'react-redux';
import './HistoricalStatement.scss';
import postman from '../../utils/postman';
import IdbRTC from '../../utils/idb_rtc';
import { sendMessage } from '../../utils/sockets';

let _this;

class HistoricalStatement extends React.Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            datesForFiltering: [], // It will store all the dates that will be visible in the drop down on historical statement screen.
            historicalBookingData: [], // This is the entire data set, for all the dates that are in 'datesForFiltering'. This is basically the unfiltered vesrion.
            filteredData: [], // This is the filtered data that will be visible on the screen depending upon the date selected from dropdown.
            checkedDBForData: false, // This is tha flag that will be true when we have extracted the data from IDB successfully.
            selectedDate: null, // This will hold the currently selected date from dropdown.
            noDataMsg: 'No Data Found !' // This is the custom message that we show when we do not find any data from IDB or there had been some problem extracting data from IDB.
        };
        _this = this; // This is reference tp the class.
        _this.sessionsBookingsMapping = {};
        _this.moviesMapping = {};
    }

    processAllData(values, resolve, reject) {
        if (values.length > 0) {
            let counter = 0, audiObj = {}, movieIDs = new Set(), audiData = values[0], sessionsData = values[1],
                cutOffTime = values[2][0].pos_cutoff_time, historicalBookingData = [], datesForFiltering = new Set();
            (audiData && audiData.length > 0) && (sessionsData && sessionsData.length > 0) ? () => {
            } : reject('Insufficient Data to show report !');
            audiData.map(audi => {
                audiObj[audi.id] = { name: audi.name };
            });
            let priceMappingPromise = new Promise(resolve => {
                let priceMapping = {};
                // Here we will get all the bookings for needed sessions
                let neededSessions = [];
                let neededMovies = new Set();
                sessionsData.map((session) => {
                    neededSessions.push(session.id);
                    neededMovies.add(session.movie_id);
                });
                Promise.all([IdbRTC.getAllNeededMovies(Array.from(neededMovies)), IdbRTC.getAllNeededSessionsBooking(neededSessions)]).then(values => {
                    _this.moviesMapping = values[0];
                    _this.sessionsBookingsMapping = values[1];
                    sessionsData.map((session, sessionIndex) => {
                        this.getPricingDetails(session).then((data) => {
                            priceMapping[session.id] = data;
                            sessionIndex === sessionsData.length - 1 && resolve(priceMapping);
                        }).catch((error) => {
                            postman.publish('showToast', {
                                message: error.message,
                                type: 'error'
                            });
                        });
                    });
                }).catch((error) => {
                    postman.publish('showToast', {
                        message: error.message,
                        type: 'error'
                    });
                });

            });
            priceMappingPromise.then((priceMapping) => {
                sessionsData.map(value => movieIDs.add(value.movie_id));
                movieIDs.forEach(id => {
                    let movie = _this.moviesMapping[id];
                    let relatedSessions = [];
                    sessionsData.map((session, sessionIndex) => {
                        if (session.movie_id === id) {
                            let obj = priceMapping[session.id] || {};
                            obj.date = moment(session.start_date_time).format('LL');
                            obj.start_date_time = session.start_date_time;
                            datesForFiltering.add(obj.date);
                            obj.time = (moment(session.start_date_time).format('h: mm A') +
                                ' - ' + moment(session.start_date_time).add(session.inst_duration, 'm').format('h: mm A'));
                            obj.bookingStatus = moment() > moment(session.start_date_time).add(cutOffTime, 'm') ? 'Closed' : obj.bookingStatus;
                            obj.audi = (audiObj[session.audi_id] && audiObj[session.audi_id].name) || '';
                            relatedSessions.push(obj);
                        }
                    });
                    historicalBookingData.push({
                        id: (movie && movie.id) || null,
                        name: (movie && movie.display) || '',
                        sessions: relatedSessions
                    });
                    resolve({ historicalBookingData, datesForFiltering });
                });
            }).catch((error) => {
                postman.publish('showToast', {
                    message: error.message,
                    type: 'error'
                });
            });
        }
    }

    componentDidMount() {
        // 1. We start the loader till we extract all the data from IDB and process it for display.
        // 2. We make a mega promise that will get us all the sessions, audis and cinema data.
        //3. After this promise is resolved, we check if there are more than 0 audis and sessions, else we reject the promise with ''Insufficient Data to show report !''
        // 4. We iterate through all the audis to make 'audi_id' and 'audi_name' mapping
        // 5. Then we start 'priceMappingPromise', which will provide 'capacity of audi/availability count/sold tickets count/booking status/money collected' for each session by resolving the 'getPricingDetails' function returned promise
        // 6. After 'priceMappingPromise' being resolved. we iterate through all the sessions and add all the movie ids to 'movieIDs' set.
        // 7. After this we map movies with all the related sessions for displaying purpose. pri
        let p = new Promise((resolve, reject) => {
            Promise.all([IdbRTC.findAllAudi(), IdbRTC.findAllSessions(), IdbRTC.getCinemas()]).then(values => {
                this.processAllData(values, resolve, reject);
            }).catch((error) => {
                postman.publish('showToast', {
                    message: error.message,
                    type: 'error'
                });
                this.processAllData([], resolve, reject);
            });
        });
        p.then(historicData => {
            let set = new Set([...(historicData.datesForFiltering)].sort((a, b) => {
                return (moment(new Date(a)) - moment(new Date(b)));
            }));
            historicData.datesForFiltering = [];
            set.forEach((elem) => {
                historicData.datesForFiltering.push({ name: elem, value: elem });
            });
            _this.setState(historicData, () => {
                let isTodaysSession = false;
                _this.state.datesForFiltering.map((date) => {
                    if (date.value === moment().format('LL')) {
                        isTodaysSession = true;
                    }
                });
                _this.filterData(isTodaysSession ? moment().format('LL') : _this.state.datesForFiltering[0].value);
            });
        }).catch((error) => {
            _this.setState({ noDataMsg: error, checkedDBForData: true });
        });
    }

    // This function returns a promise that will fulfill to return the capacity of audi/availability count/sold tickets count/booking status/money collected for the session provided as a parameter
    getPricingDetails(session) {
        return new Promise((resolve) => {
            let capacity = 0, moneyCollected = 0, available = 0, bookingStatus = 'Opened', sold = 0, occupancy = '', bookingType = '', categoryPriceMap = {}, ticketsPrinted = 0, ticketsCancelled = 0;
            // array of categories in session is iterated to extract the total seats count in category and make a price mapping for each category. this price mapping is stored in 'categoryPriceMap' object.
            session.categories.map((category) => {
                capacity = capacity + category.total_count;
                categoryPriceMap[category.seat_category] = category;
            });
            // All the bookings for that session is extracted here.
            let bookingData = _this.sessionsBookingsMapping[session.id].result;
            // Iterating through all the bookings found for session
            bookingData.map((booking) => {
                // Considering only booked seats and not blocked seats and hence status check '4'
                if (booking.status === 4) {
                    // This will get the category from the booking
                    let category = booking.seat_details.split('-')[0];
                    // Increasing the sold tickets by seats sold in the booking.
                    sold = sold + booking.seat_count;
                    // Increasing the printed tickets by seats sold in the booking.
                    ticketsPrinted = ticketsPrinted + Number(booking.print_status) * Number(booking.seat_count);
                    // booking type will tell us the number of normal / defence/ complementary tickets + if 3D charges are appliciable or not.
                    bookingType = booking.booking_type || String(booking.seat_count) + '-0-0-2D';
                    // On parsing the booking type we get the ticket count for normal/defence/complementary and hence adding that into the money collected
                    moneyCollected = moneyCollected
                        + (Number(bookingType.split('-')[0]) * (categoryPriceMap[category].price + categoryPriceMap[category].cgst + categoryPriceMap[category].sgst + categoryPriceMap[category].l_tax)) // For normal customer, price details are extracted from 'categoryPriceMap' object => price + e_tax + other_charges.
                        + (Number(bookingType.split('-')[1]) * (categoryPriceMap[category].defence_nett + categoryPriceMap[category].defence_cgst + categoryPriceMap[category].defence_sgst + categoryPriceMap[category].defence_ltax)) // For defence customer, price details are extracted from 'categoryPriceMap' object => defence_nett + defence_etax + other_charges.
                        + (Number(bookingType.split('-')[2]) * (categoryPriceMap[category].comp_nett + categoryPriceMap[category].comp_cgst + categoryPriceMap[category].comp_sgst + categoryPriceMap[category].comp_ltax))// For defence customer, price details are extracted from 'categoryPriceMap' object => comp_nett + comp_etax + other_charges.
                        + (bookingType.split('-')[3] === '3D' ? booking.seat_count * (categoryPriceMap[category]['3D_nett'] + categoryPriceMap[category]['3D_cgst'] + categoryPriceMap[category]['3D_sgst'] + categoryPriceMap[category]['3D_ltax']) : 0); // If movie is 3D then we add 3D charges for all type of customers.
                } else if (booking.status === 64) {
                    ticketsCancelled = ticketsCancelled + Number(booking.seat_count);
                }
            });
            // Available seats are total seats - sold tickets
            available = capacity - sold;
            // Occupancy is calculated in %age
            occupancy = (((sold / capacity) * 100).toFixed(2) + '%');
            // If all seats are booked then status becomes 'sold out' else it's 'Opened'.
            bookingStatus = available ? 'Opened' : 'Sold Out';
            moneyCollected = moneyCollected.toFixed(2);
            // This promise returned through this function returns the 'capacity, sold, available, occupancy, bookingStatus, moneyCollected'.
            resolve({ capacity, sold, available, occupancy, bookingStatus, moneyCollected, ticketsPrinted, ticketsCancelled });

        });
    }

    // This function filters out the data from entire set depending upon the selected date from dropdown.
    filterData(selectedDate) {
        _this.setState({ selectedDate });
        // Stringifying to make a clone of super data set i.e. '_this.state.historicalBookingData'.
        let filteredData = JSON.parse(JSON.stringify(_this.state.historicalBookingData));
        filteredData.map((value) => {
            for (let i = value.sessions.length - 1; i >= 0; i--) {
                // This is the logic for filtering through date.
                if (value.sessions[i].date !== selectedDate) {
                    value.sessions.splice(i, 1);
                }
            }
            // This is the sorting logic for sessions displayed. This is according to the session start date time. earlier the session, above in sorting.
            value.sessions.sort((a, b) => {
                return moment(a.start_date_time) - moment(b.start_date_time);
            });
        });
        // This is the sorting logic for filteredData, if a movie has more number of sessions it will come before than the movie having less number of sessions, and the sessions inside the movie will be sorted by start_date_time ( for this logic is written just above)
        filteredData = JSON.parse(JSON.stringify(filteredData)).sort((a, b) => {
            return a.sessions.length !== b.sessions.length ? b.sessions.length - a.sessions.length : a.name.toUpperCase() - b.name.toUpperCase();
        });
        _this.setState({ filteredData, checkedDBForData: true });
    }

    render() {
        return (
            <div className='historicalStatement'>
                {_this.state.datesForFiltering && _this.state.datesForFiltering.length > 0 &&
                    <span className='dateFilter'>
                        Date : <select value={_this.state.selectedDate}
                            onChange={(event) => { _this.filterData(event.target.value); }}>
                            {_this.state.datesForFiltering.map((date, idx) => {
                                return (<option key={idx} value={date.name}>{date.value}</option>);
                            })}
                        </select>
                    </span>
                }
                {
                    <div className='filteredData'>
                        {
                            _this.state.filteredData && _this.state.filteredData.length > 0 &&
                            _this.state.filteredData.map((movie, movieIndex) => {
                                return (
                                    <div key={movieIndex} className='rowsGroup'>
                                        {movieIndex === 0 &&
                                            <div className='headerRow'>
                                                <div className='headerCell'>S.No</div>
                                                <div className='headerCell'>Time</div>
                                                <div className='headerCell'>Audi</div>
                                                <div className='headerCell'>Booking Status</div>
                                                <div className='headerCell'>Capacity</div>
                                                <div className='headerCell'>Sold</div>
                                                <div className='headerCell'>Printed</div>
                                                <div className='headerCell'>Cancelled</div>
                                                <div className='headerCell'>Available</div>
                                                <div className='headerCell'>Occupancy</div>
                                                <div className='headerCell'>Money Collected</div>
                                            </div>
                                        }
                                        <div className='dataRow movie'>
                                            {movie.sessions && movie.sessions.length > 0 &&
                                                <div className='dataCell'>{movie.name}</div>}
                                        </div>
                                        {movie.sessions.map((session, sessionIndex) => {
                                            return (
                                                <div key={sessionIndex}
                                                    className={sessionIndex === 0 ? 'dataRow topBorder' : 'dataRow'}>
                                                    <div className='dataCell'>{sessionIndex + 1}</div>
                                                    <div className='dataCell'>{session.time}</div>
                                                    <div className='dataCell'>{session.audi}</div>
                                                    <div className='dataCell'>{session.bookingStatus}</div>
                                                    <div className='dataCell'>{session.capacity}</div>
                                                    <div className='dataCell'>{session.sold}</div>
                                                    <div className='dataCell'>{session.ticketsPrinted}</div>
                                                    <div className='dataCell'>{session.ticketsCancelled}</div>
                                                    <div className='dataCell'>{session.available}</div>
                                                    <div className='dataCell'>{session.occupancy}</div>
                                                    <div className='dataCell'>{session.moneyCollected}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })
                        }
                    </div>
                }
                {_this.state.checkedDBForData && _this.state.filteredData && _this.state.filteredData.length === 0 &&
                    <div className='noDataFound'>{_this.state.noDataMsg}</div>
                }
            </div>
        );
    }
}

export default HistoricalStatement;