import moment from 'moment';
import _ from 'lodash';
import React from 'react';

function getPriceString(ticketObj) {
    let priceStrings = [];
    ticketObj.seats.map((seat) => {
        let mc = (seat.maintenancePrice === null ? 0 : seat.maintenancePrice.base && seat.maintenancePrice.cgst && seat.maintenancePrice.sgst && seat.maintenancePrice.lTax && (seat.maintenancePrice.base + seat.maintenancePrice.cgst + seat.maintenancePrice.sgst + seat.maintenancePrice.lTax) || 0);
        priceStrings.push(
            {
                ticket: `Rs ${(seat.ticketPrice.base + seat.ticketPrice.cgst + seat.ticketPrice.sgst + seat.ticketPrice.lTax).toFixed(2)} (Base Price : Rs ${seat.ticketPrice.base}, CGST: Rs ${seat.ticketPrice.cgst}, SGST: Rs ${seat.ticketPrice.sgst}, Local Tax: Rs ${seat.ticketPrice.lTax})`,
                threeD: seat.threeDPrice === null ? null : `Rs ${(seat.threeDPrice.base + seat.threeDPrice.cgst + seat.threeDPrice.sgst + seat.threeDPrice.lTax).toFixed(2)} (Base Price : Rs ${seat.threeDPrice.base}, CGST: Rs ${seat.threeDPrice.cgst}, SGST: Rs ${seat.threeDPrice.sgst}, Local Tax: Rs ${seat.threeDPrice.lTax})`,
                total: `Rs ${((seat.ticketPrice.base + seat.ticketPrice.cgst + seat.ticketPrice.sgst + seat.ticketPrice.lTax) + (seat.threeDPrice === null ? 0 : seat.threeDPrice.base + seat.threeDPrice.cgst + seat.threeDPrice.sgst + seat.threeDPrice.lTax) + mc).toFixed(2)}`,
                collectivePrice: [seat.ticketPrice.base, seat.ticketPrice.cgst, seat.ticketPrice.sgst, seat.ticketPrice.lTax, (seat.threeDPrice === null ? 0 : seat.threeDPrice.base + seat.threeDPrice.cgst + seat.threeDPrice.sgst + seat.threeDPrice.lTax).toFixed(2), mc? mc:0]
            }
        );
    });
    return priceStrings;
}

export function ticketTemplate9(ticketObj) {
    let priceStrings = getPriceString(ticketObj);
    return (ticketObj.seats.length && <div>
        {ticketObj.seats.map((data, index) => {
            return (<div>
                {_.times(3, i => {
                    return (<div
                        style={{ marginTop: (i > 0) ? '100px' : '0px', pageBreakBefore: (index > 0 && i === 0) ? 'always' : '' }}>
                        <div style={{ width: '288px', height: '288px', display: 'inline-block', fontFamily: 'Open Sans' }}>
                            <div style={{ margin: '85px 10px 10px 10px' }}>
                                <div style={{ fontSize: '11px' }}>{ticketObj.cinema.name}</div>
                                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                                    <div style={{ display: 'inline' }}>
                                        <span style={{ fontSize: '11px' }}>Invoice No.</span>
                                        <span style={{ marginLeft: '17px' }}>{ticketObj.seats[index].invoiceNumber}</span>
                                    </div>
                                    <div style={{ float: 'right', display: 'inline' }}>
                                        <span style={{ fontSize: '11px' }}>Seat</span>
                                    </div>
                                </div>
                                <div style={{ marginTop: '7px', fontWeight: 'bold' }}>
                                    <div style={{ display: 'inline' }}>
                                        <span style={{ fontSize: '14px' }}>{ticketObj.movie.name}</span>
                                    </div>
                                    <div style={{ float: 'right', display: 'inline' }}>
                                        <span style={{ fontSize: '14px' }}>{ticketObj.seats[index].seatNumber}</span>
                                    </div>
                                </div>
                                <div
                                    style={{ fontSize: '9px', marginTop: '1px' }}>{'(' + ticketObj.movie.censor + ')' + ' | ' + ticketObj.movie.language}</div>
                                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                                    <div style={{ display: 'inline' }}>
                                        <span style={{ fontSize: '11px' }}>Class :</span>
                                        <span style={{ marginLeft: '8px' }}>{ticketObj.session.category}
                                            ({ticketObj.seats[index].subCategory})</span>
                                    </div>
                                    <div style={{ float: 'right', display: 'inline' }}>
                                        <span style={{ fontSize: '11px' }}>Screen</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                                    <div style={{ display: 'inline' }}>
                                        <span style={{ fontSize: '11px' }}>Show Time :</span>
                                        <span style={{ marginLeft: '8px' }}>
                                            {moment(ticketObj.session.startDateTime).format('h:mm A')}, {moment(ticketObj.session.startDateTime).format('ddd DD/MM/YYYY')}
                                        </span>
                                    </div>
                                    <div style={{ float: 'right', display: 'inline', fontWeight: 'bold' }}>
                                        <span style={{ fontSize: '14px' }}>{ticketObj.audi.name}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                                    <span style={{ fontSize: '11px' }}>Ticket Price :</span>
                                    <span
                                        style={{ marginLeft: '8px' }}>{priceStrings[index].ticket}</span>
                                </div>
                                {
                                    ticketObj.seats[index].threeDPrice !== null &&
                                    <div style={{ fontSize: '11px', marginTop: '5px' }}>
                                        <span style={{ fontSize: '11px' }}>3D Charge :</span>
                                        <span
                                            style={{ marginLeft: '8px' }}>{priceStrings[index].threeD}</span>
                                    </div>
                                }
                                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                                    <span style={{ fontSize: '11px' }}>Total Price :</span>
                                    <span
                                        style={{ marginLeft: '8px' }}>{priceStrings[index].total}</span>
                                </div>
                                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                                    <span>
                                        Movie SAC :
                                        <span style={{ marginLeft: '8px' }}>{ticketObj.cinema.movieSAC}</span>
                                    </span>
                                    <span style={{ float: 'right' }}>
                                        3D SAC :
                                        <span style={{ marginLeft: '8px' }}>{ticketObj.cinema.threeDSAC}</span>
                                    </span>
                                </div>
                                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                                    <span>GST No. :<span style={{ marginLeft: '8px' }}>{ticketObj.cinema.gstNumber}</span></span>
                                </div>
                                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                                    <span>Booking Date :<span
                                        style={{ marginLeft: '8px' }}>{moment(ticketObj.booking.time).format('h:mm A')}, {moment(ticketObj.booking.time).format('ddd DD/MM/YYYY')}</span></span>
                                </div>
                                <div style={{ fontSize: '11px', marginTop: '17px' }}>
                                    <span>{ticketObj.booking.id}</span>
                                    <span style={{ float: 'right' }}>{ticketObj.booking.posUser}</span>
                                </div>
                            </div>
                        </div>
                    </div>);
                })
                }</div>);
        })
        }</div>);
}

