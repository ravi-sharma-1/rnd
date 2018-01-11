import config from 'boxoffice-config';

const boxofficeLoginCall = config.posFe.boEndPoint;
export const blockSeatData = boxofficeLoginCall + 'seats/pos/booking/block-seat';
export const seatUnBlockingUrl = boxofficeLoginCall + 'seats/pos/booking/unblock-seat/';
export const loginToLocalDb = boxofficeLoginCall + 'seats/pos/login';
export const syncDataUrl = boxofficeLoginCall + 'seats/sync_url';
export const syncUrl = boxofficeLoginCall + 'seats/pos/sync';
export const socketConnectionURL = config.posFe.socketEndPoint;
export const bookUrl = boxofficeLoginCall + 'seats/pos/booking/book-seat';
export const statusMaster = boxofficeLoginCall + 'seats/pos/booking/statusMaster';
export const bookMaster = boxofficeLoginCall + 'seats/pos/booking/bookMaster';
export const unblockMaster = boxofficeLoginCall + 'seats/pos/booking/unblockMaster';
export const syncUpBookingData = boxofficeLoginCall + 'seats/pos/booking/addMaster';
export const syncUpRefundStatus = boxofficeLoginCall + 'seats/pos/booking/refund-seat';
export const printStatus = boxofficeLoginCall + 'seats/pos/booking/printPos/';
export const ackSyncDone = boxofficeLoginCall + 'seats/pos/sync_ack/'; //:ackId
export const checkSytemTimeInSyncWithServer = boxofficeLoginCall + 'seats/pos/checkSystemTime';
export const loggingUrl = boxofficeLoginCall + 'seats/pos/logging';
export const reportsUrl = boxofficeLoginCall + 'seats/pos/report';
export const printMaster = boxofficeLoginCall + 'seats/pos/booking/printMaster';
export const sendDbDumpFromIndexedDb = boxofficeLoginCall + 'seats/pos/posDBDump';
export const teleBlockOnline = boxofficeLoginCall + 'seats/pos/booking/tele-block-seat';
export const modifyTeleBlockOnline = boxofficeLoginCall + 'seats/pos/booking/tele-block-modify';