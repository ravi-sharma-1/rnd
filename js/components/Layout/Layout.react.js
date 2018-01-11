// @flow
import React, { Component } from 'react';
import $ from 'jquery';
import './Layout.scss';
import _ from 'lodash';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as layoutAction from '../../actions/layoutAction';
import * as confirmBookingActions from '../../actions/confirmBookingActions';
import { getOnlineStatusLocal } from '../../actions/confirmBookingActions';
import { validationService } from '../../utils/validationUtility';
import { formateFinalDate } from '../../utils/utils';
import { serverLogging, clientLogging } from '../../utils/logging';
import postman from '../../utils/postman';
import ConfirmBooking from '../ConfirmBooking/ConfirmBooking.react';
import { isSocketRegistered, isSocketConnected } from '../../utils/sockets';
import IdbRTC from '../../utils/idb_rtc';
import { sendMessageToAll } from '../../utils/sockets';
import ModalNew from '../../common/components/ModalNew/ModalNew';
import TelebookingForm from './TelebookingForm.react';
const webApis = require('../../../idb/apis/webApis');
import moment from 'moment';
import { fetchWithError } from '../../utils/fetch';
import { syncUrl } from '../../utils/urls';
import LayoutJson from './SeatLayout.json';
var self;
var tempStore;
var temphold=[];
var bookingStore = {};
var isAlreadyLoad = false;
class Layout extends Component {
    constructor(props, context) {
        super(props, context);
        self = this;
        this.state = {
            'layoutObjData': [],
            'confirmBooking': false,
            'isBack': 'no',
            'selectedSeats': [],
            'holdSheets': [],//while refresh this select this value
            'blockedSeatData': {},//save this data while telebooking
            'audiName': '',
            'blockedSeatResponseData': '',
            'cinemaId': '',
            'isMaster': '',
            'showModal': false,
            'teleUnblock': false,
            'isTelebookNotAllowed': false //This is setting based on session timer
        };
    }


    /**
     * Here we are coming back from confirm booking to this page
     * */

    handleSetShowLayout = (flag, backStatus) => {
        self.setState({ 'confirmBooking': flag, 'isBack': backStatus, layoutObjData: {} });
        self.callForFreshLayout();
    };

    /**
     * Here we are going back to booking screen
     * */

    handleBackToBooking() {
        self.props.handeBacktoBooking(false);
    }

    /**
     * This method is for increement the grid seat number for all the seats by 1
     * */

    buildStandardObj() {
        self.state.layoutObjData.map(function (category, catIndex) {
            category.objRow.map(function (rows, rowIndex) {
                var lstColObj = rows.objSeat[rows.objSeat.length - 1];
                var firstColObj = rows.objSeat[0];
                rows.objSeat.map(function (cols, colIndex) {
                    cols.GridSeatNum = cols.GridSeatNum + 1;
                });
            });
        });
        self.setState({
            layoutObjData: self.state.layoutObjData
        }, function () {

        });
    }

    /**
     *  This mathod is to find the price of associated category
     * */


    getCategoryPrice(catInfo) {
        // This has to be changed
        var finalPrice = 0;
        let fields = ['3D_cgst', '3D_ltax', '3D_nett', '3D_sgst', 'cgst', 'l_tax', 'sgst', 'price', 'maintenance_cgst', 'maintenance_sgst', 'maintenance_ltax', 'maintenance_nett'];
        if (self.props.sessionDataForLayout && self.props.sessionDataForLayout.instance && self.props.sessionDataForLayout.instance.categories) {
            var catObj = self.props.sessionDataForLayout.instance.categories;
            catObj.length > 0 && catObj.map(function (sessionData, sessionIndex) {
                if (sessionData['seat_category'] == catInfo.AreaCode) {
                    fields.map((field) => {
                        finalPrice = finalPrice + _.get(sessionData, `[${field}]`, 0);
                    });
                }
            });
        }
        return finalPrice;
    }

    /**
     * This is to build our custom object for layout include the respose from idb and blank cells and column
     * */
    buildSeatLayoutRows() {
        if (!_.isEmpty(this.state.layoutObjData)) {
            self.buildStandardObj();
            tempStore = 0;
            this.state.layoutObjData.map(function (category, index) {
                category.objRow = self.buildSeatLayoutRowsData(category.objRow, category.max_rows, function (rindex) {
                    return {
                        'GridRowId': rindex,
                        'PhyRowId': '',
                        'objSeat': []
                    };
                });
                category.objRow.length > 0 && category.objRow.map(function (rows, rowIndex) {
                    rows.objSeat = self.buildSeatLayoutColData(rows.objSeat, 'GridSeatNum', function (cindex) {
                        return {
                            'GridSeatNum': cindex + 1,
                            'SeatStatus': '0',
                            'seatNumber': ''
                        };
                    });
                    rows['actualRowIndex'] = rowIndex;
                    rows.objSeat.map(function (cols, colIndex) {
                        cols['isSelected'] = false;
                        cols['reservedSeat'] = cols.hasOwnProperty('ReservedSeat') ? cols.ReservedSeat : '';
                        cols['price'] = self.getCategoryPrice(category);
                        cols['actualColIndex'] = colIndex;
                        cols['teleBookedStatus'] = ((self.props.type == 'find') && (self.props.teleBookedData[0].tele_book_no == cols.tele_book_no)) ? 2 : 1;
                    });
                });
            });
            this.setState({
                'layoutObjData': this.state.layoutObjData,
                'blockedSeatData': ''/*layoutAction.getSeatBlockObjForBackend().seatBlockObj*/
            }, function () {
                isAlreadyLoad = true;
                self.updatePreviousSelectedValue();
                this.updateTeleBookingIndex(this.state.layoutObjData);

            });
        }
    }
    /**
     * This method is for updating additional field for telebooked seats
     * */

    updateTeleBookingIndex = (data) => {
        bookingStore = {};
        data.map((cat, catIndex) => {
            cat.objRow.map((rows, rowIndex) => {
                rows.objSeat.map((col, colIndex) => {
                    if (col.hasOwnProperty('tele_book_no')) {
                        if (col.tele_book_no) {
                            if (Array.isArray(bookingStore[col.tele_book_no])) {
                                let phoneKeys = Object.keys(bookingStore);
                                let indPhone = phoneKeys.indexOf(col.tele_book_no);
                                if (indPhone > -1) {
                                    bookingStore[phoneKeys[indPhone]].push({
                                        categoryInfo: cat.AreaDesc,
                                        areaCode: cat.AreaCode,
                                        rowId: rows.GridRowId,
                                        PhyRowId: rows.PhyRowId,
                                        actualRowIndex: rows.actualRowIndex,
                                        GridSeatNum: col.GridSeatNum,
                                        isSelected: col.isSelected,
                                        actualColIndex: col.actualColIndex,
                                        tele_book_no: col.tele_book_no,
                                        seatNumber: col.seatNumber,
                                        teleBookedStatus: col.teleBookedStatus
                                    });
                                }
                            } else {
                                bookingStore[col.tele_book_no] = [{
                                    categoryInfo: cat.AreaDesc,
                                    areaCode: cat.AreaCode,
                                    rowId: rows.GridRowId,
                                    PhyRowId: rows.PhyRowId,
                                    actualRowIndex: rows.actualRowIndex,
                                    GridSeatNum: col.GridSeatNum,
                                    isSelected: col.isSelected,
                                    actualColIndex: col.actualColIndex,
                                    tele_book_no: col.tele_book_no,
                                    seatNumber: col.seatNumber,
                                    teleBookedStatus: col.teleBookedStatus
                                }];
                            }
                        }
                    }
                });
            });
        });
        // Here we are updating seat status when opening up the layout for modify seats.
        if (this.props.teleBookedData && this.props.teleBookedData.length && this.props.teleBookedData[0].tele_book_no && (this.props.type == 'find')) {
            let bookingStoreCopy = $.extend(true, {}, bookingStore);
            //here we are showing all the selected seats in modify seats
            self.state.selectedSeats = self.props.selSeats.length && self.props.selSeats || bookingStoreCopy[this.props.teleBookedData[0].tele_book_no];
            if (self.props.selSeats.length > 0) {
                let fieldsToUpdate = {
                    'isSelected': true,
                    'tele_book_no': self.props.teleBookedData.length && self.props.teleBookedData[0].tele_book_no || ''
                };
                self.updateLayoutBasedOnSelectedSeats(fieldsToUpdate);
            }
            self.setState({
                selectedSeats: self.state.selectedSeats,
                itemCategory: self.state.selectedSeats && self.state.selectedSeats[0] && self.state.selectedSeats[0].categoryInfo
            }, () => {
                self.updateLayoutBasedOnSelectedSeats({
                    'isSelected': true
                });
            });
        }
    }

