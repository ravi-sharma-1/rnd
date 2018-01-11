// @flow
import _ from 'lodash';
import async from 'async';
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import './FindBooking.scss';
import postman from '../../utils/postman';
import testPrintData from './testPrintData';
import { serverLogging } from '../../utils/logging';
import ModalNew from '../../common/components/ModalNew/ModalNew';
import Layout from '../Layout/Layout.react';
import ConfirmBooking from '../ConfirmBooking/ConfirmBooking.react';
import * as layoutAction from '../../actions/layoutAction';
import IdbRTC from '../../utils/idb_rtc';
import { isSocketRegistered, isSocketConnected, sendMessage,sendMessageToAll} from '../../utils/sockets';
import { ticketTemplate1, ticketTemplate2, ticketTemplate3, ticketTemplate4, ticketTemplate5, ticketTemplate7, ticketTemplate8, ticketTemplate9, ticketTemplate10} from '../../../js/utils/ticketTemplates';
import { getMovieDateTime, getMovieDuration, getCatName, getSeats, updatePrintStatus, updatePrintStatusBO, getOnlineStatusLocal, refundBooking } from '../../actions/confirmBookingActions';

let printDoneEvent;
let testPrintCode = 'Test Ticket';


class FindBooking extends React.Component {

    constructor(props, context) {
        super(props, context);
        this.state = {
            invalidBookingId: false,
            bookingId: '',
            bookingDetail: null,
            ticketPrinted: false,
            isMaster: this.props.isMaster,
            template: 1,
            userRole: 'Operator',
            teleNum: '',
            mobValid: true,
            confirmBooking: false,
            objForTeleBooking: {},
            modifyFlag: false,
            modifiedData: {},
            showLayout: false,
            teleBookedData: {},
            selSeats: []
        };

    }

    setUserData(users) {
        users.map((user) => {
            user.id === this.props.userData.id && this.setState({ userRole: user.role_name });
        });
    }

    componentDidMount() {
        IdbRTC.findCinemaDetails().then((data) => {
            let cinLen = `${data[0].id}`;
            this.setState({
                cinemaAdd: data[0].name, //previously it was address
                template: (data[0] && data[0].template) ? data[0].template : 1,
                cinemaId: cinLen.length <= 3 ? '0' + cinLen : data[0].id,
                gstin: data[0].gstin,
                sac_movies: data[0].sac_movies,
                sac_3d: data[0].sac_3d
            });
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
        });
        IdbRTC.getUsers().then((users) => {
            this.setUserData(users.result);
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
        });
        IdbRTC.findMasterInfo().then((data) => {
            data = data.result;
            this.setState({
                isMaster: _.get(data, '[0].is_master', 0),
                browserId: _.get(data, '[0].machine_id', null),
                tranId: _.get(data, '[0].transaction_id', null)
            });
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
        });
        this.getCinemaAddress();
    }

    componentWillUnmount() {
        this.modalClosed && this.modalClosed.remove();
        printDoneEvent && printDoneEvent.remove();
    }

    /*
     * Handles change of booking id field
     * @Returns: state with update value of input box
     */
    inputChanged(input) {
        this.setState({
            bookingId: input,
            invalidBookingId: false
        });
    }

    /**
     * This method is for detecting phone number for search telebooking
     * */
    inputChangedTeleBooking(input) {
        if (input.length < 11) {
            var patt = /[7-9]{1}\d{9}/;
            this.setState({
                teleNum: input
            });
            if (patt.test(input)) {
                this.setState({
                    mobValid: true
                });
            }
        }
        return;
    }
    /*
    * Set Validation
    * **/
    setInputFlag() {
        if (!this.state.teleNum) {
            this.setState({
                mobValid: true
            });
        } else if (this.state.teleNum.length != 10) {
            this.setState({
                mobValid: false
            });
        }
    }

