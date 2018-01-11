// @flow
import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Link} from 'react-router';
import $ from 'jquery';
import * as modalActions from '../../actions/modalActions';
import './modalNew.scss';


class ModalNew extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {showModal: false};
  }

  handleModal(status) {
    this.props.handleCheckStateModal(status);
  }

  render() {
    return (<div>{this.props.showModal && <div id="myModalNew" className="modal">
      <div className="modal-content modal-content-custom" style={{'width':this.props.modalWidth,'margin-top':this.props.topPos}}>
        <span className="close" onClick={() => {
          this.handleModal('no');
        }}>&times;</span>
        {/*Start modal body here*/}
        {this.props.children}
        {/*End modal body here*/}
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

export default connect(mapStateToProps, mapDispatchToProps)(ModalNew);