export function ticketTemplate2(ticketObj) {
    let priceStrings = getPriceString(ticketObj);
    return (ticketObj.seats.length && <div>
        {ticketObj.seats.map((data, index) => {
            return (<div>
                {_.times(3, i => {
                    return (<div style={{ pageBreakBefore: (index > 0 && i === 0) ? 'always' : '' }}>
                        <div style={{ width: '303px', height: i === 0 ? '130px' : '140px', display: 'inline-block', border: '1px solid white' }}>
                            <div
                                style={{ width: '180px', display: 'inline-block', paddingRight: '10px', borderRight: '1px dashed #979797' }}>
                                <div style={{ fontFamily: 'Open Sans' }}>
                                    <div style={{ fontSize: '11px', display: 'inline' }}>
                                        <div style={{ display: 'inline' }}>
                                            <span style={{ fontSize: '9px' }}>{ticketObj.cinema.name}</span>
                                        </div>
                                        <div style={{ float: 'right', display: 'inline' }}>
                                            <div style={{ fontSize: '8px' }}>
                                                Invoice No. {ticketObj.seats[index].invoiceNumber}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '2px', fontWeight: 'bold' }}>
                                        <span style={{ fontSize: '10px', fontWieght: 'bold' }}>{ticketObj.movie.name}</span>
                                        <span
                                            style={{ fontSize: '8px' }}>{'(' + ticketObj.movie.censor + ')' + ' | ' + ticketObj.movie.language}</span>
                                    </div>

                                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '9px' }}>Ticket Price :</span>
                                        <span
                                            style={{ marginLeft: '5px', fontSize: '8px' }}>{priceStrings[index].ticket}</span>
                                    </div>
                                    {
                                        ticketObj.seats[index].threeDPrice !== null &&
                                        <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                            <span style={{ fontSize: '9px' }}>3D Charge:</span>
                                            <span
                                                style={{ marginLeft: '5px', fontSize: '8px' }}>{priceStrings[index].threeD}</span>
                                        </div>
                                    }
                                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '9px' }}>Total Price:</span>
                                        <span
                                            style={{ marginLeft: '5px', fontSize: '8px' }}>{priceStrings[index].total}</span>
                                        <span
                                            style={{ marginLeft: '3px', fontSize: '8px', float: 'right' }}>{ticketObj.cinema.movieSAC}</span>
                                        <span style={{ fontSize: '9px', float: 'right' }}> Movie SAC:</span>
                                    </div>
                                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                        <span>
                                            <span style={{ fontSize: '9px' }}>GST No:</span>
                                            <span
                                                style={{ marginLeft: '5px', fontSize: '8px' }}>{ticketObj.cinema.gstNumber}</span>
                                        </span>
                                        <span>
                                            <span
                                                style={{ marginLeft: '3px', fontSize: '8px', float: 'right' }}>{ticketObj.cinema.threeDSAC}</span>
                                            <span style={{ fontSize: '9px', float: 'right' }}> 3D SAC:</span>
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '2px', fontSize: '8px' }}>
                                        <span>Booking Date: <span>{moment(ticketObj.booking.time).format('h:mm A')}, {moment(ticketObj.booking.time).format('ddd DD/MM/YYYY')}</span></span>
                                    </div>
                                    <div style={{ marginTop: '2px', fontSize: '8px' }}>
                                        <span>{ticketObj.booking.id}</span>
                                        <span style={{ float: 'right' }}>{ticketObj.booking.posUser}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ width: '112px', display: 'inline-block', verticalAlign: 'top' }}>
                                <div style={{ marginLeft: '5px' }}>
                                    <div style={{ fontSize: '10px', display: 'table', width: '100%' }}>
                                        <div style={{ width: '30%', display: 'table-cell', height: 'auto' }}>Screen :</div>
                                        <div style={{ width: '70%', display: 'table-cell', height: 'auto' }}>{ticketObj.audi.name}</div>
                                    </div>
                                    <div style={{ fontSize: '10px', marginTop: '8px', display: 'table', width: '100%' }}>
                                        <div style={{ width: '30%', display: 'table-cell', height: 'auto' }}>Seat :</div>
                                        <div style={{ width: '70%', display: 'table-cell', height: 'auto' }}>{ticketObj.seats[index].seatNumber}</div>
                                    </div>
                                    <div style={{ fontSize: '10px', marginTop: '8px', display: 'table', width: '100%' }}>
                                        <div style={{ width: '30%', display: 'table-cell', height: 'auto' }}>Class :</div>
                                        <div style={{ width: '70%', display: 'table-cell', height: 'auto' }}><div>{ticketObj.session.category}</div>
                                            <div>({ticketObj.seats[index].subCategory})</div></div>
                                    </div>

                                    <div style={{ fontSize: '10px', marginTop: '8px', display: 'table', width: '100%' }}>
                                        <div style={{ width: '30%', display: 'table-cell', height: 'auto' }}>Time :</div>
                                        <div style={{ width: '70%', display: 'table-cell', height: 'auto' }}>{moment(ticketObj.session.startDateTime).format('h:mm A')}</div>
                                    </div>
                                    <div style={{ fontSize: '10px', marginTop: '8px', display: 'table', width: '100%' }}>
                                        <div style={{ width: '30%', display: 'table-cell', height: 'auto' }}>Date :</div>
                                        <div style={{ width: '70%', display: 'table-cell', height: 'auto' }}>{moment(ticketObj.session.startDateTime).format('dddd, DD/MM/YYYY')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>);
                })
                }
            </div>);
        })
        }</div>);
}