    /***
     *
     *  Check all seats with same mobile number
     */
    checkAllWithSameNumber = () => {
        if (self.props.type == 'find') {
            let itemPresent = false;
            let bookingStoreCopy = $.extend(true, {}, bookingStore), existingItemArray = bookingStoreCopy[this.props.teleBookedData[0].tele_book_no], len = existingItemArray && existingItemArray.length, val = 0;
            self.state.selectedSeats && self.state.selectedSeats.length && self.state.selectedSeats.map((items) => {
                existingItemArray.map((exItems, exIndex) => {
                    if (JSON.stringify(items) == JSON.stringify(exItems)) {
                        val++;
                    }
                });
            });
            return (val == len) && (len == self.state.selectedSeats.length) ? true : false;
        }
    }

    /**
     * This is to build seatlayout rows when layout is drawn with empty cells
     * */
    buildSeatLayoutRowsData(collection, maxSize, callBack) {
        if (collection.length > 0) {
            for (var i = 1; i < maxSize + 1; i++) {
                var isRow = collection[i - 1] && collection[i - 1].GridRowId == tempStore ? true : false;
                if (isRow) {

                } else {
                    collection.splice(i - 1, 0, callBack(tempStore));
                }
                tempStore++;
            }
        }
        return collection;
    }

    /**
     *
     * This method is to build column data with empty cells
     * */

    buildSeatLayoutColData(collection, props, callBack) {
        if (collection.length > 0) {
            var getLastRowValue = collection[collection.length - 1][props];
            for (var i = 0; i <= getLastRowValue - 1; i++) {
                var gridId = collection[i] && collection[i][props] ? collection[i][props] : '';
                if (gridId && (i + 1 == collection[i][props])) {
                } else {
                    collection.splice(i, 0, callBack(i));
                }
            }
        }
        return collection;
    }

    /**
     * This is utility method have dependency with layout
     * */
    findDuplicateObjIndex(arr, obj, props, propsNew) {
        var itemIndex = -1;
        arr.map(function (item, index) {
            if (item[props] == obj[props] && item[propsNew] == obj[propsNew]) {
                itemIndex = index;
            }
        });
        return itemIndex;
    }

    /**
     *  This is to reset layout means no seat selected
     * */
    resetLayoutSelectFlag() {
        if (self.state.layoutObjData.length > 0) {
            self.state.layoutObjData.map(function (categoryObj, catIndex) {
                categoryObj.objRow.map(function (rows, rowIndex) {
                    rows.objSeat.map(function (cols, colIndex) {
                        cols.isSelected = false;
                    });
                });
            });
        }
        self.setState({
            'layoutObjData': self.state.layoutObjData
        });
    }

    /**
     * Utils for book seat string
     * */

    stringFromColl(selectedValue) {
        var finalArray = [];
        selectedValue.map(function (value, index) {
            let str = value.areaCode + '-' + value.rowId + '-' + value.actualColIndex + '|' + value.areaCode + '-' + value.PhyRowId + '-' + value.seatNumber;
            finalArray.push(str);
        });
        return finalArray.join(';');
    }

    /**
     * Utils for book seat string  + "|" + value.areaCode + "-" +value.PhyRowId+"-"+value.seatNumber;
     * */
    stringFromCollLocalDb(selectedValue) {
        let seat_details = [], user_seat_details = [];
        selectedValue.map(function (value, index) {
            seat_details.push(value.areaCode + '-' + value.rowId + '-' + value.actualColIndex);
            user_seat_details.push(value.areaCode + '-' + value.PhyRowId + '-' + value.seatNumber);
        });
        seat_details = seat_details.join(';');
        user_seat_details = user_seat_details.join(';');
        return (seat_details + '|' + user_seat_details);
    }

    /**
     * Select Deselect seats it's most reusable method.  here field object will have the flag info and and layout will set based on  selectedSeats.
     * **/
    updateLayoutBasedOnSelectedSeats = (fieldObj) => {
        self.resetSelectLayout();
        if (self.state.selectedSeats && self.state.selectedSeats.length > 0) {
            self.state.selectedSeats.map((selectedValue, selectedIndex) => {
                self.setSeatStatus(selectedValue.areaCode, selectedValue.actualRowIndex, selectedValue.actualColIndex, fieldObj);
            });
        } else {
            self.resetSelectLayout();
        }
    }

    /**
     * Select deselect seat logic and total count selection is implemented here.
     * */
    selectDeselectSeat(selectedObj, rowObjInfo, category, originalRowIndex, originalColumnIndex, e) {
        let fieldsToBeUpdated = {};
        if ((selectedObj.SeatStatus == '0') || (selectedObj.SeatStatus == '2')) {
            var isDeSelectCell = false;
            if (self.state.layoutObjData.length > 0) {
                let selectedObjInfo = {};
                selectedObjInfo['categoryInfo'] = category.AreaDesc;
                selectedObjInfo['areaCode'] = category.AreaCode;
                selectedObjInfo['rowId'] = rowObjInfo.GridRowId;
                selectedObjInfo['PhyRowId'] = rowObjInfo.PhyRowId;
                selectedObjInfo['actualRowIndex'] = rowObjInfo.actualRowIndex;
                selectedObjInfo['GridSeatNum'] = selectedObj.GridSeatNum;
                selectedObjInfo['isSelected'] = selectedObj.isSelected;
                selectedObjInfo['actualColIndex'] = selectedObj.actualColIndex;
                selectedObjInfo['tele_book_no'] = selectedObj.tele_book_no;
                selectedObjInfo['seatNumber'] = selectedObj.seatNumber;
                selectedObjInfo['teleBookedStatus'] = selectedObj.teleBookedStatus;
                if (self.props.type == 'session') {
                    //This is for session
                    if (selectedObj.tele_book_no) {
                        self.state.selectedSeats = [];
                        let bookingStoreCopy = $.extend(true, {}, bookingStore);
                        self.state.selectedSeats = bookingStoreCopy[selectedObj.tele_book_no];
                        self.setState({
                            'teleUnblock': true
                        });
                    } else {
                        if (self.state.selectedSeats.length && self.state.selectedSeats[0].tele_book_no) {
                            self.state.selectedSeats = [];
                        }
                        self.state.selectedSeats = self.normalSelect(self.state.selectedSeats, selectedObj, selectedObjInfo, category,
                            (statusInfo, removedSeats) => {

                            });
                        self.setState({
                            teleUnblock: false
                        });
                    }
                    fieldsToBeUpdated = { 'isSelected': true };

                } else if (self.props.type == 'find') {
                    //todo this can be changed into object depends on backend
                    let teleBookedStatus = self.state.selectedSeats.length && self.state.selectedSeats[0].teleBookedStatus;
                    let atleastOneNum = 0;
                    self.state.selectedSeats.length && self.state.selectedSeats.map((sel, selIndex) => {
                        if (sel.tele_book_no == self.props.teleBookedData[0].tele_book_no) {
                            atleastOneNum = atleastOneNum + 1;
                        }
                    });

                    //Remove phone number, telebooked status

                    if ((selectedObj.teleBookedStatus == 2) || !selectedObj.tele_book_no || selectedObj.tele_book_no == self.props.teleBookedData[0].tele_book_no) {
                        //can be repeated code
                        self.state.selectedSeats = self.normalSelect(self.state.selectedSeats, selectedObj, selectedObjInfo, category,
                            (statusInfo, removedSeats) => {
                                let objForRemove = {
                                    'tele_book_no': '',
                                    'isSelected': false
                                };
                                self.setSeatStatus(removedSeats.areaCode, removedSeats.actualRowIndex, removedSeats.actualColIndex, objForRemove);
                            }, (typeStatusNew) => {
                                if (typeStatusNew == 'categoryChanged') {
                                    if (self.state.selectedSeats.length) {
                                        self.state.selectedSeats.map((selSeats, selIndex) => {
                                            let objForRemove = {
                                                'tele_book_no': '',
                                                'isSelected': false
                                            };
                                            self.setSeatStatus(selSeats.areaCode, selSeats.actualRowIndex, selSeats.actualColIndex,
                                                objForRemove);
                                        });
                                    }

                                }
                            });
                    }


                    fieldsToBeUpdated = {
                        'isSelected': true,
                        'tele_book_no': self.props.teleBookedData.length && self.props.teleBookedData[0].tele_book_no || '',
                        'teleBookedStatus':2
                    };
                    selectedObjInfo['teleBookedStatus'] = 2;
                    selectedObjInfo['tele_book_no'] = self.props.teleBookedData.length && self.props.teleBookedData[0].tele_book_no || '';
                }
                self.setState({ selectedSeats: self.state.selectedSeats, itemCategory: self.state.selectedSeats[0] && self.state.selectedSeats[0].categoryInfo }, () => {
                    self.updateLayoutBasedOnSelectedSeats(fieldsToBeUpdated);
                });
            }
        }
    }