    setInputOnFocus() {
        if (this.state.teleNum.length != 10) {
            this.setState({
                mobValid: false
            });
        }
    }
    /*
     * Find booking even if enter button pressed after booking id entered
     */
    handleKeyPress(event, type) {
        if (event.charCode !== 13) {
            return;
        }
        if (type == 'tele') {
            this.findTeleBooking(this.state.teleNum);
        } else {
            this.findBooking(event.target.value);
        }

    }

    /*
     * @Returns: set booking details in state
     * @Required: booking id
     */
    findBooking(bookingId) {
        this.setState({ bookingDetail: null }, () => {
            if (bookingId === testPrintCode) {
                this.setState({
                    invalidBookingId: false,
                    bookingDetail: testPrintData
                });
            } else {
                let bkingId = this.state.cinemaId ? this.state.cinemaId + bookingId : '';
                if (bkingId) {
                    let resp;
                    if (this.state.isMaster === 1) {
                        resp = IdbRTC.findBooking(bkingId);
                    } else if (this.state.isMaster === 0) {
                        resp = IdbRTC.findBooking(bkingId);
                    }
                    resp.then((data) => {
                        this.setState({
                            invalidBookingId: false,
                            bookingDetail: data
                        });
                    }).catch((error) => {
                        postman.publish('showToast', {
                            message: error.message,
                            type: 'error'
                        });
                    });
                } else {
                    postman.publish('showToast', {
                        message: 'Invalid booking id',
                        type: 'error'
                    });
                }
            }
        });

    }
    /**
     * Find telebooking
     * */
    findTeleBooking(num) {
        this.setState({
            confirmBooking: false
        });

        //Check for number already exist
        if (num.length == 10) {
            //check avalability of number
            let phoneStatus = layoutAction.getPhoneNumberStatus({
                'tele_book_no': num
            });
            phoneStatus.then((resp) => {
                if (resp.hasOwnProperty('result') && resp.result.hasOwnProperty('9')) {
                    let teleBooking = resp.result['9'];
                    if (teleBooking.length) {
                        let fetchSessionInfoById = IdbRTC.getSessionById(teleBooking[0].ssn_instance_id);
                        let objForTeleBooking = {
                            sessionDataForLayout: {},
                            cinemaDetailsObj: this.state.cinemaFullDetails,
                            blockedSeatResponseData: {
                                'id': teleBooking[0].booking_id
                            },
                            audiName: ''
                        };
                        objForTeleBooking.sessionDataForLayout['seat_details'] = teleBooking[0].seat_details;
                        fetchSessionInfoById.then((resp) => {
                            objForTeleBooking.sessionDataForLayout['instance'] = resp;
                            let moviesById = IdbRTC.getMoviesById(resp.movie_id);
                            moviesById.then((movResp) => {
                                objForTeleBooking.sessionDataForLayout['censor'] = movResp.censor;
                                objForTeleBooking.sessionDataForLayout['display'] = movResp.display;
                                objForTeleBooking.sessionDataForLayout['duration'] = movResp.duration;
                                objForTeleBooking.sessionDataForLayout['language'] = movResp.language;
                                objForTeleBooking.sessionDataForLayout['projection'] = movResp.projection;
                                this.setState({
                                    confirmBooking: true,
                                    objForTeleBooking: objForTeleBooking,
                                    teleBookedData: teleBooking
                                });
                            }, (err) => {
                            });
                        }, (err) => {
                        });
                    }
                } else {
                    postman.publish('showToast', {
                        message: 'No active bookings for this number',
                        type: 'error'
                    });
                }
            }, (err) => {
                if (err.hasOwnProperty('error')) {
                    postman.publish('showToast', {
                        message: 'Telebooking does not exist for this number',
                        type: 'error'
                    });
                }
            });
        }
    }