export function ticketTemplate3(ticketObj) {
    let priceStrings = getPriceString(ticketObj);
    return (ticketObj.seats.length && <div>
        {ticketObj.seats.map((data, index) => {
            return (<div>
                {_.times(3, i => {
                    return (<div style={{ pageBreakBefore: (index > 0 && i === 0) ? 'always' : '' }}>
                        <div style={{ width: '384px', display: 'inline-block' }}>
                            <div
                                style={{ width: '231px', display: 'inline-block', paddingRight: '10px', borderRight: '1px dashed #979797' }}>
                                <div style={{ fontFamily: 'Open Sans' }}>
                                    <div style={{ fontSize: '11px', display: 'inline' }}>
                                        <div style={{ display: 'inline' }}>
                                            <span style={{ fontSize: '9px', fontWeight: 'bold' }}>{ticketObj.cinema.name}</span>
                                        </div>
                                        <div style={{ float: 'right', display: 'inline' }}>
                                            <div style={{ fontSize: '8px' }}>
                                                Invoice No. {ticketObj.seats[index].invoiceNumber}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '2px', fontWeight: 'bold' }}>
                                        <span style={{ fontSize: '10px', fontWieght: 'bold' }}>{ticketObj.movie.name}</span>
                                        <span
                                            style={{ fontSize: '8px' }}>{'(' + ticketObj.movie.censor + ')' + ' | ' + ticketObj.movie.language}</span>
                                    </div>

                                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '9px' }}>Ticket Price :</span>
                                        <span
                                            style={{ marginLeft: '5px', fontSize: '8px' }}>{priceStrings[index].ticket}</span>
                                    </div>
                                    {
                                        ticketObj.seats[index].threeDPrice !== null &&
                                        <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                            <span style={{ fontSize: '9px' }}>3D Charge :</span>
                                            <span
                                                style={{ marginLeft: '5px', fontSize: '8px' }}>{priceStrings[index].threeD}</span>
                                        </div>
                                    }
                                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '9px', fontWeight: 'bold' }}>Total Price :</span>
                                        <span
                                            style={{ marginLeft: '5px', fontSize: '8px', fontWeight: 'bold' }}>{priceStrings[index].total}</span>
                                        <span style={{ float: 'right' }}>
                                            <span style={{ fontSize: '9px' }}>GST No. :</span>
                                            <span
                                                style={{ marginLeft: '5px', fontSize: '8px' }}>{ticketObj.cinema.gstNumber}</span>
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '9px' }}>Movie SAC :</span>
                                        <span
                                            style={{ marginLeft: '5px', fontSize: '8px' }}>{ticketObj.cinema.movieSAC}</span>
                                        <span style={{ float: 'right' }}>
                                            <span style={{ fontSize: '9px' }}>3D SAC :</span>
                                            <span
                                                style={{ marginLeft: '5px', fontSize: '8px' }}>{ticketObj.cinema.threeDSAC}</span>
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '2px', fontSize: '8px' }}>
                                        <span>Booking Date: <span>{moment(ticketObj.booking.time).format('h:mm A')}, {moment(ticketObj.booking.time).format('ddd DD/MM/YYYY')}</span></span>
                                    </div>
                                    <div style={{ marginTop: '2px', fontSize: '8px' }}>
                                        <span>{ticketObj.booking.id}</span>
                                        <span style={{ float: 'right' }}>{ticketObj.booking.posUser}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ width: '142px', display: 'inline-block', verticalAlign: 'top' }}>
                                <div style={{ marginLeft: '8px' }}>
                                    <div style={{ fontSize: '10px' }}>
                                        <span style={{ textAlign: 'right', width: '37px', display: 'inline-block' }}>Screen :</span>
                                        <span
                                            style={{ marginLeft: '5px', fontWeight: 'bold' }}>{ticketObj.audi.name}</span>
                                    </div>
                                    <div style={{ fontSize: '10px', marginTop: '8px' }}>
                                        <span
                                            style={{ textAlign: 'right', width: '37px', display: 'inline-block' }}>Seat :</span>
                                        <span
                                            style={{ marginLeft: '5px', fontWeight: 'bold' }}>{ticketObj.seats[index].seatNumber}</span>
                                    </div>
                                    <div style={{ fontSize: '10px', marginTop: '8px' }}>
                                        <span style={{ textAlign: 'right', width: '37px', display: 'inline-block' }}>Class :</span>
                                        <span style={{ marginLeft: '5px', fontWeight: 'bold' }}>{ticketObj.session.category}
                                            ({ticketObj.seats[index].subCategory})</span>
                                    </div>

                                    <div style={{ fontSize: '10px', marginTop: '8px' }}>
                                        <span
                                            style={{ textAlign: 'right', width: '37px', display: 'inline-block' }}>Time :</span>
                                        <span
                                            style={{ marginLeft: '5px', fontWeight: 'bold' }}>{moment(ticketObj.session.startDateTime).format('h:mm A')}</span>
                                    </div>
                                    <div style={{ fontSize: '10px', marginTop: '8px' }}>
                                        <span
                                            style={{ textAlign: 'right', width: '37px', display: 'inline-block' }}>Date :</span>
                                        <span
                                            style={{ marginLeft: '5px', fontWeight: 'bold' }}>{moment(ticketObj.session.startDateTime).format('ddd DD/MM/YYYY')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>);
                })
                }
            </div>);
        })
        }</div>);
}