    /**
     * Normal Selection
     * */
    normalSelect = (selectedSeatDetail, selectedObj, selectedObjInfo, category, cb, cb_new) => {
        if (selectedSeatDetail.length == 0 && !selectedObj.isSelected) {
            selectedSeatDetail.push(selectedObjInfo);
        } else if (selectedSeatDetail[0].areaCode == category.AreaCode) {
            var duplicateIndex = self.findDuplicateObjIndex(selectedSeatDetail, selectedObjInfo, 'GridSeatNum', 'PhyRowId');
            if (duplicateIndex > -1) {
                selectedSeatDetail.splice(duplicateIndex, 1);
                cb('unselect', selectedObjInfo);
            } else {
                if (selectedSeatDetail.length == 10) {
                    let removedSeats = selectedSeatDetail.shift();
                    cb('shiftRight', removedSeats);
                }
                selectedSeatDetail.push(selectedObjInfo);
            }
        } else {
            if (typeof cb_new == 'function') {
                cb_new('categoryChanged');
            }
            selectedSeatDetail = [];
            var duplicateIndex = self.findDuplicateObjIndex(selectedSeatDetail, selectedObjInfo, 'GridSeatNum', 'PhyRowId');
            if (duplicateIndex > -1) {
                selectedSeatDetail.splice(duplicateIndex, 1);
                cb('unselect', selectedObjInfo);
            } else {
                selectedSeatDetail.push(selectedObjInfo);
            }
        }
        return selectedSeatDetail;
    }
    /**
     * Reset Layout
     * */
    resetSelectLayout = () => {
        self.state.layoutObjData && self.state.layoutObjData.map((cat, catIndex) => {
            cat.objRow.map((row, rowIndex) => {
                row.objSeat.map((col, colIndex) => {
                    col.isSelected = false;
                });
            });
        });
        self.setState({ layoutObjData: self.state.layoutObjData });
    }
    /**
     * This method will pick index and set seat
     * */
    setSeatStatus = (catInfo, actualRowIndex, actualColIndex, fieldsObj) => {
        let fildObjKeys = Object.keys(fieldsObj);
        self.state.layoutObjData.map((cat, catIndex) => {
            if (cat.AreaCode == catInfo) {
                let fullColObj = cat.objRow[actualRowIndex].objSeat[actualColIndex];
                fildObjKeys.map((keyValue, ind) => {
                    fullColObj[keyValue] = fieldsObj[keyValue];
                });

            }
        });
        self.setState({ layoutObjData: self.state.layoutObjData });
    }
    /*
    * THis method is to get the master info for first time layout load
    * */

    getMasterInfo() {
        IdbRTC.findMasterInfo().then((data) => {
            data = data.result;
            let browserId = (data && data[0] && data[0].machine_id) || null;
            let tranId = (data && data[0] && data[0].transaction_id) || null;
            let isMaster = (data && data[0] && data[0].is_master) || null;
            this.setState({
                'browserId': browserId,
                'transactionId': tranId,
                'isMaster': isMaster
            });
        });
    }

    /**
     * Apply CSS based on seat status
     * */
    applySeatStatus(status) {
        var styleValue;
        switch (parseInt(status)) {
            case 0:
                styleValue = 'seatAvailable';
                break;
            case 1:
                styleValue = 'taken';
                break;
            case 3:
                styleValue = 'notAvailbale';
                break;
            default:
                styleValue = '';
        }
        return styleValue;
    }

    /**
     *  This mathod is to generate layout body
     *  */
    getSeatLayoutHTML(catgory) {
        let rowData = catgory.objRow ? catgory.objRow : [];
        return (<div>
            {rowData.length > 0 && rowData.map(function (rows, rowIndex) {
                return (<div key={'rowWrapper' + rowIndex.toString()}>
                    <ul key={'labelContainer' + rowIndex.toString()} className="labelContainer">
                        <li>
                            <span className="label">{rows.PhyRowId}</span>
                        </li>
                    </ul>
                    {rows.objSeat.length > 0 && rows.objSeat.map(function (cols, colIndex) {
                        var customStyle = self.applySeatStatus(cols.SeatStatus);
                        var customSpacing;
                        if (colIndex == 0) {
                            customSpacing = { 'marginLeft': self.state && self.state.leftspacing ? self.state.leftspacing : 0 };
                        } else {
                            customSpacing = {};
                        }
                        return (cols.seatNumber &&
                            <ul key={rows.PhyRowId + '-' + colIndex.toString()} className="seatLabelContainer"
                                style={customSpacing}>
                                <li className={'seatStyleContainer ' + customStyle + ' ' + (cols.isSelected ? 'active' : '') + ' ' + (cols.reservedSeat ? 'reservedSeatRules' : '') + (cols.tele_book_no ? 'tele-active' : '')}
                                    onClick={self.selectDeselectSeat.bind(null, cols, rows, catgory, rowIndex, colIndex)}>
                                    <span className="seatStyle">{cols.seatNumber}</span>
                                </li>
                            </ul> ||
                            <ul key={rows.PhyRowId + '-' + colIndex.toString()} style={customSpacing}
                                className="seatLabelContainer">
                                <li className="seatStyleContainerBlank">
                                    <span className="">&nbsp;</span>
                                </li>
                            </ul>);
                    })}
                </div>);
            })}
        </div>);
    }
    /**
     *
     * Online block hit
     * */
    onlineBlockPoint = (blockedSeatData, cbOnline, cbLocal) => {
        let bookingObj = {
            'browserId': this.state.browserId,
            'transactionId': this.state.transactionId
        };
        blockedSeatData['browserId'] = bookingObj.browserId;
        blockedSeatData['transactionId'] = bookingObj.transactionId;
        //blockedSeatData["ssn_instance_id"] = self.props.sessionDataForLayout.instance.id;
        var apiData = layoutAction.blockSeats(blockedSeatData);
        apiData.then((seatBlockedDetail) => {
            cbOnline(seatBlockedDetail);
            if (seatBlockedDetail.json) {
                seatBlockedDetail.json().then((sblDetail) => self.seatLayoutBlockUpdate(sblDetail, 'tele'));
            } else {
                if (seatBlockedDetail.hasOwnProperty('id')) {
                    self.seatLayoutBlockUpdate(seatBlockedDetail, 'tele');
                    clientLogging('block', 'Blocking updated successfully', 'info');
                    sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
                } else if (seatBlockedDetail.hasOwnProperty('mstatus')) {
                    self.offlineBlockPoint(blockedSeatData, (resp) => {
                        if (resp.hasOwnProperty('id')) {
                            self.setState({
                                'blockedSeatResponseData': resp,
                                'confirmBooking': false,
                                'showModal': true
                            }, () => {
                                clientLogging('block', 'Blocking updated successfully', 'info');
                                sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
                            });
                            clientLogging('block', 'Blocking updated successfully before telebooking', 'info');
                            serverLogging(JSON.stringify(resp) + 'Blocking updated successfully before telebooking offline');
                        } else if (resp.hasOwnProperty('error')) {
                            postman.publish('showToast', {
                                message: resp.error.message,
                                type: 'error'
                            });
                            self.setState({
                                showModal: false,
                                selectedSeats: []
                            }, ()=>{
                                self.callForFreshLayout();
                            });
                        }
                    });
                }
            }
        });
    }
    /**
     * Offline Block Info
     * */
    offlineBlockPoint = (blockedSeatData, cbLocal) => {
        blockedSeatData['cinema_id'] = self.state.cinemaId;
        var offlineBlock = layoutAction.setOfflineBlocking(blockedSeatData);
        offlineBlock.then(function (blockData) {
            cbLocal(blockData);
            if (blockData.hasOwnProperty('error')) {
                postman.publish('showToast', {
                    message: blockData.error,
                    type: 'error'
                });
                serverLogging(JSON.stringify(blockedSeatData) + JSON.stringify(blockData.error));
                self.resetLayoutSelectFlag();
                self.callForFreshLayout();
            } else if (blockData.hasOwnProperty('id') && blockData.id) {
                clientLogging('block', 'Blocking updated successfully', 'info');
                sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
            } else {
                postman.publish('showToast', {
                    message: 'Blocking not updated',
                    type: 'error'
                });
                self.setState({
                    showModal: false,
                    selectedSeats: []
                }, ()=>{
                    self.callForFreshLayout();
                });
                serverLogging(JSON.stringify(blockedSeatData) + 'Idb error: Id not find in local for block');
                clientLogging('block', 'Blocking not updated in localdb', 'error');
            }
        });
    }