    getSeatPrice(catData, category, seatNameArray, invoice) {
        let priceVars = ['3D_cgst', '3D_ltax', '3D_nett', '3D_sgst', 'cgst', 'comp_cgst', 'comp_ltax', 'comp_nett', 'comp_sgst', 'defence_cgst', 'defence_ltax', 'defence_nett', 'defence_sgst', 'l_tax', 'price', 'sgst'];
        let priceArr = [];
        let booking_type = _.get(this.state, 'bookingDetail.booking.booking_type', null);
        let invoiceArray = invoice && invoice.split(',');
        if (booking_type && catData) {
            catData.map((data) => {
                if (category.cats.toUpperCase() === data.seat_category.toUpperCase()) {
                    priceVars.map(val => {
                        data[val] = data[val] ? data[val] : 0;
                    });
                    let x = booking_type.split('-');
                    if (isNaN(x[0]) || isNaN(x[1]) || isNaN(x[2])) {
                        return;
                    }
                    for (let i = 0; i < Number(x[0]); i++) {
                        priceArr.push({
                            ticketPrice: { base: data.price, cgst: data.cgst, sgst: data.sgst, lTax: data.l_tax },
                            threeDPrice: x[3] !== '2D' ? {
                                base: data['3D_nett'],
                                cgst: data['3D_cgst'],
                                sgst: data['3D_sgst'],
                                lTax: data['3D_ltax']
                            } : null,
                            maintenancePrice: { base: data.maintenance_nett, cgst: data.maintenance_cgst, sgst: data.maintenance_sgst, lTax: data.maintenance_ltax },
                            subCategory: 'General'
                        });
                    }
                    for (let i = 0; i < Number(x[1]); i++) {
                        priceArr.push({
                            ticketPrice: {
                                base: data.defence_nett,
                                cgst: data.defence_cgst,
                                sgst: data.defence_sgst,
                                lTax: data.defence_ltax
                            },
                            threeDPrice: x[3] !== '2D' ? {
                                base: data['3D_nett'],
                                cgst: data['3D_cgst'],
                                sgst: data['3D_sgst'],
                                lTax: data['3D_ltax']
                            } : null,
                            maintenancePrice: { base: data.maintenance_nett, cgst: data.maintenance_cgst, sgst: data.maintenance_sgst, lTax: data.maintenance_ltax },
                            subCategory: 'Defence'
                        });
                    }
                    for (let i = 0; i < Number(x[2]); i++) {
                        priceArr.push({
                            ticketPrice: {
                                base: data.comp_nett,
                                cgst: data.comp_cgst,
                                sgst: data.comp_sgst,
                                lTax: data.comp_ltax
                            },
                            threeDPrice: x[3] !== '2D' ? {
                                base: data['3D_nett'],
                                cgst: data['3D_cgst'],
                                sgst: data['3D_sgst'],
                                lTax: data['3D_ltax']
                            } : null,
                            maintenancePrice: { base: data.maintenance_nett, cgst: data.maintenance_cgst, sgst: data.maintenance_sgst, lTax: data.maintenance_ltax },
                            subCategory: 'Complementary'
                        });
                    }
                }
            });
        }
        priceArr.map((val, key) => {
            val.seatNumber = seatNameArray[key];
            val.invoiceNumber = invoiceArray[key];
        });
        return priceArr;
    }

    getCinemaAddress() {
        IdbRTC.findCinemaDetails().then((data) => {
            let cinLen = `${data[0].id}`;
            this.setState({
                cinemaAdd: data[0].name, //previously it was address
                template: (data[0] && data[0].template) ? data[0].template : 1,
                cinemaId: cinLen.length <= 3 ? '0' + cinLen : data[0].id,
                gstin: data[0].gstin,
                sac_movies: data[0].sac_movies,
                sac_3d: data[0].sac_3d,
                cinemaFullDetails: data[0]
            });
        });
    }

