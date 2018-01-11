import React, { Component } from 'react';
import { connect } from 'react-redux';
import './Header.scss';
import IdbRTC from '../../utils/idb_rtc';
import postman from '../../utils/postman';
import { sendMessage } from '../../utils/sockets';
import { logout } from '../../actions/loginAction';
import { getOnlineStatus } from '../../utils/utils';
import { switchTab } from '../../actions/headerAction';
import { isSocketRegistered, isSocketConnected } from '../../utils/sockets';
import { unblockSeatTimer, deleteBlockedSheets } from '../../actions/confirmBookingActions';

let isAlreadyLoad = false;
let isUpSyncDone = false;

class Header extends Component {
    constructor() {
        super();
        this.state = {
            master: '',
            showReportstab: false,
            actualRole: ''
        };
    }

    switchTab(tab) {
        this.props.switchTab(tab);
    }

    setRolesForLoggedInUser(users) {
        let role = '';
        users.length > 0 && users.map((user) => {
            role = user.id === this.props.currentTab.loginReducer.userData.id ? user.role_name : role;
        });
        this.setState({ showReportstab: !(role === 'Operator' || role === ''), actualRole: role });
    }

    getUserAndSetRole() {
        if (this.props.currentTab.loginReducer.userData && this.props.currentTab.loginReducer.userData.id) {
            IdbRTC.getUsers().then((users) => {
                this.setRolesForLoggedInUser(users.result);
            }).catch((error) => {
                postman.publish('showToast', {
                    message: error.message,
                    type: 'error'
                });
                this.setRolesForLoggedInUser([]);
            });
        }
    }

    componentWillMount() {
        this.handleUpdateStatus();
        this.getUserAndSetRole();
        postman.subscribe('syncDoneStatus', (data) => {
            this.getUserAndSetRole();
        });
    }

    async handleUpdateStatus() {
        IdbRTC.findMasterInfo().then((data) => {
            data = data.result;
            data[0] && (data[0].is_master === 0 || data[0].is_master === 1) && this.setState({ master: data[0].is_master });
        }).catch((error) => {
            postman.publish('showToast', {
                message: error.message,
                type: 'error'
            });
            this.setState({ master: '' });
        });
    }

    componentDidMount() {
        this.logoutevent = postman.subscribe('logoutUser', () => {
            this.props.logout();
        });
        this.reloadTriggered = postman.subscribe('reloadTriggered', () => {
            deleteBlockedSheets(15);
        });
        deleteBlockedSheets(15);
        unblockSeatTimer();
        if (this.props.currentTab.loginReducer.userData && this.props.currentTab.loginReducer.userData.id) {
            localStorage.setItem('userId', this.props.currentTab.loginReducer.userData.id);
        } else {
            localStorage.clear();
        }
        this.switchTab('BookTickets');
        postman.subscribe('updatedmasterInfo', () => {
            this.handleUpdateStatus();
        });

        postman.subscribe('switchTabEvt', (data) => {
            this.switchTab(data);
        });
    }

    sendData(event) {
        sendMessage(event.target.value);
    }

    render() {
        return (
            <div className='header'>
                <div className='leftSide'>
                    <div className='paytmLogo' />
                    {<div
                        className={'tabSelect ' + ((this.props.currentTab.headerReducer === 'BookTickets') ? 'selected' : '')}>
                        <button onClick={() => {
                            this.switchTab('BookTickets');
                        }}>Book Tickets
                        </button>
                    </div>}
                    {<div
                        className={'tabSelect ' + (this.props.currentTab.headerReducer === 'HistoricalStatement' ? 'selected' : '')}>
                        <button onClick={() => {
                            this.switchTab('HistoricalStatement');
                        }}>Historical Statement
                        </button>
                    </div>}
                    {<div
                        className={'tabSelect ' + (this.props.currentTab.headerReducer === 'FindBooking' ? 'selected' : '')}>
                        <button onClick={() => {
                            this.switchTab('FindBooking');
                        }}>Find Booking
                        </button>
                    </div>}
                    {this.state.showReportstab && <div
                        className={'tabSelect ' + (this.props.currentTab.headerReducer === 'Reports' ? 'selected' : '')}>
                        <button onClick={() => {
                            this.switchTab('Reports');
                        }}>Reports
                        </button>
                    </div>}
                </div>
                <div className='rightSide'>
                    {(this.state.master === 1) && <div className='coloredStrip'>M</div>}
                    {(this.state.master === 0) && <div className='coloredStrip'>S</div>}
                    <div className='logout' onClick={() => {
                        this.props.logout();
                    }}>Logout
                    </div>
                    <div>{this.props.statusOnline && (<span className='onLineStatus'>Online</span>) || (
                        <span className='offLineStatus'>Offline</span>)}</div>
                </div>
            </div>
        );
    }
}

// Which props do we want to inject, given the global state?
function select(state) {
    return {
        currentTab: state,
        selectedState: state.headerReducer
    };
}

// Wrap the component to inject dispatch and state into it
export default connect(select, (dispatch) => {
    return {
        switchTab: (tab) => {
            dispatch(switchTab(tab));
        },
        logout: () => {
            dispatch(logout());
        }
    };
})(Header);