    /**
     * This handle will work when we click on proceed button, this will also update the store and hit the seat block calls
     * */
    async proceedToBook() {
        var blockedSeatData = Object.assign({}, layoutAction.getSeatBlockObjForBackend().seatBlockObj);
        self.state.selectedSeats.map(function (selectedValue, selectedIndex) {
            blockedSeatData.category.push(selectedValue.areaCode ? selectedValue.areaCode : selectedValue.categoryInfo);
            blockedSeatData.index.push(selectedValue.GridSeatNum - 1);
            blockedSeatData.row.push(selectedValue.rowId);
        });
        blockedSeatData.ssn_instance_id = parseInt(self.props.sessionDataForLayout.instance.id);
        blockedSeatData['pos_user_id'] = parseInt(localStorage.getItem('userId'));
        self.props.seatSelectedFromLayout(self.state.selectedSeats);
        self.props.sessionDataForLayout['seat_details'] = self.stringFromColl(self.state.selectedSeats);
        //self.props.sessionData(self.props.sessionDataForLayout);
        await self.setState({
            blockedSeatData: blockedSeatData
        }, function () {
            var appOnlineAllow = getOnlineStatusLocal();
            function offlineInfoBlockInfo() {
                blockedSeatData['cinema_id'] = self.state.cinemaId;
                var offlineBlock = layoutAction.setOfflineBlocking(blockedSeatData);
                offlineBlock.then(function (blockData) {
                    if (blockData.hasOwnProperty('error')) {
                        postman.publish('showToast', {
                            message: blockData.error,
                            type: 'error'
                        });
                        serverLogging(JSON.stringify(blockData.error));
                        self.resetLayoutSelectFlag();
                        self.callForFreshLayout();
                    } else if (blockData.hasOwnProperty('id') && blockData.id) {
                        self.setState({
                            'blockedSeatResponseData': blockData,
                            'confirmBooking': true,
                            selectedSeats: []
                        }, () => {
                            clientLogging('block', 'Blocking updated successfully', 'info');
                            sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
                        });
                    } else {
                        postman.publish('showToast', {
                            message: 'Blocking not updated',
                            type: 'error'
                        });
                        self.setState({
                            showModal: false,
                            selectedSeats: []
                        }, ()=>{
                            self.callForFreshLayout();
                        });
                        clientLogging('block', 'Blocking not updated in localdb', 'error');
                    }
                });
            }
            if (appOnlineAllow == 'yes') {
                let bookingObj = {
                    'browserId': this.state.browserId,
                    'transactionId': this.state.transactionId
                };
                blockedSeatData['browserId'] = bookingObj.browserId;
                blockedSeatData['transactionId'] = bookingObj.transactionId;
                var apiData = layoutAction.blockSeats(blockedSeatData);
                apiData.then((seatBlockedDetail) => {
                    if (seatBlockedDetail.json) {
                        seatBlockedDetail.json().then((sblDetail) => self.seatLayoutBlockUpdate(sblDetail));
                    } else {
                        if (seatBlockedDetail.hasOwnProperty('id')) {
                            self.seatLayoutBlockUpdate(seatBlockedDetail);
                        } else if (seatBlockedDetail.hasOwnProperty('mstatus')) {
                            offlineInfoBlockInfo();
                        } else if (seatBlockedDetail.hasOwnProperty('error')) {
                            postman.publish('showToast', {
                                message: seatBlockedDetail.error.message,
                                type: 'error'
                            });
                            self.setState({
                                showModal: false,
                                selectedSeats: []
                            }, ()=>{
                                self.callForFreshLayout();
                            });
                        }
                    }
                });
            } else if (appOnlineAllow == 'no') {
                offlineInfoBlockInfo();
            } else {
                postman.publish('showToast', {
                    message: 'Booking not possible!',
                    type: 'error'
                });
                self.setState({
                    showModal: false,
                    selectedSeats: []
                }, ()=>{
                    self.callForFreshLayout();
                });
                clientLogging('block', 'Booking not possible!', 'error');

            }
        });
        self.makeSheetsInCenter(2);
    }
    /**
     * This method is used for logging an block online call and navigation from layout to confirm booking or on same page in telebooking case.
     * */

    seatLayoutBlockUpdate(sblDetail, teleStatus) {
        if (sblDetail.hasOwnProperty('error')) {
            //old special case
            if (sblDetail.error.title === 'NOSEAT') {
                postman.publish('showToast', {
                    message: sblDetail.error.message,
                    type: 'error'
                });
                self.setState({
                    showModal: false,
                    selectedSeats: []
                }, ()=>{
                    self.callForFreshLayout();
                });
            } else {
                postman.publish('showToast', {
                    message: sblDetail.error.message,
                    type: 'error'
                });
            }
            serverLogging(JSON.stringify(sblDetail.error.message));
            self.setState({
                'enableButton': true,
                selectedSeats: []
            });
            self.resetLayoutSelectFlag();
            self.callForFreshLayout();
        } else if (sblDetail.hasOwnProperty('id')) {
            var currentPos = parseInt(localStorage.getItem('userId'));
            var onlineBlockForLocal = layoutAction.getSeatBlockObjForBackend().seatBlockOnline;
            onlineBlockForLocal.booking_id = sblDetail.id;
            onlineBlockForLocal.seat_details = sblDetail.seatDetails;
            onlineBlockForLocal.seat_count = sblDetail.seatCount;
            onlineBlockForLocal.pos_user_id = currentPos;
            onlineBlockForLocal.ssn_instance_id = self.props.sessionDataForLayout.instance.id;
            onlineBlockForLocal.print_status = 0; //sblDetail.pos_user_id == currentPos ? 0 : 1;
            var onlineBlockUpdate = layoutAction.setOnlineBlocking(onlineBlockForLocal);
            onlineBlockUpdate.then(function (resp) {
                if (resp.hasOwnProperty('error')) {
                    postman.publish('showToast', {
                        message: resp.error,
                        type: 'error'
                    });
                    self.setState({
                        showModal: false,
                        selectedSeats: []
                    }, ()=>{
                        self.callForFreshLayout();
                    });
                    serverLogging(JSON.stringify(resp.error));
                } else if (resp.hasOwnProperty('id') && resp.id) {
                    if (teleStatus == 'tele') {
                        self.setState({
                            'blockedSeatResponseData': resp,
                            'confirmBooking': false,
                            'showModal': true
                        });
                    } else {
                        self.setState({
                            'blockedSeatResponseData': resp,
                            'confirmBooking': true,
                            selectedSeats: []
                        }, () => {
                            clientLogging('block', 'Blocking updated successfully', 'info');
                            sendMessageToAll({ msg: 'realTimeEvent.blockSeats', data: {} });
                        });
                    }

                } else {
                    postman.publish('showToast', {
                        message: 'Blocking not updated',
                        type: 'error'
                    });
                    self.setState({
                        showModal: false,
                        selectedSeats: []
                    }, ()=>{
                        self.callForFreshLayout();
                    });
                    clientLogging('block', 'Blocking not updated', 'error');
                }
            });
        }
    }