    getTicketCopies() {
        let { bookingDetail, cinemaAdd, gstin, sac_movies, sac_3d, objForTeleBooking } = this.state;
        let { start_date_time, categories } = bookingDetail.session;
        let { seat_details, booking_id, invoice, updated_at } = bookingDetail.booking;
        let { display, censor, language } = bookingDetail.movie;
        let seatData = getSeats(seat_details, 'object');
        let seatNameArray = seatData;//_.flatMap(seatData, (numbers, key) => numbers.map(n => `${key}-${n}`));
        let cat = getCatName(seat_details);
        let seats = this.getSeatPrice(categories, cat, seatNameArray, invoice);
        let audiName = bookingDetail.audi.name;
        let userName = this.props.userData.username ? this.props.userData.username : 'NA';
        let ticketObj = {
            cinema: {
                name: cinemaAdd,
                gstNumber: gstin, // Hard Coded value, will be replaced later
                movieSAC: sac_movies, // Hard Coded value, will be replaced later
                threeDSAC: sac_3d // Hard Coded value, will be replaced later
            },
            movie: {
                name: display,
                censor: censor,
                language: language
            },
            audi: {
                name: audiName
            },
            session: {
                category: cat.cats,
                startDateTime: start_date_time
            },
            booking: {
                id: booking_id,
                posUser: userName,
                time: updated_at // Hard Coded value, will be replaced later
            },
            seats: seats
        };
        if (this.state.template === 1) {
            return ticketTemplate1(ticketObj);
        } else if (this.state.template === 2) {
            return ticketTemplate2(ticketObj);
        } else if (this.state.template === 3) {
            return ticketTemplate3(ticketObj);
        } else if (this.state.template === 4) {
            return ticketTemplate4(ticketObj);
        } else if (this.state.template === 5) {
            return ticketTemplate5(ticketObj);
        } else if (this.state.template === 6) {
            return ticketTemplate7(ticketObj);
        } else if (this.state.template === 7) {
            return ticketTemplate8(ticketObj);
        } else if (this.state.template === 8) {
            return ticketTemplate9(ticketObj);
        } else if (this.state.template === 9) {
            return ticketTemplate10(ticketObj);
        }
    }

    initializeTicketPrint(printState) {
        let bookingDetail = this.state.bookingDetail;
        let { payment_mode, seat_count, booking_type } = bookingDetail.booking;
        booking_type = Number(payment_mode) === 1
            ? String(seat_count) + '-0-0-' + (bookingDetail.movie.projection === '2D' ? '2D' : '3D')
            : booking_type;
        bookingDetail.booking.booking_type = booking_type;
        this.setState({ bookingDetail }, () => {
            this.printPhysicalTicket();
            getOnlineStatusLocal() === 'yes'
                && isSocketRegistered()
                && !printState
                && this.makePrintPosCall();
        });
    }

    printTestTicket() {
        let content = document.getElementById('ticketContainer');
        let pri = document.getElementById('ticketcontentstoprint').contentWindow;
        pri.document.open();
        pri.document.write(content.innerHTML);
        pri.focus();
        pri.print();
        pri.document.close();
    }

    printPhysicalTicket() {
        let isOnline = (getOnlineStatusLocal() === 'yes') && isSocketRegistered() ? 1 : 0;
        let content = document.getElementById('ticketContainer');
        let pri = document.getElementById('ticketcontentstoprint').contentWindow;
        pri.document.open();
        pri.document.write(content.innerHTML);
        pri.focus();
        pri.print();
        pri.document.close();
        updatePrintStatus({ booking_id: this.state.bookingDetail.booking.booking_id }, isOnline).then((data) => {
            if (data.result === 'Done') {
                postman.publish('showToast', {
                    message: 'Print Successful!',
                    type: 'success'
                });
                this.setState({
                    ticketPrinted: true
                });
            } else {
                postman.publish('showToast', {
                    message: data.error,
                    type: 'error'
                });
            }
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
        });
    }
    