export function ticketTemplate4(ticketObj) {
    let priceStrings = getPriceString(ticketObj);
    return (ticketObj.seats.length && <div>
        {ticketObj.seats.map((data, index) => {
            return (<div>
                {_.times(3, i => {
                    return (<div style={{ width: '303px', marginBottom: '6px', borderBottom: '1px dashed #000', webkitPrintColorAdjust: 'exact' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px' }}>{ticketObj.cinema.name}</div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px', marginBottom: '6px' }}>{ticketObj.movie.name + '(' + ticketObj.movie.censor + ')'}</div>
                        <div style={{ fontSize: '11px' }}>
                            <div style={{ display: 'inline-block' }}>
                                <table style={{ width: '139px' }} cellPadding="0px" cellSpacing="0px">
                                    <tbody>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>Net Admin Charges</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[0].toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>CGST</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[1].toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>SGST</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[2].toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>3D Charge</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[4]}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>Total</td>
                                            <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>{(priceStrings[index].collectivePrice[0] + priceStrings[index].collectivePrice[1] + priceStrings[index].collectivePrice[2] + priceStrings[index].collectivePrice[3] + parseFloat(priceStrings[index].collectivePrice[4])).toFixed(2) || 0}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', display: 'inline-block', verticalAlign: 'top', marginLeft: '10px', width: '153px' }}>
                                <div style={{ marginLeft: '20px' }}><div>{ticketObj.audi.name}</div><span style={{ display: 'inline-block', marginRight: '2px', fontWeight: 'bold' }}>{ticketObj.seats[index].seatNumber}, {ticketObj.session.category}</span></div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#222', marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('h:mm A')}</div>
                                <div style={{ marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('ddd DD-MM-YYYY')}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', fontSize: '10px' }}>
                            <div style={{ flexGrow: 1 }}>Invoice: {ticketObj.seats[index].invoiceNumber}</div>
                            <div style={{ flexGrow: 1 }}>GSTIN: {ticketObj.cinema.gstNumber}</div>
                            <div>SAC: {ticketObj.cinema.movieSAC}</div>
                        </div>
                        <div style={{ display: 'flex', fontSize: '10px' }}>
                            <div style={{ flexGrow: 1 }}>{ticketObj.booking.id}</div>
                            <div style={{ flexGrow: 1 }}>Issued On: {moment(ticketObj.booking.time).format('DD-MM-YYYY')}, {moment(ticketObj.booking.time).format('h:mm A')}</div>
                            <div>{ticketObj.booking.posUser}</div>
                        </div>
                        <div style={{ width: '100%', position: 'relative', top: '-5px', marginBottom: '-16px' }}>
                            <span style={{ width: '10px', margin: '0px auto', display: 'inherit' }}>&#9986;</span>
                        </div>
                    </div>);
                })
                }
            </div>);
        })
        }</div>);
}

