// @flow
import './ConfirmBooking.scss';
import './ConfirmBooking.scss';
import * as Labels from '../../utils/labelConfigEn.json';
import * as confirmBookingActions from '../../actions/confirmBookingActions';
import * as headerActions from '../../actions/headerAction';
import FormElements from '../../common/components/FormElements/FormElements';
import IdbRTC from '../../utils/idb_rtc';
import Modal from '../../common/components/Modal/Modal';
import { sendMessageToAll } from '../../utils/sockets';
import React, { Component } from 'react';
import _ from 'lodash';
import bookSeat from '../../../idb/apis/blockSeat';
import modeConfig from '../../utils/paymentModeConfig.json';
import moment from 'moment';
import postman from '../../utils/postman';
import webApis from '../../../idb/apis/webApis';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { getCinemas } from '../../../idb/apis/cinemas';
import { isSocketRegistered, isSocketConnected } from '../../utils/sockets';
import { ticketTemplate1, ticketTemplate2, ticketTemplate3, ticketTemplate4, ticketTemplate5, ticketTemplate7, ticketTemplate8, ticketTemplate9, ticketTemplate10 } from '../../utils/ticketTemplates';

let printingEvent;

class ConfirmBooking extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            posCutOffTime: 0,
            showModal: false,
            ticketBooked: false,
            modalHeader: '',
            movieProjects: ['3D', '4D', '5D', '6D', '7D', '8D', '9D', '11D'],
            modalBody: '',
            bookingDetail: {},
            modalFooter: { noText: '', yesText: '' },
            paymentMode: false,
            previouslyBookedData: '',
            showCalculator: false,
            genPrice: { nett: 0, sgst: 0, cgst: 0, ltax: 0 },
            defensePrice: { nett: 0, sgst: 0, cgst: 0, ltax: 0 },
            compPrice: { nett: 0, sgst: 0, cgst: 0, ltax: 0 },
            proj3dCharges: { nett: 0, sgst: 0, cgst: 0, ltax: 0 },
            projMaintenanceCharges: { nett: 0, sgst: 0, cgst: 0, ltax: 0 },
            quotaPrices: [],
            template: 1,
            invoice: '',
            invoiceList: '',//1=> 3X3, 2=>4x1.25,
            cinemaDetail: this.props.cinemaDetailsObj
        };
    }
    // Here we are creating price configuration
    preparePriceConfig(sessionData) {
        let mvPrice = 0;

        let seatCountsArr = confirmBookingActions.getSeats(this.props.seatDetails, 'object');
        let genTicketCount = sessionData ? seatCountsArr.length : 0;
        let threeDCharge = this.state.movieProjects.indexOf(this.state.bookingDetail.projection) > -1 ? (Number(this.state.proj3dCharges.nett) + Number(this.state.proj3dCharges.sgst) + Number(this.state.proj3dCharges.cgst) + Number(this.state.proj3dCharges.ltax)) * Number(genTicketCount) : null;
        let maintenanceCharge = (Number(this.state.projMaintenanceCharges.nett) + Number(this.state.projMaintenanceCharges.sgst) + Number(this.state.projMaintenanceCharges.cgst) + Number(this.state.projMaintenanceCharges.ltax)) * Number(genTicketCount);
        mvPrice = (Number(this.state.genPrice.nett) + Number(this.state.genPrice.sgst) + Number(this.state.genPrice.cgst) + Number(this.state.genPrice.ltax)) * Number(genTicketCount);

        //config to show different quota prices on top of Confirm and book Button
        let obj = [
            {
                'label': 'General',
                'price': Number(this.state.genPrice.nett) + Number(this.state.genPrice.sgst) + Number(this.state.genPrice.cgst) + Number(this.state.genPrice.ltax),
                'count': genTicketCount,
                'total': mvPrice ? mvPrice : 0,
                'nett': _.get(this.state, 'genPrice.nett') || 0,
                'sgst': _.get(this.state, 'genPrice.sgst') || 0,
                'cgst': _.get(this.state, 'genPrice.cgst') || 0,
                'ltax': _.get(this.state, 'genPrice.ltax') || 0
            },
            {
                'label': 'Defense Personnel',
                'price': this.state.defensePrice ? Number(this.state.defensePrice.nett) + Number(this.state.defensePrice.cgst) + Number(this.state.defensePrice.sgst) + Number(this.state.defensePrice.ltax) : 0,
                'count': 0,
                'total': 0,
                'nett': _.get(this.state, 'defensePrice.nett') || 0,
                'sgst': _.get(this.state, 'defensePrice.sgst') || 0,
                'cgst': _.get(this.state, 'defensePrice.cgst') || 0,
                'ltax': _.get(this.state, 'defensePrice.ltax') || 0
            },
            {
                'label': 'Complementary',
                'price': this.state.compPrice ? Number(this.state.compPrice.nett) + Number(this.state.compPrice.cgst) + Number(this.state.compPrice.sgst) + Number(this.state.compPrice.ltax) : 0,
                'count': 0,
                'total': 0,
                'nett': _.get(this.state, 'compPrice.nett') || 0,
                'sgst': _.get(this.state, 'compPrice.sgst') || 0,
                'cgst': _.get(this.state, 'compPrice.cgst') || 0,
                'ltax': _.get(this.state, 'compPrice.ltax') || 0
            }
        ];

        mvPrice = threeDCharge ? threeDCharge + mvPrice : mvPrice;
        mvPrice = maintenanceCharge ? maintenanceCharge + mvPrice : mvPrice;
        //mv price is the combination of all three price include general price + 3d Charges + Mentincance Charges
        this.setState({
            finalAmount: mvPrice.toFixed(2),
            normalCount: genTicketCount,
            quotaPrices: obj ? obj : []
        });
        // here quota price is an array [general, defence, complimentary]
    }

    /*
     * React lifecycle method
     * Executes before component mount
     */

    componentWillMount() {
        let audiId = this.props.sessionDataForLayout ? this.props.sessionDataForLayout.instance.audi_id : '';
        IdbRTC.getCinemas().then(cinemaDetails => {
            this.setState({
                cinemaAdd: cinemaDetails[0] && cinemaDetails[0].name,
                template: cinemaDetails[0] && cinemaDetails[0].template,
                posCutOffTime: cinemaDetails[0] && cinemaDetails[0].pos_cutoff_time ? cinemaDetails[0].pos_cutoff_time : 0
            });
        });
        this.getMasterInfo();
        postman.subscribe('updatedmasterInfo', () => {
            this.getMasterInfo();
        });

        if (audiId) {
            let resp = IdbRTC.findAudiDetails(audiId);
            resp.then((data) => {
                this.setState({
                    audiName: data.name
                });
            });
        }
        this.setState({
            invalidBookingId: false,
            bookingDetail: this.props.sessionDataForLayout,
            areaCodeInfo: this.extractCategory(this.props.seatDetails)
        });

        //set price details in local state
        let cat = this.extractCategory(this.props.seatDetails) ? this.extractCategory(this.props.seatDetails) : '';
        cat && this.getPrices(this.props.sessionDataForLayout.instance.categories, cat);
    }

    componentWillReceiveProps(propsData) {

    }
    // utility methid for getting category from seat details
    extractCategory(str) {
        if (!str) {
            return;
        }
        var patt = /^(.*?)(?=(-\d+)+)/;
        var selectedStr = str.match(patt);
        return selectedStr[0];
    }
    // This is an initial method for building the price configuration
    getPrices(catDetails, catName) {
        catDetails && catDetails.map((data, index) => {
            if (catName.toUpperCase() == data.seat_category.toUpperCase()) {
                this.setState({
                    genPrice: { nett: _.get(data, 'price') || 0, sgst: _.get(data, 'sgst') || 0, cgst: _.get(data, 'cgst') || 0, ltax: _.get(data, 'l_tax') || 0 },
                    defensePrice: { nett: _.get(data, 'defence_nett') || 0, sgst: _.get(data, 'defence_sgst') || 0, cgst: _.get(data, 'defence_cgst') || 0, ltax: _.get(data, 'defence_ltax') || 0 },
                    compPrice: { nett: _.get(data, 'comp_nett') || 0, sgst: _.get(data, 'comp_sgst') || 0, cgst: _.get(data, 'comp_cgst') || 0, ltax: _.get(data, 'comp_ltax') || 0 },
                    proj3dCharges: { nett: _.get(data, '3D_nett') || 0, sgst: _.get(data, '3D_sgst') || 0, cgst: _.get(data, '3D_cgst') || 0, ltax: _.get(data, '3D_ltax') || 0 },
                    projMaintenanceCharges: { nett: _.get(data, 'maintenance_nett') || 0, sgst: _.get(data, 'maintenance_sgst') || 0, cgst: _.get(data, 'maintenance_cgst') || 0, ltax: _.get(data, 'maintenance_ltax') || 0 }
                }, () => {
                    this.preparePriceConfig(this.props.sessionDataForLayout); //updating price based on selection count
                });
            }
        });
    }

    componentWillUnmount() {
        if (printingEvent) {
            printingEvent.remove();
        }
    }

    componentDidMount() {
        printingEvent = postman.subscribe('LOCALBOOKINGUPDATED', (bookingData) => {
            let bookingDetail = this.state.bookingDetail ? this.state.bookingDetail : {};
            let quotaPrices = this.state.quotaPrices;
            let counter = bookingData.data ? bookingData.data.counter : null;
            if (bookingData.type == 'success') {
                bookingDetail['invoiceList'] = bookingData.data.invoice ? bookingData.data.invoice.split(',') : [];
                this.setState({
                    ticketBooked: true,
                    bookingId: this.props.blockedSeatResponseData.id,
                    invoiceList: bookingData.data.invoice,
                    bookingUpdated: bookingData.data.updated_at
                });

                this.handlePrintTicket(bookingDetail);
            }
        });

        /**
         * Here we are finding states of blocked data in local db
         * */
        if (this.props.blockedSeatResponseData.id) {
            confirmBookingActions.getBookingById(this.props.blockedSeatResponseData.id, (bookingData) => {
                this.setState({
                    previouslyBookedData: bookingData
                });
            });
        }

        postman.subscribe('UNBLOCKDONE', (data) => {
            if (data.type == 'success') {
                postman.publish('showToast', {
                    message: 'Unblock successful!',
                    type: 'success'
                });
            } else {
                postman.publish('showToast', {
                    message: 'Error while unblocking!',
                    type: 'error'
                });

            }

        });
        postman.subscribe('MASTERUNBLOCKDONE', (data) => {
            if (data.type == 'success') {
                postman.publish('showToast', {
                    message: 'Master unblock successful!',
                    type: 'success'
                });
            } else {
                postman.publish('showToast', {
                    message: 'Error while master unblocking!',
                    type: 'error'
                });

            }

        });

        postman.subscribe('MODIFYSEATSEVENT', () => {
            let cat = this.extractCategory(this.props.seatDetails) ? this.extractCategory(this.props.seatDetails) : '';
            cat && this.getPrices(this.props.sessionDataForLayout.instance.categories, cat);
        });
    }
    /*
    *  This is to get master info
    * */
    getMasterInfo() {
        IdbRTC.findMasterInfo().then((data) => {
            data = data.result;
            let browserId = (data && data[0] && data[0].machine_id) || null;
            let tranId = (data && data[0] && data[0].transaction_id) || null;
            let isMaster = (data && data[0] && data[0].is_master) || 0;
            this.setState({
                'browserId': browserId,
                'transactionId': tranId,
                'isMaster': isMaster
            });
        });
    }

    /*
     * Show modal if cancel booking button pressed.
     */
    confirmCancelBooking() {
        this.setState({
            showModal: true,
            modalHeader: Labels.cancelBooking.modalHeader,
            modalBody: Labels.cancelBooking.modalBody,
            modalFooter: Labels.cancelBooking.modalFooter
        });
    }

    /*
     * Cancel booking if yes option selected from modal.
     * Update db by hitting cancel booking api.
     */
    handleCancelBooking() {
        let appOnlineAllow = confirmBookingActions.getOnlineStatusLocal();
        let isOnline = (appOnlineAllow == 'yes') ? 1 : 0;
        if (this.state.cancelBooking || this.props.type == 'find') {
            if (appOnlineAllow == 'yes') {
                let bookingId = this.props.blockedSeatResponseData.id ? this.props.blockedSeatResponseData.id : '';
                let bookingObj = {
                    'id': bookingId,
                    'browserId': this.state.browserId,
                    'transactionId': this.state.transactionId
                };
                let resp = confirmBookingActions.cancelBooking(bookingObj);
                resp.then((response) => {
                    if (response.json) {
                        if (response.status === 400) {
                            response.json().then((data) => {
                                postman.publish('showToast', {
                                    message: data.error.message,
                                    type: 'error'
                                });
                            });
                            this.props.goback();
                        } else if (response.status === 200) {
                            let unblockAction = confirmBookingActions.unBlockSeatsOffline({ booking_id: this.props.blockedSeatResponseData.id }, isOnline);
                            unblockAction.then((data) => {
                                if (data.result == 'Done') {
                                    postman.publish('showToast', {
                                        message: 'Booking cancelled successfuly!',
                                        type: 'success'
                                    });
                                    sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                                    if (this.props.type == 'find') {
                                        postman.publish('switchTabEvt', 'BookTickets');
                                    }
                                    this.props.goback();
                                } else {
                                    postman.publish('showToast', {
                                        message: data.error,
                                        type: 'error'
                                    });
                                }
                            });
                        }
                    } else if (response.hasOwnProperty('result')) {
                        let unblockAction = confirmBookingActions.unBlockSeatsOffline({ booking_id: this.props.blockedSeatResponseData.id }, isOnline);
                        unblockAction.then((data) => {
                            if (data.result == 'Done') {
                                postman.publish('showToast', {
                                    message: 'Booking cancelled successfuly!',
                                    type: 'success'
                                });
                                sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                                if (this.props.type == 'find') {
                                    postman.publish('switchTabEvt', 'BookTickets');
                                }
                                this.props.goback();
                            } else {
                                postman.publish('showToast', {
                                    message: data.error,
                                    type: 'error'
                                });
                            }
                        });
                    } else if (response.hasOwnProperty('mstatus')) {
                        let unblockAction = confirmBookingActions.unBlockSeatsOffline({ booking_id: this.props.blockedSeatResponseData.id }, isOnline);
                        unblockAction.then((data) => {
                            if (data.result == 'Done') {
                                postman.publish('showToast', {
                                    message: 'Booking cancelled successfuly!',
                                    type: 'success'
                                });
                                sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                                if (this.props.type == 'find') {
                                    postman.publish('switchTabEvt', 'BookTickets');
                                }
                                this.props.goback();
                            } else {
                                postman.publish('showToast', {

                                    message: data.error,
                                    type: 'error'
                                });
                            }
                        });
                    } else if (response.hasOwnProperty('error')) {
                        postman.publish('showToast', {
                            message: response.error.message,
                            type: 'error'
                        });
                    }

                });
            } else if (appOnlineAllow == 'no') {
                let unblockAction = confirmBookingActions.unBlockSeatsOffline({ booking_id: this.props.blockedSeatResponseData.id }, isOnline);
                unblockAction.then((data) => {
                    if (data.result == 'Done') {
                        postman.publish('showToast', {
                            message: 'Booking cancelled successfuly!',
                            type: 'success'
                        });
                        sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                        if (this.props.type == 'find') {
                            postman.publish('switchTabEvt', 'BookTickets');
                        }
                        this.props.goback();
                    } else {
                        postman.publish('showToast', {

                            message: data.error,
                            type: 'error'
                        });
                    }
                });
            }
        }
    }


    /* @Param: status
     * Possible values (yes,no),
     * if no selected, close the model by setting showModal: false
     */
    handleCheckStateModal = (status) => {
        if (status == 'no') {
            this.setState({
                showModal: false
            });
            //check if ticket print done, reload the screen
            if (this.state.ticketBooked) {
                this.props.goback(false);
            }
        } else {

            this.setState({
                showModal: false,
                cancelBooking: true
            }, function () {
                this.handleCancelBooking();
            });
        }
    };

    /*
     * This function used to confirm the booking
     * @Params: bookingdeatils(object that contains booking info)
     * @Returns:
     */


    checkBooking(bookingId) {
        let appOnlineAllow = confirmBookingActions.getOnlineStatusLocal();
        let isOnline = (appOnlineAllow == 'yes') && isOnline ? 1 : 0;
        let reqData = {
            booking_id: bookingId
        };
        IdbRTC.unblockSeat(reqData, isOnline).then((data) => {
            if (data.result == 'Done') {
                postman.publish('showToast', {
                    message: 'Booking failed!',
                    type: 'error'
                });
                this.props.goback();
            } else {
                postman.publish('showToast', {
                    message: data.error,
                    type: 'success'
                });
                this.props.goback();
            }

        });

    }
    // This method is for creating price collection as per the ticket template design
    buildPriceCollection(bookingDetails) {
        var self = this;
        var arr = [];
        var temp = 0;
        let seatData = confirmBookingActions.getSeats(bookingDetails.seat_details, 'object');
        let invoiceData = self.state.invoiceList && self.state.invoiceList.split(',') || [];
        self.state.quotaPrices.length > 0 && self.state.quotaPrices.map(function (priceData, index) {
            if (priceData.count > 0) {
                _.times(priceData.count, function () {
                    let obj = _.clone(priceData, true);
                    let buildCol = {
                        invoiceNumber: invoiceData[temp],
                        seatNumber: seatData[temp],
                        subCategory: priceData.label,
                        ticketPrice: {
                            base: priceData.nett,
                            cgst: priceData.cgst,
                            sgst: priceData.sgst,
                            lTax: priceData.ltax
                        },
                        threeDPrice: bookingDetails.projection && bookingDetails.projection !== '2D' ? {
                            base: Number(self.state.proj3dCharges.nett ? self.state.proj3dCharges.nett : 0),
                            cgst: Number(self.state.proj3dCharges.cgst ? self.state.proj3dCharges.cgst : 0),
                            sgst: Number(self.state.proj3dCharges.sgst ? self.state.proj3dCharges.sgst : 0),
                            lTax: Number(self.state.proj3dCharges.ltax ? self.state.proj3dCharges.ltax : 0)
                        } : null,
                        maintenancePrice: {
                            base: Number(self.state.projMaintenanceCharges.nett ? self.state.projMaintenanceCharges.nett : 0),
                            cgst: Number(self.state.projMaintenanceCharges.cgst ? self.state.projMaintenanceCharges.cgst : 0),
                            sgst: Number(self.state.projMaintenanceCharges.sgst ? self.state.projMaintenanceCharges.sgst : 0),
                            lTax: Number(self.state.projMaintenanceCharges.ltax ? self.state.projMaintenanceCharges.ltax : 0)
                        }

                    };
                    arr.push(buildCol);
                    temp++;
                });
            }
        });
        return arr;
    }
    // here we are building the basic ticket configuration for ticket template
    buildTicketConfig(bookingDetails) {
        let { name, gstin, sac_movies, sac_3d } = this.state.cinemaDetail;
        let { display, censor, language } = this.props.sessionDataForLayout;
        let userName = this.props.store.loginReducer.userData.username ? this.props.store.loginReducer.userData.username : 'NA';
        let mvDate = bookingDetails.instance.start_date_time;
        let cat = this.extractCategory(this.props.seatDetails) ? this.extractCategory(this.props.seatDetails) : '';
        let self = this;
        let ticketObjData = {
            cinema: {
                name: name,
                gstNumber: gstin,
                movieSAC: sac_movies,
                threeDSAC: sac_3d
            },
            movie: {
                name: display,
                censor: censor,
                language: language
            },
            audi: {
                name: self.state.audiName
            },
            session: {
                category: cat,
                startDateTime: mvDate
            },
            booking: {
                id: self.props.blockedSeatResponseData && self.props.blockedSeatResponseData.id,
                posUser: userName,
                time: self.state.bookingUpdated && self.state.bookingUpdated || ''
            },
            seats: self.buildPriceCollection(bookingDetails)
        };
        return ticketObjData;
    }
    // Below method are used to cretate the different sort of ticket template based on bookingDetails object

    _4x1_25TicketCopies(bookingDetails) {
        let ticketObj = this.buildTicketConfig(bookingDetails);
        return ticketTemplate2(ticketObj);
    }

    _3x3TicketCopies(bookingDetails) {
        let ticketObj = this.buildTicketConfig(bookingDetails);
        return ticketTemplate1(ticketObj);
    }
    _3x6TicketCopies(bookingDetails) {
        let ticketObj = this.buildTicketConfig(bookingDetails);
        return ticketTemplate3(ticketObj);
    }
    _3x8TicketCopies(bookingDetails) {
        let ticketObj = this.buildTicketConfig(bookingDetails);
        return ticketTemplate4(ticketObj);
    }
    _3x1TicketCopies(bookingDetails) {
        let ticketObj = this.buildTicketConfig(bookingDetails);
        return ticketTemplate5(ticketObj);
    }
    _3x4MultiTicketCopies(bookingDetails) {
        let ticketObj = this.buildTicketConfig(bookingDetails);
        return ticketTemplate7(ticketObj);
    }
    _3x8TicketCopies_mc(bookingDetails) {
        let ticketObj = this.buildTicketConfig(bookingDetails);
        return ticketTemplate8(ticketObj);
    }
    _3x1TicketCopies_mc(bookingDetails) {
        let ticketObj = this.buildTicketConfig(bookingDetails);
        return ticketTemplate9(ticketObj);
    }
    _3x4MultiTicketCopies_mc(bookingDetails) {
        let ticketObj = this.buildTicketConfig(bookingDetails);
        return ticketTemplate10(ticketObj);
    }



    /*
     * This function is used to handle print ticket
     * and confirms that ticket has been printed.
     * Params: {booking id} received from confirm booking call
     */

    handlePrintTicket(bookingDetails) {
        let appOnlineAllow = confirmBookingActions.getOnlineStatusLocal();
        let isOnline = (appOnlineAllow == 'yes') ? 1 : 0;
        let copies;
        if (this.state.template == 1) {
            copies = this._3x3TicketCopies(bookingDetails);
        } else if (this.state.template == 2) {
            copies = this._4x1_25TicketCopies(bookingDetails);
        } else if (this.state.template == 3) {
            copies = this._3x6TicketCopies(bookingDetails);
        } else if (this.state.template == 4) {
            copies = this._3x8TicketCopies(bookingDetails);
        } else if (this.state.template == 5) {
            copies = this._3x1TicketCopies(bookingDetails);
        } else if (this.state.template == 6) {
            copies = this._3x4MultiTicketCopies(bookingDetails);
        } else if (this.state.template == 7) {
            copies = this._3x8TicketCopies_mc(bookingDetails);
        } else if (this.state.template == 8) {
            copies = this._3x1TicketCopies_mc(bookingDetails);
        } else if (this.state.template == 9) {
            copies = this._3x4MultiTicketCopies_mc(bookingDetails);
        }
        if (copies) {
            var content = document.getElementById('ticketContainer');
            var pri = document.getElementById('ticketcontentstoprint').contentWindow;
            pri.document.open();
            pri.document.write(content.innerHTML);
            pri.focus();
            pri.print();
            pri.document.close();
        }
        let printAction = confirmBookingActions.updatePrintStatus({ booking_id: this.props.blockedSeatResponseData.id }, isOnline);
        printAction.then((data) => {
            isSocketConnected() && postman.publish('online', true);
            if (data.result == 'Done') {
                postman.publish('showToast', {
                    message: 'Booking Successful!',
                    type: 'success'
                });
                this.props.goback();
                if (this.props.type == 'find') {
                    postman.publish('switchTabEvt', 'BookTickets');
                }
            } else {
                postman.publish('showToast', {
                    message: data.error,
                    type: 'error'
                });
            }
        });

    }
    // This is for payment mode selection operation
    modeChanged(e) {
        this.setState({
            paymentMode: e.target.value
        }, () => {
            if (this.state.paymentMode == 2) { //check if Cash mode selected otherwise hide calculator
                this.setState({
                    showCalculator: true
                });
            } else {
                this.setState({
                    showCalculator: false
                });
            }
        });

    }

    /**
     * This method works when book the seats and print the ticket
     * */
    async handleConfirmAndPrint(bookingDetail) {
        let appOnlineAllow = confirmBookingActions.getOnlineStatusLocal();
        let isOnline = (appOnlineAllow == 'yes') ? 1 : 0;
        let showDate = _.get(bookingDetail, 'instance.start_date_time', null);
        let quotaPrices = this.state.quotaPrices;
        if (showDate === null ||
            moment(showDate).format() < moment(new Date()).subtract(this.state.posCutOffTime, 'm').format() ||
            moment(showDate).format('YYYY-MM-DD') > moment(new Date()).add(6, 'days').format('YYYY-MM-DD')) {
            postman.publish('showToast', {
                message: 'Show Date should be between today\'s date and  next 7 days !',
                type: 'error'
            });
            return;
        }
        if (!this.state.paymentMode) {
            postman.publish('showToast', {
                message: 'Please select a payment method!',
                type: 'error'
            });
        } else {

            let projection = (this.state.bookingDetail.projection == '2D' || this.state.movieProjects.indexOf(this.state.bookingDetail.projection) > -1) ? this.state.bookingDetail.projection : '3D';
            let bookingId = this.props.blockedSeatResponseData.id ? this.props.blockedSeatResponseData.id : '';
            let bookingType = [
                this.state.normalCount ? this.state.normalCount : 0,
                this.state.compCount ? this.state.compCount : 0,
                this.state.defCount ? this.state.defCount : 0,
                projection
            ].join('-');
            let reaqData = {
                booking_id: bookingId,
                payment_mode: this.state.paymentMode ? this.state.paymentMode : 0,
                booking_type: bookingType,
                seat_details: bookingDetail.seat_details,
                ssn_instance_id: bookingDetail.instance.id
            };

            //if master generate opening/closing count in IDB
            // Invoice number has to be updated

            if (appOnlineAllow == 'yes') {
                let bookingObj = {
                    'id': bookingId,
                    'browserId': this.state.browserId,
                    'transactionId': this.state.transactionId,
                    'booking_type': bookingType,
                    //'counter': this.state.isMaster ? reaqData.counter : null,
                    'payment_mode': this.state.paymentMode ? this.state.paymentMode : 0 //2=>Cash,4=>Paytm,8=>Credit Card,16=>Debit Card
                };
                reaqData['is_slave'] = this.state.isMaster;
                IdbRTC.bookSeat(reaqData, isOnline).then((data) => {
                    let invoicdetail = data.bookingData.invoice; //todo
                    if (data.result) {
                        this.setState({
                            invoiceList: invoicdetail,
                            bookingUpdated: data.bookingData.updated_at //todo
                        });

                        bookingDetail['invoiceList'] = invoicdetail ? invoicdetail.split(',') : [];
                        bookingObj['invoice'] = invoicdetail ? invoicdetail : '';
                        IdbRTC.getCinemas().then(cinemaDetails => {
                            this.setState({
                                invoice: cinemaDetails[0] && cinemaDetails[0].invoice
                            });
                            bookingObj['invoice'] = cinemaDetails[0] && cinemaDetails[0].invoice;
                            let resp = confirmBookingActions.onlineBooking(bookingObj);
                            resp.then((response) => {
                                if (response.json) {
                                    if (response.status === 400) {
                                        response.json().then((data) => {
                                            postman.publish('showToast', {
                                                message: data.error.message,
                                                type: 'error'
                                            });
                                        });
                                        //if master and BO booking failed revert opening/closing count in IDB
                                    } else if ((response.status === 200)) {
                                        //Boxoffice booking done, book in IDB
                                        response.json().then((respData) => {
                                            this.setState({
                                                ticketBooked: true,
                                                bookingId: bookingId
                                            });
                                            sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
                                            this.handlePrintTicket(bookingDetail);
                                        });
                                    }
                                } else {
                                    if (response.hasOwnProperty('error')) {
                                        postman.publish('showToast', {
                                            message: response.error.message,
                                            type: 'error'
                                        });
                                        //if master and BO booking failed revert opening/closing count in IDB
                                    } else if ((response.result)) {
                                        //Boxoffice booking done, book in IDB
                                        this.setState({
                                            ticketBooked: true,
                                            bookingId: bookingId
                                        });
                                        sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
                                        this.handlePrintTicket(bookingDetail);
                                    } else if (response.mstatus) {
                                        this.setState({
                                            ticketBooked: true,
                                            bookingId: bookingId
                                        });
                                        sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
                                        this.handlePrintTicket(bookingDetail);
                                    }
                                }

                            });
                        });
                    } else {
                        postman.publish('showToast', {
                            message: data.error,
                            type: 'error'
                        });
                    }

                });
            } else if (appOnlineAllow == 'no') {
                //Offline booking
                if (bookingId) {
                    reaqData['is_slave'] = this.state.isMaster;
                    IdbRTC.bookSeat(reaqData, 0).then((data) => {
                        if (data.result == 'Done') {
                            let invoicdetail = data.bookingData.invoice;
                            bookingDetail['invoiceList'] = invoicdetail ? invoicdetail.split(',') : [];
                            this.setState({
                                invoiceList: invoicdetail ? invoicdetail : '',
                                bookingUpdated: data.bookingData.updated_at
                            });
                            if (bookingDetail.invoiceList) {
                                this.setState({
                                    ticketBooked: true,
                                    bookingId: bookingId
                                });
                                sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
                                this.handlePrintTicket(bookingDetail);
                            } else {
                                postman.publish('showToast', {
                                    message: 'No Invoice Number is Generated',
                                    type: 'error'
                                });
                            }
                        } else {
                            postman.publish('showToast', {
                                message: data.error,
                                type: 'error'
                            });
                        }
                    });
                } else {
                    postman.publish('showToast', {
                        message: 'Bookind id not available!',
                        type: 'error'
                    });
                }
            }
        }

    }

    /**
     *
     * This method is to modify seats from layout
     * */
    handleModifySeats = () => {
        this.props.handleModifySeats(this.props.sessionDataForLayout);
    }

    /**
     * This is to cancel the telebooked seats
     * */
    cancleTeleBlock = () => {
        this.props.handleCancelTeleBlocked(this.props.teleBookedData);
        this.handleCancelBooking();
    }
    // This handler workds when we increenting or decreementing the price
    handlePriceChange(opType, index) {
        let currQuotaPrices = this.state.quotaPrices;
        let genPrice = this.state.genPrice ? Number(this.state.genPrice.nett) + Number(this.state.genPrice.sgst) + Number(this.state.genPrice.cgst) + Number(this.state.genPrice.ltax) : 0;
        let totalAmt = 0;
        if (opType == 'inc') {
            if (currQuotaPrices[index] && currQuotaPrices[0].count > 0) {
                currQuotaPrices[index].count = Number(currQuotaPrices[index].count + 1);
                currQuotaPrices[0].count = Number(currQuotaPrices[0].count - 1);
                currQuotaPrices[0].total = Number(currQuotaPrices[0].total - genPrice);
                currQuotaPrices[index].total = Number(currQuotaPrices[index].price) * Number(currQuotaPrices[index].count);
            }
        } else {
            if (currQuotaPrices[index] && Number(currQuotaPrices[index].count) > 0) {
                currQuotaPrices[index].count = Number(Number(currQuotaPrices[index].count) - 1);
                currQuotaPrices[0].count = Number(currQuotaPrices[0].count + 1);
                currQuotaPrices[0].total = Number(currQuotaPrices[0].total + genPrice);
                currQuotaPrices[index].total = currQuotaPrices[index].count > 0 ? Number(currQuotaPrices[index].total) - Number(currQuotaPrices[index].price) : 0;
            } else {
                currQuotaPrices[index].total = 0;
            }
        }

        this.setState({
            quotaPrices: currQuotaPrices
        });
        //calculate total amount and set here
        currQuotaPrices && currQuotaPrices.map((data, index) => {
            totalAmt = Number(totalAmt) + Number(data.total);
            //check and set count of each selection
            if (data.label == 'General') {
                this.setState({
                    normalCount: data.count
                });
            } else if (data.label == 'Defense Personnel') {
                this.setState({
                    compCount: data.count
                });
            } else if (data.label == 'Complementary') {
                this.setState({
                    defCount: data.count
                });
            }
        });
        let totalCount = (this.state.normalCount ? Number(this.state.normalCount) : 0) + (this.state.compCount ? Number(this.state.compCount) : 0) + (this.state.defCount ? Number(this.state.defCount) : 0);
        let threeDCharge = this.state.movieProjects.indexOf(this.state.bookingDetail.projection) > -1 ? (Number(this.state.proj3dCharges.nett) + Number(this.state.proj3dCharges.sgst) + Number(this.state.proj3dCharges.cgst) + Number(this.state.proj3dCharges.ltax)) * totalCount : null;
        totalAmt = threeDCharge ? (threeDCharge + totalAmt) : totalAmt;
        let maintenanceCharge = (Number(this.state.projMaintenanceCharges.nett) + Number(this.state.projMaintenanceCharges.sgst) + Number(this.state.projMaintenanceCharges.cgst) + Number(this.state.projMaintenanceCharges.ltax)) * totalCount;
        totalAmt = maintenanceCharge ? (maintenanceCharge + totalAmt) : totalAmt;
        this.setState({
            finalAmount: totalAmt.toFixed(2)
        });

    }

    /*React lifecycle method to render html of component*/
    render() {
        let bookingDetail = this.state.bookingDetail ? this.state.bookingDetail : {};
        let seatCountsArr = confirmBookingActions.getSeats(this.props.seatDetails, 'object');
        let genTicketCount = bookingDetail ? seatCountsArr.length : 0;
        let duration = this.props.sessionDataForLayout.duration ? this.props.sessionDataForLayout.duration : 0;
        let totalAmt = this.props.store.formReducer.totalAmount ? this.props.store.formReducer.totalAmount.toFixed(2) : this.props.store.formReducer.totalAmount;
        let framestyle = {
            height: '0px',
            width: '0px',
            position: 'absolute',
            visibility: 'hidden'
        };
        return (
            <div className="confirmBooking">
                {this.props.type !== 'find' && <div className="navigationRow">
                    <div className="colLeft">
                        <span className="tabs screenName">Confirm Booking</span>
                    </div>
                    <div className="colRight">
                        {!this.state.ticketBooked &&
                            <span id="myBtn"
                                className="tabs actionLink"
                                onClick={() => {
                                    this.confirmCancelBooking();
                                }}>Cancel Booking</span>
                        }
                    </div>
                </div>}
                <div className="bookingDetails">
                    {bookingDetail && <div className={'leftSide ' + ((this.props.type == 'find') ? 'teleBookings' : '')} style={{ 'width': this.props.type == 'find' ? '65%' : '' }}>
                        <div
                            className="title">{bookingDetail.display + '(' + bookingDetail.censor + ')' + ' | ' + bookingDetail.language}</div>
                        <div className="items">
                            <div className="item">
                                <div
                                    className="value">{confirmBookingActions.getMovieDateTime(bookingDetail.instance.start_date_time, 'date')}</div>
                                <div className="field">Date</div>
                            </div>
                            <div className="item">
                                <div
                                    className="value">{confirmBookingActions.getMovieDateTime(bookingDetail.instance.start_date_time, 'time')}</div>
                                <div className="field">Time</div>
                            </div>
                            <div className="item">
                                <div
                                    className="value">{confirmBookingActions.getSeats(bookingDetail.seat_details, 'string')}
                                </div>
                                <div className="field">Seats
                                    {this.props.type == 'find' && <a onClick={this.handleModifySeats} className="showSecialStatus" style={{'marginLeft': '52px', 'cursor': 'pointer', 'color': 'blue' }}>Modify</a>}
                                </div>
                            </div>
                            {this.props.type == 'find' && <div className="item">
                                <div
                                    className="value">{this.props.teleBookedData[0].pax_info.name}
                                </div>
                                <div className="field">Name
                                    {this.props.type == 'find' && <a className="showSecialStatus" onClick={this.cancleTeleBlock} style={{ 'float': 'right', 'cursor': 'pointer', 'color': 'blue' }}>Cancel Telebooking</a>}
                                </div>
                            </div>}
                            <div className="item">
                                <div
                                    className="value">{genTicketCount}</div>
                                <div className="field">No. of Tickets</div>
                            </div>
                            <div className="item">
                                <div className="value">{this.state.audiName ? this.state.audiName : 'NA'}</div>
                                <div className="field">Audi</div>
                            </div>
                            <div className="item">
                                <div className="value">{confirmBookingActions.getMovieDuration(duration)}</div>
                                <div className="field">Duration</div>
                            </div>
                            {this.props.type == 'find' && <div className="item">
                                <div
                                    className="value">{this.props.teleBookedData[0].pax_info.tele_book_no}
                                </div>
                                <div className="field">Phone Number
                                </div>
                            </div>}
                        </div>
                    </div>}
                    <div className="rightSide">
                        {this.state.quotaPrices && this.state.quotaPrices.map((data, index) => {
                            return (<div key={'price' + index}>
                                <div className="quotaPriceDetails">
                                    <span className="quotaName">{data.label}</span>
                                    <span className="quotaPrice">Rs. {data.price.toFixed(2)}</span>
                                    <span className="quotaCount">
                                        <div className="numericSelector commonClass">
                                            {data.label != 'General' && <span data-value="minus" onClick={() => { this.handlePriceChange('desc', index); }}>-</span>}
                                            <label className={'ticketCount ' + data.label} >{data.count}</label>
                                            {data.label != 'General' && <span data-value="plus" onClick={() => { this.handlePriceChange('inc', index); }}>+</span>}
                                        </div>
                                    </span>
                                    <span className="quotaTotal">Rs. {data.total.toFixed(2)}</span>
                                </div>
                            </div>);
                        })
                        }
                        {(this.state.movieProjects.indexOf(this.state.bookingDetail.projection) > -1) &&
                            <div className="_3dCharges">
                                <div className="quotaPriceDetails">
                                    <span className="quotaName">3D Charge</span>
                                    <span className="quotaTotal">Rs. {((Number(this.state.proj3dCharges.nett) + Number(this.state.proj3dCharges.sgst) + Number(this.state.proj3dCharges.cgst) + Number(this.state.proj3dCharges.ltax)) * Number(genTicketCount)).toFixed(2)}</span>
                                </div>
                            </div>
                        }
                        <div className="_3dCharges">
                            <div className="quotaPriceDetails">
                                <span className="quotaName">Maintenance Charges Charge</span>
                                <span className="quotaTotal">Rs. {((Number(this.state.projMaintenanceCharges.nett) + Number(this.state.projMaintenanceCharges.sgst) + Number(this.state.projMaintenanceCharges.cgst) + Number(this.state.projMaintenanceCharges.ltax)) * Number(genTicketCount)).toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="finalAmount">
                            <div className="title">Total Amount to be collected</div>
                            <div className="amount">Rs. {this.state.finalAmount}</div>
                        </div>
                        <button onClick={() => {
                            this.handleConfirmAndPrint(bookingDetail);
                        }} disabled={this.state.ticketBooked}>Confirm & Print Ticket
                        </button>
                        <iframe id="ticketcontentstoprint" style={framestyle}></iframe>
                        <div id="ticketContainer">
                            {(this.state.template == 1) && this._3x3TicketCopies(bookingDetail)}
                            {(this.state.template == 2) && this._4x1_25TicketCopies(bookingDetail)}
                            {(this.state.template == 3) && this._3x6TicketCopies(bookingDetail)}
                            {(this.state.template == 4) && this._3x8TicketCopies(bookingDetail)}
                            {(this.state.template == 5) && this._3x1TicketCopies(bookingDetail)}
                            {(this.state.template == 6) && this._3x4MultiTicketCopies(bookingDetail)}
                            {(this.state.template == 7) && this._3x8TicketCopies_mc(bookingDetail)}
                            {(this.state.template == 8) && this._3x1TicketCopies_mc(bookingDetail)}
                            {(this.state.template == 9) && this._3x4MultiTicketCopies_mc(bookingDetail)}
                        </div>
                    </div>
                </div>

                <div className="paymentMode">
                    <div className="title">Payment Method</div>
                    <ul className="items">
                        {modeConfig && modeConfig.map((data, index) => {
                            return (<li key={'item' + index} className="value">
                                <input type="radio"
                                    onChange={(e) => {
                                        this.modeChanged(e);
                                    }}
                                    id={'mode' + data.dbValue}
                                    name="paymentMode"
                                    value={data.dbValue} />
                                <label className="field" htmlFor={'mode' + data.dbValue}>{data.mode}</label>
                            </li>);
                        })}

                    </ul>
                </div>
                {this.state.showCalculator &&
                    <div className="changeCalculator">
                        <div className="leftSide">
                            <div className="title">Calculate Change</div>
                            <div className="subtitle">Select notes given by customer:</div>
                            <FormElements />
                        </div>
                        <div className="rightSide">
                            <div className="title">Total Amount Received</div>
                            <div className="amount">Rs. {totalAmt}</div>
                            {(totalAmt > this.state.finalAmount) &&
                                <div>
                                    <div className="title">Total Amount to be Paid Back</div>
                                    <div className="amount">
                                        Rs. {(totalAmt - this.state.finalAmount).toFixed(2)}</div>
                                </div>
                            }
                        </div>
                    </div>
                }
                <Modal modalHeader={this.state.modalHeader}
                    modalBody={this.state.modalBody}
                    modalFooter={this.state.modalFooter}
                    showModal={this.state.showModal}
                    handleCheckStateModal={this.handleCheckStateModal} />
            </div>
        );
    }
}


function mapStateToProps(state) {
    return {
        store: state
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators({ headerActions, confirmBookingActions }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ConfirmBooking);