    /**
     * This is initial building for seatlayout with get call
     * */
    async callForFreshLayout() {
        var audiId = self.props.sessionDataForLayout && self.props.sessionDataForLayout.instance.audi_id ? parseInt(self.props.sessionDataForLayout.instance.audi_id) : '';
        // This has to be changed
        tempStore = 0;
        var getLayoutBySessionId = layoutAction.getSeatData(audiId, parseInt(self.props.sessionDataForLayout.instance.id));
        await getLayoutBySessionId.then(function (layoutdata) {
            var seatLayoutArray = layoutdata.result.layout.objArea;
            var seatLayoutArray;
            if (self.props.type == 'find') {
                seatLayoutArray = $.extend(true, [], layoutdata.result.layout.objArea);
            } else {
                seatLayoutArray = $.extend(true, [], layoutdata.result.layout.objArea);
            }
            self.setState({
                'layoutObjData': seatLayoutArray,
                'selectedSeats': [],
                'audiName': ''//data.result.audi_name
            }, function () {
                if (self.state.selectedSeats.length == 0) {
                    self.buildSeatLayoutRows();
                }
            });
        });
    }

    componentWillMount() {
        this.getMasterInfo();
        postman.subscribe('updatedmasterInfo', () => {
            this.getMasterInfo();
        });
        if (isAlreadyLoad) {
            self.resetLayoutSelectFlag();
            self.callForFreshLayout();
        } else {
            self.callForFreshLayout();
        }
        self.updateCinemaIdOnLoad();
    }

    /**
     * Reset layout for unmount
     * */
    componentWillUnmount() {
    }

    /**
     *  This method is to make the layout centeralize
     * */
    makeSheetsInCenter(n) {
        setTimeout(function () {
            if ($(document).width() > $('.listAllSeats').width()) {
                var leftspacing = $(document).width() - $('.listAllSeats').width();
                self && self.setState({ 'leftspacing': leftspacing / n });
            }
        }, 100);
    }
    /**
     * Hold previously selected sheets
     * */
    holdPreviousSelectedArray() {
        if (this.state.selectedSeats.length > 0) {
            self.setState({
                holdSheets: this.state.selectedSeats.slice()
            });
        }
    }
    updatePreviousSelectedValue() {
        var reminingSheetsData = [];
        if (self.state.layoutObjData.length > 0 && self.state.holdSheets.length > 0) {
            self.state.layoutObjData.map(function (categoryObj, catIndex) {
                self.state.holdSheets.map(function (selSheets, selIndex) {
                    if (selSheets.areaCode === categoryObj.AreaCode) {
                        var statusOfSheet = categoryObj.objRow[selSheets.actualRowIndex].objSeat[selSheets.actualColIndex].SeatStatus;
                        if (statusOfSheet == 0) {
                            categoryObj.objRow[selSheets.actualRowIndex].objSeat[selSheets.actualColIndex].isSelected = true;
                            selSheets['isSelected'] = true;
                            reminingSheetsData.push(selSheets);
                        }
                    }
                });
            });
        }
        self.setState({
            'layoutObjData': self.state.layoutObjData,
            'selectedSeats': reminingSheetsData
        });
    }

    addFixedToLayout = () => {
        this.elemFixed = $(window).scroll((e) => {
            var scrollPos = $(window).scrollTop();
            if (scrollPos > 80) {
                $('.navigationRowHeader').addClass('fixedHeader');
            } else {
                $('.navigationRowHeader').removeClass('fixedHeader');
            }
        });
    }

