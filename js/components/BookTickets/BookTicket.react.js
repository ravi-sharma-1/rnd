import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import { connect } from 'react-redux';
import React, { Component } from 'react';
import './BookTicket.scss';
import Clock from './Clock.react';
import IdbRTC from '../../utils/idb_rtc';
import postman from '../../utils/postman';
import Layout from '../Layout/Layout.react';
import MovieDetails from './MovieDetails.react';
import { sendMessage } from '../../utils/sockets';
import { serverLogging, clientLogging } from '../../utils/logging';

let self, dateToSave = null;
class BookTicket extends Component {
    constructor() {
        super();
        this.state = {
            showDates: [],
            movieShows: [],
            filteredShows: [],
            currentlySelectedDateIndex: '',
            showLayout: false,
            sessionDataForLayout: {},
            leftPos: 0,
            topPos: 0,
            showDropDown: false,
            selectedDateForDropDown: ''
        };
        self = this;
    }
    componentDidMount() {
        this.fetchShowDetails();
        $(document).mouseup(function (e) {
            !$(event.target).is('.drStartArrow') && !$(event.target).closest('.drContainer').length && self.state.showDropDown && self.setState({
                showDropDown: false
            });
        });

        let realTimeSyncEvents = ['realTimeSyncsessions', 'realTimeSyncmovies', 'realTimeSyncaudis', 'syncDoneStatus'];
        for (let i = 0; i < realTimeSyncEvents.length; i++) {
            postman.subscribe(realTimeSyncEvents[i], (data) => {
                dateToSave = this.state.showDates[this.state.currentlySelectedDateIndex];
                this.props.selectedState && this.props.selectedState == 'BookTickets' && this.handeBacktoBooking(false);
            });
        }
    }
    /*
     *  This method is to update the session instances affected on boxoffice 
     * */

    handleShowLayoutSet = (data) => {
        IdbRTC.getCinemas().then(cinemaDetails => {
            if (new Date(new Date(data.instance.start_date_time).getTime() + cinemaDetails[0].pos_cutoff_time * 60 * 1000) < new Date()) {
                postman.publish('showToast', {
                    message: 'Booking time has expired for this show',
                    type: 'error'
                });
                this.handeBacktoBooking(false);
            }
            else {
                this.setState({
                    sessionDataForLayout: data,
                    showLayout: true
                });
            }
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
        });
    };

    handeBacktoBooking = (flag) => {
        this.fetchShowDetails();
        this.setState({ 'showLayout': flag });
    };

    processMovieShowsForDisplay(movieShows) {
        let showDates = new Set();
        if (!Object.keys(movieShows).length) {
            postman.publish('showToast', {
                message: 'No Shows',
                type: 'error'
            });
        }
        Object.keys(movieShows).map(movie => {
            movieShows[movie].sessions.map(session => {
                showDates.add(moment(session.start_date_time).format('LL'));
            });
        });
        /* Below is the logic to sort the show dates */
        showDates = [...(showDates)].sort((a, b) => {
            return (moment(new Date(a)) - moment(new Date(b)));
        });
        this.filterShows(showDates[0], '', movieShows, showDates);
    }

    async fetchShowDetails() {
        IdbRTC.getMovieDetails().then(movieShows => {
            this.processMovieShowsForDisplay(movieShows);
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
            this.processMovieShowsForDisplay({});
        });
    }