    makePrintPosCall() {
        let { bookingDetail, isMaster, browserId } = this.state;
        IdbRTC.findMasterInfo().then((data) => {
            data = data.result;
            let req = {
                browserId: browserId,
                id: bookingDetail.booking.booking_id,
                transactionId: _.get(data, '[0].transaction_id', null)
            };
            let onlinePrintUpdate = updatePrintStatusBO(req);
            onlinePrintUpdate.then((response) => {
                //Updating Logs
                if (response.status === 200) {
                    serverLogging(`Print status acknowledged to BO successfully: ${bookingDetail.booking.booking_id}`, response);
                } else {
                    serverLogging(`Error while acknowledging to BO: ${bookingDetail.booking.booking_id}`, response);
                }
            }).catch((error) => {
                postman.publish('showToast', {
                    message: error.message,
                    type: 'error'
                });
            });
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
        });
    }
    /*
    * Booking is cancelled from cancel button
    * */

    cancelBooking() {
        let _this = this;
        let booking = _this.state.bookingDetail.booking;
        let funcList = [];
        let isOnline = isSocketRegistered() && isSocketConnected();
        let cancelOnlineBooking = function (cb) {
            IdbRTC.findMasterInfo().then((data) => {
                data = data.result;
                let browserId = _.get(data, '[0].machine_id', null);
                let tranId = _.get(data, '[0].transaction_id', null);
                refundBooking(booking, browserId, tranId).then(() => {
                    sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                    cb(null);
                }).catch((error) => {
                    postman.publish('showToast', {
                        message: error.message,
                        type: 'error'
                    });
                    cb(error);
                });
            }).catch((error) => {
                postman.publish('showToast', {
                    message: error.message,
                    type: 'error'
                });
            });
        };
        let cancelOfflineBooking = function (cb) {
            IdbRTC.cancelBooking(booking, isOnline).then(() => {
                sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                cb(null);
            }).catch((error) => {
                postman.publish('showToast', {
                    message: error.message,
                    type: 'error'
                });
                cb(error);
            });
        };
        let cancelBookingAfterChanges = function (cb) {
            async.parallel([function (callback) {
                IdbRTC.updateAvailableCountInSession(booking, isOnline).then(() => {
                    sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                    callback(null);
                }).catch((error) => {
                    postman.publish('showToast', {
                        message: error.message,
                        type: 'error'
                    });
                });
            }, function (callback) {
                IdbRTC.updateSeatStatusAfterRefund(booking).then(() => {
                    callback(null);
                    sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                }).catch((error) => {
                    postman.publish('showToast', {
                        message: error.message,
                        type: 'error'
                    });
                });
            }], function (err) {
                if (err) {
                    cb(err);
                } else {
                    cb(null);
                }
            });
        };
        if (isOnline) {
            funcList.push(cancelOnlineBooking);
        }
        funcList.push(cancelOfflineBooking);
        funcList.push(cancelBookingAfterChanges);
        async.series(funcList, function (err) {
            !err && _this.findBooking(_this.state.bookingId);
        });

    }
    /**
     * Show confirm booking screen in search
     * */
    handleSetShowLayout = (flag, backStatus) => {
    };

    handleBackToBooking = () => {
    }
    /*
    * This method is used for opened up the layout popup
    * */
    handleModifySeats = (data) => {
        this.setState({
            modifyFlag: true,
            modifiedData: this.state.objForTeleBooking.sessionDataForLayout,
            showLayout: true
        });
    }

    /*
     *  Modal for telebooking
     * */
    handleCheckStateModal = (status) => {
        if (status == 'no') {
            this.modalClosed = postman.publish('modalClosedForLayout');
            this.setState({
                modifyFlag: false
            });
            //check if ticket print done, reload the screen
        } else {

            this.setState({
                modifyFlag: true
            });
        }
    };

    /**
     * This will get the seat data when user is modifying the telebooked seats from seat layout
     * */