    componentDidMount() {
        if (self.props.type == 'find') {
            self.makeSheetsInCenter(5);
        } else {
            self.makeSheetsInCenter(3);
        }


        IdbRTC.getCinemas().then(cinemaDetails => {
            self.setState({
                cinemaDetailsObj: cinemaDetails.length > 0 && cinemaDetails[0]
            }, () => {
                self.allowTeleBlockingBasedonSSNInstance();
            });
        });

        postman.subscribe('update.blockSeats', (data) => {
            self.holdPreviousSelectedArray();
            self.callForFreshLayout();
        });

        postman.subscribe('update.unblockSeats', (data) => {
            self.holdPreviousSelectedArray();
            self.callForFreshLayout();
        });

        postman.subscribe('update.teleBlocked', (data) => {
            self.holdPreviousSelectedArray();
            self.callForFreshLayout();
        });
        //Error handling for teleblock
        /* postman.subscribe('rtc.addtelebookSeat.error', (data) => {
            postman.publish('showToast', {
                message: data.message,
                type: 'error'
            });
            self.setState({
                showModal: false,
                selectedSeats: []
            }, ()=>{
                self.callForFreshLayout();
            });
        });

        postman.subscribe('rtc.blockSeats.error', (data) => {
            postman.publish('showToast', {
                message: data.message,
                type: 'error'
            });
            self.setState({
                showModal: false,
                selectedSeats: []
            }, ()=>{
                self.callForFreshLayout();
            });
        });

        postman.subscribe('rtc.unblockSeats.error', (data) => {
            postman.publish('showToast', {
                message: data.message,
                type: 'error'
            });
            self.setState({
                showModal: false,
                selectedSeats: []
            }, ()=>{
                self.callForFreshLayout();
            });
        });
*/
        //At this point slave handling can be checked
        postman.subscribe('teleBlockedSeatsAutoRelease', function () {
            self.holdPreviousSelectedArray();
            self.callForFreshLayout();
        });

        postman.subscribe('modalClosedForLayout', function () {
            self.callForFreshLayout();
            bookingStore = {};
        });

    }
    /**
     * Here we update get the cinema id for further layout processing
     * */
    updateCinemaIdOnLoad() {
        IdbRTC.findCinemaDetails().then(function (data) {
            self.setState({
                cinemaId: data[0].id
            });
        });
    }
    /*
    * This method is for telebook the seat
    * */
    teleBookOpen = () => {
        /**
         * This is for block layout
         * */
        var blockedSeatData = Object.assign({}, layoutAction.getSeatBlockObjForBackend().seatBlockObj);
        self.state.selectedSeats.map(function (selectedValue, selectedIndex) {
            blockedSeatData.category.push(selectedValue.areaCode ? selectedValue.areaCode : selectedValue.categoryInfo);
            blockedSeatData.index.push(selectedValue.GridSeatNum - 1);
            blockedSeatData.row.push(selectedValue.rowId);
        });
        blockedSeatData.ssn_instance_id = parseInt(self.props.sessionDataForLayout.instance.id);
        blockedSeatData['pos_user_id'] = parseInt(localStorage.getItem('userId'));
        self.props.seatSelectedFromLayout(self.state.selectedSeats);
        self.props.sessionDataForLayout['seat_details'] = self.stringFromColl(self.state.selectedSeats);
        //self.props.sessionData(self.props.sessionDataForLayout);
        temphold = self.state.selectedSeats;
        self.setState({
            blockedSeatData: blockedSeatData
        });
        var appOnlineAllow = getOnlineStatusLocal();
        if (appOnlineAllow == 'no') {
            self.offlineBlockPoint(blockedSeatData, (resp) => {
                if (resp.hasOwnProperty('id')) {
                    self.setState({
                        'blockedSeatResponseData': resp,
                        'confirmBooking': false,
                        'showModal': true
                    });
                    clientLogging('block', 'Blocking updated successfully before telebooking', 'info');
                    serverLogging(JSON.stringify(resp) + 'Blocking updated successfully before telebooking offline');
                }

            });
        } else if (appOnlineAllow == 'yes') {
            self.onlineBlockPoint(blockedSeatData, (onlineData) => {
                if (onlineData.hasOwnProperty('error')) {
                    postman.publish('showToast', {
                        message: onlineData.error.message,
                        type: 'error'
                    });
                    self.setState({
                        showModal: false,
                        selectedSeats: []
                    }, ()=>{
                        self.callForFreshLayout();
                    });
                }
                serverLogging(JSON.stringify(onlineData) + 'Online Block updates before telebook');
            }, (respLocal) => {
                if (respLocal.hasOwnProperty('id')) {
                    self.setState({
                        'blockedSeatResponseData': respLocal,
                        'confirmBooking': false,
                        'showModal': true
                    });
                    clientLogging('block', 'Blocking updated successfully', 'info');
                    serverLogging(JSON.stringify(respLocal) + 'Blocking updated successfully before telebook online local');
                }
            });
        }
        /**
         * End Block Layout
         */
    }
    /*
    *  Modal for tele booking
    * */
    handleCheckStateModal = (status) => {
        if (status == 'no') {
            this.setState({
                showModal: false
            }, () => {
                let id = self.state.blockedSeatResponseData && self.state.blockedSeatResponseData.id;
                self.handleCancelTeleBooking(id);
            });
            //check if ticket print done, reload the screen
        } else {
            this.setState({
                showModal: false
            });
        }
    };
    /**
     *
     * Allow teleblocking based on ssn instance, this is timer and show hide the teleblock link
     * **/
    allowTeleBlockingBasedonSSNInstance = () => {
        let ssnId = self.props.sessionDataForLayout.instance.id;
        let teleCutoffTime = self.state.cinemaDetailsObj && self.state.cinemaDetailsObj.tele_cutoff;
        if (teleCutoffTime && ssnId) {
            let ssnTime = new Date(self.props.sessionDataForLayout.instance.start_date_time);
            ssnTime.setMinutes(ssnTime.getMinutes() + teleCutoffTime);
            let currentTime = new Date();
            if (currentTime.getTime() >= ssnTime.getTime()) {
                self.setState({
                    isTelebookNotAllowed: true
                });
            } else {
                self.setState({
                    isTelebookNotAllowed: false
                });
            }
        }
    }
    /**
     * Supporting function for telebook
     * */
    handleInternalStateOnline(telBlock) {
        if (telBlock.hasOwnProperty('error')) {
            postman.publish('showToast', {
                message: telBlock.error.message,
                type: 'error'
            });
            self.setState({
                selectedSeats: []
            }, ()=>{
                self.callForFreshLayout();
                temphold=[];
            });
            serverLogging(JSON.stringify(onlineTeleBlockObj) + 'online teleblocking had some issue' + JSON.stringify(telBlock));
        } else {
            //Local point for teleblock
            let localSeatTeleBlock = layoutAction.addTeleBlock(self.state.blockedSeatData);
            localSeatTeleBlock.then((resp) => {
                if (resp && resp.hasOwnProperty('error')) {
                    postman.publish('showToast', {
                        message: telBlock.error.message,
                        type: 'error'
                    });
                    self.setState({
                        showModal: false,
                        selectedSeats: []
                    }, ()=>{
                        self.callForFreshLayout();
                        temphold=[];
                    });
                    serverLogging(JSON.stringify(resp) + 'Local Issue in Teleblock' + JSON.stringify(self.state.blockedSeatData));
                } else if (resp && resp.hasOwnProperty('result')) {
                    //Local point for teleblock
                    postman.publish('showToast', {
                        message: 'Success: Selected seats have been telebooked',
                        type: 'success'
                    });
                    self.setState({
                        showModal: false
                    }, () => {
                        self.handleBackToBooking();
                        sendMessageToAll({ msg: 'realTimeEvent.teleBlocked', data: {} });
                        temphold=[];
                    });
                }
            }, (err) => {
                if (err.hasOwnProperty('error')) {
                    postman.publish('showToast', {
                        message: 'Some Issue in Teleblock',
                        type: 'error'
                    });
                    self.setState({
                        showModal: false,
                        selectedSeats: []
                    }, ()=>{
                        self.callForFreshLayout();
                        temphold=[];
                    });
                    serverLogging(JSON.stringify(err) + 'Local Issue in Teleblock' + JSON.stringify(self.state.blockedSeatData));
                }
            });
        }
    }
    handleInternalStateOffline() {
        //Local point for teleblock
        let localSeatTeleBlock = layoutAction.addTeleBlock(self.state.blockedSeatData);
        localSeatTeleBlock.then((resp) => {
            if (resp && resp.hasOwnProperty('error')) {
                postman.publish('showToast', {
                    message: 'Some Issue in Teleblock',
                    type: 'error'
                });
                self.setState({
                    showModal: false,
                    selectedSeats: []
                }, ()=>{
                    self.callForFreshLayout();
                    temphold=[];
                });
                serverLogging(JSON.stringify(resp) + 'Local Issue in Teleblock' + JSON.stringify(self.state.blockedSeatData));
            } else if (resp && resp.hasOwnProperty('result')) {
                //Local point for teleblock
                postman.publish('showToast', {
                    message: 'Success: Selected seats have been telebooked',
                    type: 'success'
                });
                self.setState({
                    showModal: false
                }, () => {
                    this.handleBackToBooking();
                    sendMessageToAll({ msg: 'realTimeEvent.teleBlocked', data: {} });
                    temphold=[];
                });
            }
        }, (err) => {
            if (err.hasOwnProperty('error')) {
                postman.publish('showToast', {
                    message: 'Some Issue in Teleblock',
                    type: 'error'
                });
                self.setState({
                    showModal: false,
                    selectedSeats: []
                }, ()=>{
                    self.callForFreshLayout();
                    temphold=[];
                });
                serverLogging(JSON.stringify(err) + 'Local Issue in Teleblock' + JSON.stringify(self.state.blockedSeatData));
            }
        });
    }
    /*
     *  Final Handler for telebook
     * */