export function ticketTemplate5(ticketObj) {
    let priceStrings = getPriceString(ticketObj);
    return (ticketObj.seats.length && <div>
        {ticketObj.seats.map((data, index) => {
            return (<div>
                {_.times(1, i => {
                    return (<div style={{ width: '303px', marginBottom: '6px', borderBottom: '1px dashed #000', webkitPrintColorAdjust: 'exact' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px' }}>{ticketObj.cinema.name}</div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px', marginBottom: '6px' }}>{ticketObj.movie.name + '(' + ticketObj.movie.censor + ')'}</div>
                        <div style={{ fontSize: '11px' }}>
                            <div style={{ display: 'inline-block' }}>
                                <table style={{ width: '139px' }} cellPadding="0px" cellSpacing="0px">
                                    <tbody>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>Net Admin Charges</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[0].toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>CGST</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[1].toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>SGST</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[2].toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>3D Charge</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[4]}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>Total</td>
                                            <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>{(priceStrings[index].collectivePrice[0] + priceStrings[index].collectivePrice[1] + priceStrings[index].collectivePrice[2] + priceStrings[index].collectivePrice[3] + parseFloat(priceStrings[index].collectivePrice[4])).toFixed(2) || 0}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', display: 'inline-block', verticalAlign: 'top', marginLeft: '10px', width: '153px' }}>
                                <div style={{ marginLeft: '20px' }}><div>{ticketObj.audi.name}</div><span style={{ display: 'inline-block', marginRight: '2px', fontWeight: 'bold' }}>{ticketObj.seats[index].seatNumber}, {ticketObj.session.category}</span></div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#222', marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('h:mm A')}</div>
                                <div style={{ marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('ddd DD-MM-YYYY')}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', fontSize: '10px' }}>
                            <div style={{ flexGrow: 1 }}>Invoice: {ticketObj.seats[index].invoiceNumber}</div>
                            <div style={{ flexGrow: 1 }}>GSTIN: {ticketObj.cinema.gstNumber}</div>
                            <div>SAC: {ticketObj.cinema.movieSAC}</div>
                        </div>
                        <div style={{ display: 'flex', fontSize: '10px' }}>
                            <div style={{ flexGrow: 1 }}>{ticketObj.booking.id}</div>
                            <div style={{ flexGrow: 1 }}>Issued On: {moment(ticketObj.booking.time).format('DD-MM-YYYY')}, {moment(ticketObj.booking.time).format('h:mm A')}</div>
                            <div>{ticketObj.booking.posUser}</div>
                        </div>
                        <div style={{ width: '100%', position: 'relative', top: '-5px', marginBottom: '-16px' }}>
                            <span style={{ width: '10px', margin: '0px auto', display: 'inherit' }}>&#9986;</span>
                        </div>
                    </div>);
                })
                }
            </div>);
        })
        }</div>);
}

export function ticketTemplate6(ticketObj) {
    let priceStrings = getPriceString(ticketObj);
    return (ticketObj.seats.length && <div>
        {ticketObj.seats.map((data, index) => {
            return (<div>
                {_.times(3, i => {
                    return (<div style={{ width: '303px', marginBottom: '10px', borderBottom: (i != 2) ? '1px dashed #000' : '', webkitPrintColorAdjust: 'exact' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '-1px', wordSpacing: '2px', marginBottom: '6px' }}>{ticketObj.cinema.name}- {ticketObj.movie.name + '(' + ticketObj.movie.censor + ')'}</div>
                        <div style={{ fontSize: '11px' }}>
                            <div style={{ display: 'inline-block' }}>
                                <table style={{ width: '139px' }} cellPadding="0px" cellSpacing="0px">
                                    <tbody>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>Net Admin Charges</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[0].toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>CGST</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[1].toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>SGST</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[2].toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>L.Tax</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[3].toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontSize: '11px' }}>3D Charge</td>
                                            <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[4]}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>Total</td>
                                            <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>{(priceStrings[index].collectivePrice[0] + priceStrings[index].collectivePrice[1] + priceStrings[index].collectivePrice[2] + priceStrings[index].collectivePrice[3] + parseFloat(priceStrings[index].collectivePrice[4])).toFixed(2) || 0}</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div style={{ fontSize: '11px', fontWeight: 'normal', fontStyle: 'italic', color: '#222' }}>{moment(ticketObj.session.startDateTime).format('h:mm A')}, {moment(ticketObj.session.startDateTime).format('ddd DD/MM/YYYY')} </div>
                            </div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', display: 'inline-block', verticalAlign: 'top', marginLeft: '10px', width: '153px' }}>
                                <div style={{ width: '100%', textAlign: 'right' }}>
                                    <span style={{ display: 'inline-block', padding: '0px 4px', background: '#000', color: '#fff', textAlign: 'center' }}>{ticketObj.audi.name}</span>
                                </div>
                                <div>Silver </div>
                                <div><span style={{ display: 'inline-block', background: '#000', color: '#fff', borderRadius: '50%', padding: '4px', marginRight: '2px', marginTop: '2px' }}>D-3</span><span style={{ display: 'inline-block', background: '#000', color: '#fff', borderRadius: '50%', padding: '4px', marginRight: '2px', marginTop: '2px' }}>D-4</span><span style={{ display: 'inline-block', background: '#000', color: '#fff', borderRadius: '50%', padding: '4px', marginRight: '2px', marginTop: '2px' }}>D-5</span><span style={{ display: 'inline-block', background: '#000', color: '#fff', borderRadius: '50%', padding: '4px', marginRight: '2px', marginTop: '2px' }}>D-6</span><span style={{ display: 'inline-block', background: '#000', color: '#fff', borderRadius: '50%', padding: '4px', marginRight: '2px', marginTop: '2px' }}>D-7</span><span style={{ display: 'inline-block', background: '#000', color: '#fff', borderRadius: '50%', padding: '4px', marginRight: '2px', marginTop: '2px' }}>D-8</span><span style={{ display: 'inline-block', background: '#000', color: '#fff', borderRadius: '50%', padding: '4px', marginRight: '2px', marginTop: '2px' }}>D-9</span></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', fontSize: '11px' }}>
                            <div style={{ flexGrow: 1 }}>Invoice: {ticketObj.seats[index].invoiceNumber}</div>
                            <div style={{ flexGrow: 1 }}>GSTIN: {ticketObj.cinema.gstNumber}</div>
                            <div>SAC: {ticketObj.cinema.movieSAC}</div>
                        </div>
                        <div style={{ display: 'flex', fontSize: '11px' }}>
                            <div style={{ flexGrow: 1 }}>{ticketObj.booking.id}</div>
                            <div>{ticketObj.booking.posUser}</div>
                        </div>
                        {i != 2 && <div style={{ width: '100%', position: 'relative', top: '-5px', marginBottom: '-16px' }}>
                            <span style={{ width: '10px', margin: '0px auto', display: 'inherit' }}>&#9986;</span>
                        </div>}
                    </div>);
                })
                }
            </div>);
        })
        }</div>);
}