    filterShows(date, type, movieShows, showDates) {
        let filteredShows = JSON.parse(JSON.stringify(movieShows || this.state.movieShows));
        Object.keys(filteredShows).map((key) => {
            for (let i = filteredShows[key].sessions.length - 1; i >= 0; i--) {
                let sessionId = filteredShows[key].sessions[i].id;
                let showDate = filteredShows[key].sessions[i].start_date_time;
                if (moment(new Date(showDate)).format('YYYY-MM-DD') !== moment(new Date(date)).format('YYYY-MM-DD')) {
                    filteredShows[key].sessions.splice(i, 1);
                }
            }
        });
        let temp = [];
        Object.keys(filteredShows).map(movie => {
            filteredShows[movie].sessions.length > 0 && temp.push(filteredShows[movie]);
        });
        filteredShows = temp.sort((a, b) => {
            return a.sessions.length !== b.sessions.length ? b.sessions.length - a.sessions.length : a.display.toUpperCase() - b.display.toUpperCase();
        });
        this.setState({
            movieShows: movieShows || this.state.movieShows,
            showDates: showDates || this.state.showDates,
            filteredShows,
            currentlySelectedDateIndex: showDates && showDates.length > 0 ? showDates.indexOf(date) : this.state.showDates.indexOf(date),
            showDropDown: false,
            selectedDateForDropDown: type == 'dtFromDropDown' && this.state.showDates[0] !== date ? date : ''
        }, () => {
            dateToSave = null;
        });
    }

    toggleDropDown(e) {
        this.setState({
            leftPos: e.target.offsetLeft,
            topPos: e.target.offsetTop + 13,
            showDropDown: !this.state.showDropDown
        });
    }

    render() {
        const { filteredShows, showDates, currentlySelectedDateIndex } = this.state;
        var custStyle = {
            left: this.state.leftPos,
            top: this.state.topPos
        };
        return (
            <div className="bookTicket">
                {!this.state.showLayout && <div className="navBar">
                    <nav className="navTabs">
                        {
                            showDates.map((date, key) => {
                                return (key < 3 && <div key={key} className="date" onClick={() => {
                                    this.filterShows(date, '');
                                }}><span
                                    className={currentlySelectedDateIndex === key ? 'selectedDateFilter' : ''}>{moment(new Date(date)).format('ddd, DD MMM')}</span>
                                </div>);
                            })
                        }
                        {showDates.length > 3 && <div className={(this.state.selectedDateForDropDown ? 'date' : 'drStartArrow')}>
                            <span className={'spaceForMenu ' + (this.state.selectedDateForDropDown ? 'selectedDateFilter' : '')}>{this.state.selectedDateForDropDown ? moment(new Date(this.state.selectedDateForDropDown)).format('ddd, DD MMM') : ''}</span>
                            <i className="arrow down" onClick={this.toggleDropDown.bind(this)}></i>
                        </div>}

                        <div className={'drContainer ' + (this.state.showDropDown ? 'showDropDown' : 'hideDropDown')} style={custStyle}>
                            {
                                showDates.map((date, key) => {
                                    return (key >= 3 && <div key={key} className="date dropDownDt" onClick={() => {
                                        this.filterShows(date, 'dtFromDropDown');
                                    }}><span
                                        className={'drSpan ' + (currentlySelectedDateIndex === key ? 'selectedDateFilter' : '')}>{moment(new Date(date)).format('ddd, DD MMM')}</span>
                                    </div>);
                                })
                            }
                        </div>
                    </nav>
                    <div className="time">
                        <Clock />
                    </div>
                </div>}
                {!this.state.showLayout && <div>
                    {_.map(Object.keys(filteredShows), (movie, i) => {
                        return (
                            <div key={i}><MovieDetails handleShowLayoutSet={this.handleShowLayoutSet.bind(this)}
                                movie={filteredShows[movie]} />
                            </div>);
                    })}
                </div>}
                <div>
                    {/*<FreeSeating/>*/}
                </div>

                <div className="bookTicketContainer">
                    {this.state.showLayout &&
                        <Layout sessionDataForLayout={this.state.sessionDataForLayout} type="session" showLayout={this.state.showLayout}
                            handeBacktoBooking={this.handeBacktoBooking} />}
                </div>

            </div>
        );
    }
}

//Props fetched from redux store
function select(state) {
    return {
        selectedState: state.headerReducer,
    };
}

// Wrap the component to inject dispatch and state into it
export default connect(select)(BookTicket);