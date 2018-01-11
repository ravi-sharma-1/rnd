// @flow
import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Link} from 'react-router';
import $ from 'jquery';
import * as modalActions from '../../actions/modalActions';
import './modal.scss';


class Modal extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {showModal: false};
  }

  handleModal(status) {
    this.props.handleCheckStateModal(status);
  }

  render() {
    return (<div>{this.props.showModal && <div id="myModal" className="modal">
      <div className="modal-content">
        <span className="close" onClick={() => {
          this.handleModal('no');
        }}>&times;</span>
        <h2>{this.props.modalHeader ? this.props.modalHeader : 'Confirm Action' }</h2>
        <p className="mainTextArea">{this.props.modalBody ? this.props.modalBody : 'Are you sure?' }</p>
        <div className="actionBtn">
          {this.props.modalFooter.noText && <span onClick={() => {
            this.handleModal('no');
          }}>{this.props.modalFooter.noText}</span>}
          {this.props.modalFooter.yesText && <span onClick={() => {
            this.handleModal('yes');
          }}>{this.props.modalFooter.yesText}</span>}
        </div>
      </div>
    </div>
    }</div>);
  }
}

function mapStateToProps(state) {
  return {modalReducer: state};
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(modalActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Modal);