export function ticketTemplate7(ticketObj) {
    let priceStrings = getPriceString(ticketObj);
    let totalBasePrice = 0, totalCgst = 0, totalSgst = 0, totalLtax = 0, total3DCharge = 0;

    priceStrings.map((price, pIndex) => {
        totalBasePrice = totalBasePrice + parseFloat(price.collectivePrice[0]);
        totalCgst = totalCgst + parseFloat(price.collectivePrice[1]);
        totalSgst = totalSgst + parseFloat(price.collectivePrice[2]);
        totalLtax = totalLtax + parseFloat(price.collectivePrice[3]);
        total3DCharge = total3DCharge + parseFloat(price.collectivePrice[4]);
    });
    let allSeats = [];
    ticketObj.seats.map((seat, index) => {
        allSeats.push(seat.seatNumber);
    });
    return (<div>
        {_.times(3, i => {
            return (<div style={{ width: '303px', marginBottom: '6px', borderBottom: '1px dashed #000', webkitPrintColorAdjust: 'exact' }}>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px' }}>{ticketObj.cinema.name}</div>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px', marginBottom: '6px' }}>{ticketObj.movie.name + '(' + ticketObj.movie.censor + ')'}</div>
                <div style={{ fontSize: '11px' }}>
                    <div style={{ display: 'inline-block' }}>
                        <table style={{ width: '139px' }} cellPadding="0px" cellSpacing="0px">
                            <tbody>
                                <tr>
                                    <td style={{ fontSize: '11px' }}>Net Admin Charges</td>
                                    <td style={{ fontSize: '11px' }}>{totalBasePrice.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style={{ fontSize: '11px' }}>CGST</td>
                                    <td style={{ fontSize: '11px' }}>{totalCgst.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style={{ fontSize: '11px' }}>SGST</td>
                                    <td style={{ fontSize: '11px' }}>{totalSgst.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style={{ fontSize: '11px' }}>L.Tax</td>
                                    <td style={{ fontSize: '11px' }}>{totalLtax.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style={{ fontSize: '11px' }}>3D Charge</td>
                                    <td style={{ fontSize: '11px' }}>{total3DCharge.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>Total</td>
                                    <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>{(totalBasePrice + totalCgst + totalSgst + totalLtax + total3DCharge).toFixed(2) || 0}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', display: 'inline-block', verticalAlign: 'top', marginLeft: '10px', width: '153px' }}>
                        <div style={{ marginLeft: '20px' }}><div>{ticketObj.audi.name}</div><span style={{ display: 'inline-block', marginRight: '2px', fontWeight: 'bold' }}>{allSeats.join(', ')} {ticketObj.session.category}</span></div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#222', marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('h:mm A')}</div>
                        <div style={{ marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('ddd DD-MM-YYYY')}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', fontSize: '10px' }}>
                    <div style={{ flexGrow: 1 }}>Invoice: {ticketObj.seats[0].invoiceNumber}</div>
                    <div style={{ flexGrow: 1 }}>GSTIN: {ticketObj.cinema.gstNumber}</div>
                    <div>SAC: {ticketObj.cinema.movieSAC}</div>
                </div>
                <div style={{ display: 'flex', fontSize: '10px' }}>
                    <div style={{ flexGrow: 1 }}>{ticketObj.booking.id}</div>
                    <div style={{ flexGrow: 1 }}>Issued On: {moment(ticketObj.booking.time).format('DD-MM-YYYY')}, {moment(ticketObj.booking.time).format('h:mm A')}</div>
                    <div>{ticketObj.booking.posUser}</div>
                </div>
                <div style={{ width: '100%', position: 'relative', top: '-5px', marginBottom: '-16px' }}>
                    <span style={{ width: '10px', margin: '0px auto', display: 'inherit' }}>&#9986;</span>
                </div>
            </div>);
        })
        }
    </div>);
}

// Ticket templates with mentinance charge
export function ticketTemplate8(ticketObj) {
    let priceStrings = getPriceString(ticketObj);
    return (ticketObj.seats.length && <div>
        {ticketObj.seats.map((data, index) => {
            return (<div>
                {_.times(1, i => {
                    return (<div style={{ width: '303px', marginBottom: '6px', borderBottom: '1px dashed #000', webkitPrintColorAdjust: 'exact' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px' }}>{ticketObj.cinema.name}</div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px', marginBottom: '6px' }}>{ticketObj.movie.name + '(' + ticketObj.movie.censor + ')'}</div>
                        <div style={{ fontSize: '11px' }}>
                            <div style={{ display: 'inline-block' }}>
                                <table style={{ width: '139px' }} cellPadding="0px" cellSpacing="0px">
                                    <tbody>
                                    <tr>
                                        <td style={{ fontSize: '11px' }}>Net Admin Charges</td>
                                        <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[0].toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '11px' }}>CGST</td>
                                        <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[1].toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '11px' }}>SGST</td>
                                        <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[2].toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '11px' }}>3D Charge</td>
                                        <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[4]}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '11px' }}>M. Charge</td>
                                        <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[5].toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>Total</td>
                                        <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>{(priceStrings[index].collectivePrice[0] + priceStrings[index].collectivePrice[1] + priceStrings[index].collectivePrice[2] + priceStrings[index].collectivePrice[3] + parseFloat(priceStrings[index].collectivePrice[4]) + priceStrings[index].collectivePrice[5]).toFixed(2) || 0}</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', display: 'inline-block', verticalAlign: 'top', marginLeft: '10px', width: '153px' }}>
                                <div style={{ marginLeft: '20px' }}><div>{ticketObj.audi.name}</div><span style={{ display: 'inline-block', marginRight: '2px', fontWeight: 'bold' }}>{ticketObj.seats[index].seatNumber}, {ticketObj.session.category}</span></div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#222', marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('h:mm A')}</div>
                                <div style={{ marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('ddd DD-MM-YYYY')}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', fontSize: '10px' }}>
                            <div style={{ flexGrow: 1 }}>Invoice: {ticketObj.seats[index].invoiceNumber}</div>
                            <div style={{ flexGrow: 1 }}>GSTIN: {ticketObj.cinema.gstNumber}</div>
                            <div>SAC: {ticketObj.cinema.movieSAC}</div>
                        </div>
                        <div style={{ display: 'flex', fontSize: '10px' }}>
                            <div style={{ flexGrow: 1 }}>{ticketObj.booking.id}</div>
                            <div style={{ flexGrow: 1 }}>Issued On: {moment(ticketObj.booking.time).format('DD-MM-YYYY')}, {moment(ticketObj.booking.time).format('h:mm A')}</div>
                            <div>{ticketObj.booking.posUser}</div>
                        </div>
                        <div style={{ width: '100%', position: 'relative', top: '-5px', marginBottom: '-16px' }}>
                            <span style={{ width: '10px', margin: '0px auto', display: 'inherit' }}>&#9986;</span>
                        </div>
                    </div>);
                })
                }
            </div>);
        })
        }</div>);
}