    handleTelebook = (data) => {
        if (data.name && data.mob) {
            var appOnlineAllow = getOnlineStatusLocal();
            var blockedSeatData = {};
            blockedSeatData['booking_id'] = self.state.blockedSeatResponseData.id;
            blockedSeatData['status'] = 9;
            blockedSeatData['pax_info'] = {};
            blockedSeatData.pax_info['name'] = data.name;
            blockedSeatData.pax_info['tele_book_no'] = data.mob;
            blockedSeatData['print_status'] = 0;
            blockedSeatData['seat_details'] = self.stringFromCollLocalDb(temphold);
            blockedSeatData['seat_count'] = temphold.length;
            blockedSeatData['isOnline'] = (appOnlineAllow == 'yes' ? 1 : 0);
            blockedSeatData['tele_book_no'] = data.mob;
            blockedSeatData['pos_user_id'] = parseInt(localStorage.getItem('userId'));
            blockedSeatData['ssn_instance_id'] = parseInt(self.props.sessionDataForLayout.instance.id);
            //Hit the telebook end point for offline and online here
            self.setState({
                blockedSeatData: blockedSeatData
            }, () => {
                if (appOnlineAllow == 'yes') {
                    let onlineTeleBlockObj = {
                        'bookingId': self.state.blockedSeatResponseData.id,
                        'browserId': self.state.browserId,
                        'transactionId': blockedSeatData.transactionId,
                        'pos_user_id': blockedSeatData.pos_user_id,
                        'tele_book_no': data.mob,
                        "pax_info": { "name": data.name}
                    };
                    let blockOnlineTeleBlock = layoutAction.teleBlockOnlineEndPoint(onlineTeleBlockObj);
                    //Local idb point for teleblock
                    blockOnlineTeleBlock.then((onlineTeleBlockResp) => {
                        if (onlineTeleBlockResp.json) {
                            onlineTeleBlockResp.json().then((telBlock) => {
                                self.handleInternalStateOnline(telBlock);
                            }, (err) => {
                                if (err.hasOwnProperty('error')) {
                                    postman.publish('showToast', {
                                        message: 'Server Issue in Teleblock',
                                        type: 'error'
                                    });
                                    temphold=[];
                                    self.setState({
                                        showModal: false,
                                        selectedSeats: []
                                    }, ()=>{
                                        self.callForFreshLayout();
                                    });
                                    serverLogging(JSON.stringify(onlineTeleBlockObj) + 'online teleblocking had some issue' + JSON.stringify(err));
                                }
                            });
                        } else if (onlineTeleBlockResp.hasOwnProperty('result')) {
                            self.handleInternalStateOnline(onlineTeleBlockResp);
                        } else if (onlineTeleBlockResp.hasOwnProperty('mstatus')) {
                            self.handleInternalStateOffline();
                        } else if (onlineTeleBlockResp.hasOwnProperty('error')) {
                            postman.publish('showToast', {
                                message: onlineTeleBlockResp.error.message,
                                type: 'error'
                            });
                            self.setState({
                                showModal: false,
                                selectedSeats: []
                            }, ()=>{
                                self.callForFreshLayout();
                                temphold=[];
                            });
                        }
                    });
                } else if (appOnlineAllow == 'no') {
                    self.handleInternalStateOffline();
                } else {
                    postman.publish('showToast', {
                        message: 'Teleblocking not allowed',
                        type: 'error'
                    });
                    self.setState({
                        showModal: false,
                        selectedSeats: []
                    }, ()=>{
                        self.callForFreshLayout();
                    });
                    serverLogging(JSON.stringify(blockedSeatData) + 'Teleblocking not allowed');
                }
            });


            /**
             * End Block Layout
             * */
        }
    }
    /*
     * Cancel booking if yes option selected from modal.
     * Update db by hitting cancel booking api. this.state.blockedSeatResponseData.id
     */
    handleCancelTeleBooking(id, teleStatus) {
        let appOnlineAllow = confirmBookingActions.getOnlineStatusLocal();
        //serverLogging(id, "here is the id for cancellation");
        let isOnline = (appOnlineAllow == 'yes') ? 1 : 0;
        if (appOnlineAllow == 'yes') {
            let bookingId = id ? id : '';
            let bookingObj = {
                'id': bookingId,
                'browserId': this.state.browserId,
                'transactionId': this.state.transactionId
            };
            let resp = confirmBookingActions.cancelBooking(bookingObj);
            resp.then((response) => {
                if (teleStatus == 'tele') {
                    serverLogging(JSON.stringify(response) + 'here is the online response for cancellation teleblocked seats' + JSON.stringify(bookingObj));
                } else {
                    serverLogging(JSON.stringify(response) + 'here is the online response for cancellation normal blocked seats' + JSON.stringify(bookingObj));
                }
                if (response.json) {
                    if (response.status === 400) {
                        response.json().then((data) => {
                            postman.publish('showToast', {
                                message: data.error.message,
                                type: 'error'
                            });
                            self.setState({
                                showModal: false,
                                selectedSeats: []
                            }, ()=>{
                                self.callForFreshLayout();
                            });
                        });
                        self.handleBackToBooking();
                    } else if (response.status === 200) {
                        let unblockAction = confirmBookingActions.unBlockSeatsOffline({ booking_id: id }, isOnline);
                        unblockAction.then((data) => {
                            if (data.result == 'Done') {
                                sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                                postman.publish('showToast', {
                                    message: 'Tele Booking cancelled successfuly!',
                                    type: 'success'
                                });
                                self.setState({
                                    selectedSeats: [],
                                    teleUnblock: false
                                }, () => {
                                    self.updateLayoutBasedOnSelectedSeats({ 'isSelected': true });
                                    self.callForFreshLayout();
                                });
                                //self.handleBackToBooking();
                            } else {
                                postman.publish('showToast', {
                                    message: data.error,
                                    type: 'error'
                                });
                                self.setState({
                                    showModal: false,
                                    selectedSeats: []
                                }, ()=>{
                                    self.callForFreshLayout();
                                });
                            }
                        });
                    }
                } else if (response.hasOwnProperty('result')) {
                    let unblockAction = confirmBookingActions.unBlockSeatsOffline({ booking_id: id }, isOnline);
                    unblockAction.then((data) => {
                        if (data.result == 'Done') {
                            postman.publish('showToast', {
                                message: 'Tele Booking cancelled successfuly!',
                                type: 'success'
                            });
                            sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                            self.setState({
                                selectedSeats: [],
                                teleUnblock: false
                            }, () => {
                                self.updateLayoutBasedOnSelectedSeats({ 'isSelected': true });
                                self.callForFreshLayout();
                            });
                            //self.handleBackToBooking();
                        } else {
                            postman.publish('showToast', {
                                message: data.error,
                                type: 'error'
                            });
                            self.setState({
                                showModal: false,
                                selectedSeats: []
                            }, ()=>{
                                self.callForFreshLayout();
                            });
                        }
                    });
                } else if (response.hasOwnProperty('mstatus')) {
                    let unblockAction = confirmBookingActions.unBlockSeatsOffline({ booking_id: id }, isOnline);
                    unblockAction.then((data) => {
                        if (data.result == 'Done') {
                            sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                            postman.publish('showToast', {
                                message: 'Booking cancelled successfuly!',
                                type: 'success'
                            });
                            self.setState({
                                selectedSeats: [],
                                teleUnblock: false
                            }, () => {
                                self.updateLayoutBasedOnSelectedSeats({ 'isSelected': true });
                                self.callForFreshLayout();
                            });
                            //self.handleBackToBooking();
                        } else {
                            postman.publish('showToast', {

                                message: data.error,
                                type: 'error'
                            });
                            self.setState({
                                showModal: false,
                                selectedSeats: []
                            }, ()=>{
                                self.callForFreshLayout();
                            });
                        }
                    });
                } else if (response.hasOwnProperty('error')) {
                    postman.publish('showToast', {

                        message: response.error.message,
                        type: 'error'
                    });
                    self.setState({
                        showModal: false,
                        selectedSeats: []
                    }, ()=>{
                        self.callForFreshLayout();
                    });
                }

            });
        } else if (appOnlineAllow == 'no') {
            let unblockAction = confirmBookingActions.unBlockSeatsOffline({ booking_id: id }, isOnline);
            unblockAction.then((data) => {
                if (data.result == 'Done') {
                    sendMessageToAll({ msg: 'realTimeEvent.unblockSeats', data: {} });
                    postman.publish('showToast', {
                        message: 'Booking cancelled successfuly!',
                        type: 'success'
                    });
                    self.setState({
                        selectedSeats: [],
                        teleUnblock: false
                    }, () => {
                        self.updateLayoutBasedOnSelectedSeats({ 'isSelected': true });
                        self.callForFreshLayout();
                    });
                    //self.handleBackToBooking();
                } else {
                    postman.publish('showToast', {

                        message: data.error,
                        type: 'error'
                    });
                    self.setState({
                        showModal: false,
                        selectedSeats: []
                    }, ()=>{
                        self.callForFreshLayout();
                    });
                }
            });
        }
    }

    handleTeleUnblock = () => {
        let phoneNum = self.state.selectedSeats[0];
        if (phoneNum) {
            let mobFetch = layoutAction.getPhoneNumberStatus({
                'tele_book_no': phoneNum.tele_book_no
            });
            mobFetch.then((resp) => {
                if (resp && resp.result && resp.result.hasOwnProperty('9')) {
                    let obj = { id: resp.result['9'][0].booking_id };
                    self.setState({
                        blockedSeatResponseData: obj
                    }, () => {
                        self.handleCancelTeleBooking(obj.id, 'tele');
                    });
                }
            }, (err) => {
                if (err.hasOwnProperty('error')) {
                    postman.publish('showToast', {
                        message: 'Unblock not possible',
                        type: 'error'
                    });
                    serverLogging(JSON.stringify(err) + 'Unblock not possible' + JSON.stringify(phoneNum));
                    self.setState({
                        showModal: false,
                        selectedSeats: []
                    }, ()=>{
                        self.callForFreshLayout();
                    });
                }
            });
        }
    }

    modifyFnForLocalDb = (teleBookData) => {
        let modifySeatsEndPoint = layoutAction.modifyTeleBlockedLocal(teleBookData);
        modifySeatsEndPoint.then((resp) => {
            let seatDetail = self.stringFromCollLocalDb(self.state.selectedSeats);
            self.props.handleModifySeatLayout({ seat_details: seatDetail, selectedSeats: self.state.selectedSeats });
            postman.publish('MODIFYSEATSEVENT');
        }, (err) => {
            serverLogging(JSON.stringify(teleBookData));
        });
    }

    /**
     *
     * This method works when in modal we are clicking telebook button
     * */