    handleModifySeatLayout = (data) => {
        let objForTeleBooking = this.state.objForTeleBooking;
        objForTeleBooking.sessionDataForLayout['seat_details'] = data.seat_details;
        sendMessageToAll({ msg: 'realTimeEvent.teleBlocked', data: {} });
        this.setState({
            modifyFlag: false,
            objForTeleBooking: objForTeleBooking,
            selSeats: data.selectedSeats
        }, (info) => {
        });
    }

    handleCancelTeleBlocked = (data) => {
    }

    render() {
        let { bookingDetail, invalidBookingId, bookingId, ticketPrinted, cinemaId, isMaster, teleNum, objForTeleBooking } = this.state;
        let printStatus = _.get(bookingDetail, 'booking.print_status', null);
        let printTicketButtonDisabled = Boolean(printStatus === 0 ? ticketPrinted : this.state.userRole === 'Operator' ? true : ticketPrinted);
        let cancelTicketButtonDisabled = this.state.userRole === 'Operator';
        let framestyle = {
            height: '0px',
            width: '0px',
            position: 'absolute',
            visibility: 'hidden'
        };
        return (
            <div className="findBooking">
                <div className="performSearch">
                    <div className="align-item-even">
                        <div className="title">Enter Booking ID to view details and print the ticket</div>
                        {<div className="title">Enter phone number to view details and print the ticket</div>}
                    </div>
                    <div className="searchBooking">
                        <div className="align-item-even">
                            <div className="bookingId">
                                <div className="cinemaId">{cinemaId ? cinemaId : ''}</div>
                                <input className={`${invalidBookingId ? 'invalid' : ''}`}
                                    value={bookingId}
                                    placeholder="Last 10 characters"
                                    onChange={(event) => { this.inputChanged(event.target.value); }}
                                    onKeyPress={(event) => { this.handleKeyPress(event, 'booking'); }} />
                            </div>
                            {<div>OR</div>}
                            {<div>
                                <div className="bookingId">
                                    <input className={'input-elem ' + `${invalidBookingId ? 'invalid' : ''}`}
                                        value={teleNum}
                                        placeholder="Phone Number"
                                        onChange={(event) => { this.inputChangedTeleBooking(event.target.value); }}
                                        onFocus={(event) => { this.setInputOnFocus(); }}
                                        onBlur={(event) => { this.setInputFlag(); }}
                                        onKeyPress={(event) => { this.handleKeyPress(event, 'tele'); }}
                                        type="number"
                                    />
                                </div>
                                {!this.state.mobValid && <div className="redbrdr">Please enter a valid mobile number.</div>}
                            </div>}
                        </div>
                        <div className="align-item-even setButtinSpace">
                            <button className={`${(bookingId && bookingId.length >= 10) || (teleNum && teleNum.length == 10) ? '' : 'disabled'}`}
                                onClick={() => {
                                    if (teleNum && (teleNum.length == 10)) {
                                        this.findTeleBooking(teleNum);
                                    } else {
                                        this.findBooking(bookingId);
                                    }
                                }}>Search Booking
                            </button>
                        </div>
                    </div>
                    {invalidBookingId && <div className="invalidBooking">{invalidBookingId}</div>}
                </div>
                <div>
                    {this.state.confirmBooking &&
                        <ConfirmBooking seatDetails={objForTeleBooking.sessionDataForLayout.seat_details} sessionDataForLayout={objForTeleBooking.sessionDataForLayout} cinemaDetailsObj={objForTeleBooking.cinemaDetailsObj}
                            teleBookedData={this.state.teleBookedData}
                            handleCancelTeleBlocked={this.handleCancelTeleBlocked}
                            blockedSeatResponseData={objForTeleBooking.blockedSeatResponseData}
                            audiName={objForTeleBooking.audiName}
                            type={'find'}
                            handleSetShowLayout={this.handleSetShowLayout}
                            goback={this.handleBackToBooking}
                            handleModifySeats={this.handleModifySeats}
                        />}
                </div>
                {bookingDetail && <div className="searchedResult">
                    <div className="leftSide">
                        <div
                            className="title">{bookingDetail.movie.display + '(' + bookingDetail.movie.censor + ')' + ' | ' + bookingDetail.movie.language}</div>
                        <div className="items">
                            <div className="item">
                                <div
                                    className="value">{getMovieDateTime(bookingDetail.session.start_date_time, 'date')}</div>
                                <div className="field">Date</div>
                            </div>
                            <div className="item">
                                <div
                                    className="value">{getMovieDateTime(bookingDetail.session.start_date_time, 'time')}</div>
                                <div className="field">Time</div>
                            </div>
                            <div className="item">
                                <div className="value">{getSeats(bookingDetail.booking.seat_details, 'string')}
                                    ({(bookingDetail.booking.seat_details.split('|')[1]).split('-')[0]})
                                </div>
                                <div className="field">Seats</div>
                            </div>
                            <div className="item">
                                <div className="value">{bookingDetail.booking.seat_count}</div>
                                <div className="field">No. of Tickets</div>
                            </div>
                            <div className="item">
                                <div className="value">{bookingDetail.audi.name}</div>
                                <div className="field">Audi</div>
                            </div>
                            <div className="item">
                                <div className="value">{getMovieDuration(bookingDetail.session.inst_duration)}</div>
                                <div className="field">Duration</div>
                            </div>
                        </div>
                    </div>
                    {bookingId !== testPrintCode &&
                        <div className="rightSide">
                            {(bookingDetail.booking.status === 4 ? (
                                <button onClick={() => { this.cancelBooking(bookingId); }}
                                    disabled={cancelTicketButtonDisabled}>
                                    Cancel Booking
                            </button>) : (
                                    <button className="cancelledBooking">Booking has been cancelled!!</button>))}
                            {(bookingDetail.booking.pax_info && bookingDetail.booking.pax_info.mobile) &&
                                <div>
                                    <div className="title">Please confirm the below number</div>
                                    <div className="mobile">{bookingDetail.booking.pax_info.mobile}</div>
                                </div>}
                            {(bookingDetail.booking.status === 4) &&
                                <button onClick={() => { this.initializeTicketPrint(bookingDetail.booking.print_status); }}
                                    disabled={printTicketButtonDisabled}>
                                    Print Ticket
                        </button>
                            }
                            <iframe id="ticketcontentstoprint" style={framestyle}></iframe>
                            <div id="ticketContainer">{this.getTicketCopies()}</div>
                            {(bookingDetail.booking.status === 4) && bookingDetail.booking.print_status === 1 &&
                                <div className="ticketPrinted">This ticket has already been printed</div>}
                            {bookingDetail.booking.status === 64 &&
                                <div className="ticketPrinted">This ticket has been refunded.</div>}
                        </div>
                    }
                    {bookingId === testPrintCode &&
                        <div className="rightSide">
                            <iframe id="ticketcontentstoprint" style={framestyle}></iframe>
                            <div id="ticketContainer">{this.getTicketCopies()}</div>
                            {(bookingId === testPrintCode) &&
                                <button onClick={() => { this.printTestTicket(); }}>Print Test Ticket</button>
                            }
                        </div>
                    }
                </div>}
                {
                    <ModalNew modalHeader={''}
                        modalBody={''}
                        modalFooter={''}
                        modalWidth={1100}
                        showModal={this.state.modifyFlag}
                        topPos={4 + '%'}
                        handleCheckStateModal={this.handleCheckStateModal}>
                        <Layout sessionDataForLayout={this.state.modifiedData} showLayout={this.state.showLayout} type="find"
                            teleBookedData={this.state.teleBookedData}
                            handeBacktoBooking={this.handeBacktoBooking}
                            handleModifySeatLayout={this.handleModifySeatLayout}
                            selSeats={this.state.selSeats}
                        />
                    </ModalNew>
                }
            </div>
        );
    }
}

function mapStateToProps(state) {
    return {
        userData: state.loginReducer.userData
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(FindBooking);