export function ticketTemplate1(ticketObj) {
    let priceStrings = getPriceString(ticketObj);
    return (ticketObj.seats.length && <div>
        {ticketObj.seats.map((data, index) => {
            return (<div>
                {_.times(3, i => {
                    return (<div style={{ width: '303px', marginBottom: '6px', borderBottom: '1px dashed #000', webkitPrintColorAdjust: 'exact' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px' }}>{ticketObj.cinema.name}</div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px', marginBottom: '6px' }}>{ticketObj.movie.name + '(' + ticketObj.movie.censor + ')'}</div>
                        <div style={{ fontSize: '11px' }}>
                            <div style={{ display: 'inline-block' }}>
                                <table style={{ width: '139px' }} cellPadding="0px" cellSpacing="0px">
                                    <tbody>
                                    <tr>
                                        <td style={{ fontSize: '11px' }}>Net Admin Charges</td>
                                        <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[0].toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '11px' }}>CGST</td>
                                        <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[1].toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '11px' }}>SGST</td>
                                        <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[2].toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '11px' }}>3D Charge</td>
                                        <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[4]}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '11px' }}>M. Charge</td>
                                        <td style={{ fontSize: '11px' }}>{priceStrings[index].collectivePrice[5]}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>Total</td>
                                        <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>{(priceStrings[index].collectivePrice[0] + priceStrings[index].collectivePrice[1] + priceStrings[index].collectivePrice[2] + priceStrings[index].collectivePrice[3] + parseFloat(priceStrings[index].collectivePrice[4]) + priceStrings[index].collectivePrice[5]).toFixed(2) || 0}</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', display: 'inline-block', verticalAlign: 'top', marginLeft: '10px', width: '153px' }}>
                                <div style={{ marginLeft: '20px' }}><div>{ticketObj.audi.name}</div><span style={{ display: 'inline-block', marginRight: '2px', fontWeight: 'bold' }}>{ticketObj.seats[index].seatNumber}, {ticketObj.session.category}</span></div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#222', marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('h:mm A')}</div>
                                <div style={{ marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('ddd DD-MM-YYYY')}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', fontSize: '10px' }}>
                            <div style={{ flexGrow: 1 }}>Invoice: {ticketObj.seats[index].invoiceNumber}</div>
                            <div style={{ flexGrow: 1 }}>GSTIN: {ticketObj.cinema.gstNumber}</div>
                            <div>SAC: {ticketObj.cinema.movieSAC}</div>
                        </div>
                        <div style={{ display: 'flex', fontSize: '10px' }}>
                            <div style={{ flexGrow: 1 }}>{ticketObj.booking.id}</div>
                            <div style={{ flexGrow: 1 }}>Issued On: {moment(ticketObj.booking.time).format('DD-MM-YYYY')}, {moment(ticketObj.booking.time).format('h:mm A')}</div>
                            <div>{ticketObj.booking.posUser}</div>
                        </div>
                        <div style={{ width: '100%', position: 'relative', top: '-5px', marginBottom: '-16px' }}>
                            <span style={{ width: '10px', margin: '0px auto', display: 'inherit' }}>&#9986;</span>
                        </div>
                    </div>);
                })
                }
            </div>);
        })
        }</div>);
}