    handleModifySeats = () => {
        let appOnlineAllow = confirmBookingActions.getOnlineStatusLocal();
        //serverLogging(id, "here is the id for cancellation");
        let isOnline = (appOnlineAllow == 'yes') ? 1 : 0;
        if (self.state.selectedSeats.length > 0) {
            //Build offline data formate
            let bookingStoreCopy = $.extend(true, {}, bookingStore);
            let selectedSeats = bookingStoreCopy[this.props.teleBookedData[0].tele_book_no];
            self.props.teleBookedData[0]['old_seat_details'] = self.stringFromCollLocalDb(selectedSeats);
            self.props.teleBookedData[0]['seat_details'] = self.stringFromCollLocalDb(self.state.selectedSeats);
            self.props.teleBookedData[0]['seat_count'] = self.state.selectedSeats.length;
            self.props.teleBookedData[0]['isOnline'] = isOnline;

            //Build online data formate
            var modifyOnlineDataFormat = Object.assign({}, layoutAction.getSeatBlockObjForBackend().seatModifyTeleblockObj);
            self.state.selectedSeats.map(function (selectedValue, selectedIndex) {
                modifyOnlineDataFormat.category.push(selectedValue.areaCode ? selectedValue.areaCode : selectedValue.categoryInfo);
                modifyOnlineDataFormat.index.push(selectedValue.GridSeatNum - 1);
                modifyOnlineDataFormat.row.push(selectedValue.rowId);
            });
            modifyOnlineDataFormat.ssn_instance_id = parseInt(self.props.sessionDataForLayout.instance.id);
            modifyOnlineDataFormat['pos_user_id'] = parseInt(localStorage.getItem('userId'));
            modifyOnlineDataFormat['bookingId'] = self.props.teleBookedData[0].booking_id;
            modifyOnlineDataFormat['browserId'] = self.state.browserId;
            modifyOnlineDataFormat['transactionId'] = self.state.transactionId;

            if (isOnline) {
                let onlineModifyEndPoints = layoutAction.modifyTeleBlockOnlineEndPoint(modifyOnlineDataFormat);
                onlineModifyEndPoints.then((onModifyResp) => {
                    if (onModifyResp.json && onModifyResp.status == 200) {
                        onModifyResp.json().then((respData) => {
                            self.modifyFnForLocalDb(self.props.teleBookedData[0]);
                        });
                    } else if (onModifyResp.hasOwnProperty('result')) {
                        self.modifyFnForLocalDb(self.props.teleBookedData[0]);
                    } else if (onModifyResp.hasOwnProperty('mstatus')) {
                        self.modifyFnForLocalDb(self.props.teleBookedData[0]);
                    } else {
                        postman.publish('showToast', {
                            message: 'Seats Can not be Modified, See the logs for more details',
                            type: 'error'
                        });
                        self.setState({
                            showModal: false,
                            selectedSeats: []
                        }, ()=>{
                            self.callForFreshLayout();
                        });

                        serverLogging(JSON.stringify(onModifyResp) + JSON.stringify(modifyOnlineDataFormat));
                    }
                });
            } else {
                self.modifyFnForLocalDb(self.props.teleBookedData[0]);
            }
        } else {
            postman.publish('showToast', {
                message: 'Select atleast 1 seats',
                type: 'error'
            });
        }
        //hit here the point for modify teleblock

    }

    render() {
        const { getSeatLayoutHTML } = this;
        let seatLayoutArray = self.state && self.state.layoutObjData ? self.state.layoutObjData : [];
        let enableButton = self.state.selectedSeats && self.state.selectedSeats.length > 0;
        let enableOk = self.checkAllWithSameNumber() || !self.state.selectedSeats.length;
        return (<div>
            {!this.state.confirmBooking && <div>
                <div className="navigationRowHeader" style={{ 'boxShadow': (this.props.type == 'session' && '0 2px 4px 0 rgba(73, 73, 73, 0.1)' || '0px 4px 0 rgba(73, 73, 73, 0.1)') }}>
                    <div className="colLeft">{this.props.type == 'session' && <span className="tabs arrow" onClick={self.handleBackToBooking}></span>}
                        <div><span
                            className="tabs mainHeader">{self.props.sessionDataForLayout.display}</span><br /><span
                                className="tabs subHeader">{self.props.sessionDataForLayout.language}
                                | {moment(new Date(self.props.sessionDataForLayout.instance.start_date_time)).format('lll')}</span>
                        </div>
                        <div className="middleContainer"><span className="tabs middleText">Tickets: </span><span
                            className="ticketHeader">{self.state.selectedSeats && self.state.selectedSeats.length > 0 ? self.state.selectedSeats.length : 0}</span>
                        </div>
                        <div className="middleContainer"><span className="tabs middleText">Category: </span><span
                            className="ticketHeader">{self.state.itemCategory ? validationService.capitalize(self.state.itemCategory) : ''}</span>
                        </div>
                    </div>
                    {this.props.type == 'session' && <div className="colRight"><span className="tabs actionLink proceedToBook teleBookSpace"><button
                        className={(!enableButton || this.state.teleUnblock) ? 'disabled' : ''}
                        onClick={self.proceedToBook}>Proceed to Book</button></span>
                        {console.log(self.state.cinemaDetailsObj)}
                        {!self.state.teleUnblock && self.state.cinemaDetailsObj && !self.state.isTelebookNotAllowed  && <span className="tabs actionLink proceedToBook"><a
                            className={(!enableButton && !self.state.isTelebookNotAllowed) ? 'disabled-link' : 'btnlink'}
                            onClick={self.teleBookOpen}>Telebooking</a></span> || ''}
                        {self.state.teleUnblock && self.state.cinemaDetailsObj && !self.state.isTelebookNotAllowed && <span className="tabs actionLink proceedToBook"><a
                            className={!enableButton ? 'disabled-link' : 'btnlink'}
                            onClick={self.handleTeleUnblock}>Unblock</a></span> || ''}
                    </div>}
                    {this.props.type == 'find' && <div className="colRight">
                        <span className="tabs actionLink proceedToBook"><button
                            className={enableOk ? 'disabled' : ''}
                            onClick={self.handleModifySeats}>OK</button></span>
                    </div>}
                </div>
                <div className="layoutContainer">
                    {/*<div className="screen screenTop"></div>*/}
                    {_.map(seatLayoutArray, (category, index) => {
                        return (<div key={index.toString()}>
                            <div className="layoutCategory">
                                {category.AreaDesc.toUpperCase()} - Rs. {self.getCategoryPrice(category)}
                            </div>
                            <div className="listAllSeats">
                                {getSeatLayoutHTML(category)}
                            </div>
                        </div>);
                    })}
                    <div className="screen screenBottom">Screen this way</div>
                    {/*End Layout From Here*/}
                    <div className="labelDescription">
                        <span className="labelIndicator availableSeatIndicator"></span>
                        <span className="labelDescriptionContainer">Available</span>
                        <span className="labelIndicator availableSeatIndicator taken"></span>
                        <span className="labelDescriptionContainer">Taken</span>
                        <span className="labelIndicator availableSeatIndicator active"></span>
                        <span className="labelDescriptionContainer">Selected</span>
                        <span className="labelIndicator availableSeatIndicator notAvailbale"></span>
                        <span className="labelDescriptionContainer">Not Available</span>
                        <span className="labelIndicator availableSeatIndicator reservedSeatRules"></span>
                        <span className="labelDescriptionContainer">Reserved</span>
                        <span className="labelIndicator availableSeatIndicator tele-active"></span>
                        <span className="labelDescriptionContainer">Telebooked</span>
                    </div>
                </div>
            </div>}
            {
                <ModalNew modalHeader={''}
                    modalBody={''}
                    modalFooter={''}
                    modalWidth={300}
                    showModal={this.state.showModal}
                    handleCheckStateModal={this.handleCheckStateModal}>
                    <TelebookingForm handleTelebook={this.handleTelebook} />
                </ModalNew>
            }
            <div>{this.state.confirmBooking &&
                <ConfirmBooking seatDetails={self.props.sessionDataForLayout.seat_details} sessionDataForLayout={self.props.sessionDataForLayout} cinemaDetailsObj={self.state.cinemaDetailsObj}
                    blockedSeatResponseData={this.state.blockedSeatResponseData}
                    audiName={self.state.audiName}
                    type={'confirm'}
                    handleSetShowLayout={self.handleSetShowLayout}
                    goback={self.handleBackToBooking} />}</div>
        </div>);
    }
}

// Which props do we want to inject, given the global state?
function select(state) {
    return {
        selectedSeats: state
    };
}

// Wrap the component to inject dispatch and state into it
export default connect(select, (dispatch) => {
    return {
        seatSelectedFromLayout: (selectedSeats) => {
            dispatch(layoutAction.seatSelectedFromLayout(selectedSeats));
        }
    };
})(Layout);