export function ticketTemplate10(ticketObj) {
    let priceStrings = getPriceString(ticketObj);
    let totalBasePrice = 0, totalCgst = 0, totalSgst = 0, totalLtax = 0, total3DCharge = 0, mc=0;

    priceStrings.map((price, pIndex) => {
        totalBasePrice = totalBasePrice + parseFloat(price.collectivePrice[0]);
        totalCgst = totalCgst + parseFloat(price.collectivePrice[1]);
        totalSgst = totalSgst + parseFloat(price.collectivePrice[2]);
        totalLtax = totalLtax + parseFloat(price.collectivePrice[3]);
        total3DCharge = total3DCharge + parseFloat(price.collectivePrice[4]);
        mc = mc + parseFloat(price.collectivePrice[5]);
    });
    let allSeats = [];
    ticketObj.seats.map((seat, index) => {
        allSeats.push(seat.seatNumber);
    });
    return (<div>
        {_.times(3, i => {
            return (<div style={{ width: '303px', marginBottom: '6px', borderBottom: '1px dashed #000', webkitPrintColorAdjust: 'exact' }}>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px' }}>{ticketObj.cinema.name}</div>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '-1px', wordSpacing: '2px', marginBottom: '6px' }}>{ticketObj.movie.name + '(' + ticketObj.movie.censor + ')'}</div>
                <div style={{ fontSize: '11px' }}>
                    <div style={{ display: 'inline-block' }}>
                        <table style={{ width: '139px' }} cellPadding="0px" cellSpacing="0px">
                            <tbody>
                            <tr>
                                <td style={{ fontSize: '11px' }}>Net Admin Charges</td>
                                <td style={{ fontSize: '11px' }}>{totalBasePrice.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style={{ fontSize: '11px' }}>CGST</td>
                                <td style={{ fontSize: '11px' }}>{totalCgst.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style={{ fontSize: '11px' }}>SGST</td>
                                <td style={{ fontSize: '11px' }}>{totalSgst.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style={{ fontSize: '11px' }}>L.Tax</td>
                                <td style={{ fontSize: '11px' }}>{totalLtax.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style={{ fontSize: '11px' }}>3D Charge</td>
                                <td style={{ fontSize: '11px' }}>{total3DCharge.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style={{ fontSize: '11px' }}>M. Charge</td>
                                <td style={{ fontSize: '11px' }}>{mc.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>Total</td>
                                <td style={{ borderTop: '1px dashed #000', fontSize: '11px', fontWeight: 'bold' }}>{(totalBasePrice + totalCgst + totalSgst + totalLtax + total3DCharge + mc).toFixed(2) || 0}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px', display: 'inline-block', verticalAlign: 'top', marginLeft: '10px', width: '153px' }}>
                        <div style={{ marginLeft: '20px' }}><div>{ticketObj.audi.name}</div><span style={{ display: 'inline-block', marginRight: '2px', fontWeight: 'bold' }}>{allSeats.join(', ')} {ticketObj.session.category}</span></div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#222', marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('h:mm A')}</div>
                        <div style={{ marginLeft: '20px' }}>{moment(ticketObj.session.startDateTime).format('ddd DD-MM-YYYY')}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', fontSize: '10px' }}>
                    <div style={{ flexGrow: 1 }}>Invoice: {ticketObj.seats[0].invoiceNumber}</div>
                    <div style={{ flexGrow: 1 }}>GSTIN: {ticketObj.cinema.gstNumber}</div>
                    <div>SAC: {ticketObj.cinema.movieSAC}</div>
                </div>
                <div style={{ display: 'flex', fontSize: '10px' }}>
                    <div style={{ flexGrow: 1 }}>{ticketObj.booking.id}</div>
                    <div style={{ flexGrow: 1 }}>Issued On: {moment(ticketObj.booking.time).format('DD-MM-YYYY')}, {moment(ticketObj.booking.time).format('h:mm A')}</div>
                    <div>{ticketObj.booking.posUser}</div>
                </div>
                <div style={{ width: '100%', position: 'relative', top: '-5px', marginBottom: '-16px' }}>
                    <span style={{ width: '10px', margin: '0px auto', display: 'inherit' }}>&#9986;</span>
                </div>
            </div>);
        })
        }
    </div>);
}