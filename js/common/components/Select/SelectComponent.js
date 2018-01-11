// @flow
import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as dropDownAction from '../../actions/SelectComponentAction';

class SelectComponent extends Component {
  constructor(props, context) {
    super(props, context);
    this.state={
      'optData': this.props.optionsData && this.props.optionsData.options.length > 0 ? this.props.optionsData.options : []
    };
  }


  handleCountChange=(e)=> {
    this.props.getSelectedItem(e.target.value);
  };

  componentWillMount=()=>{
  };

  render() {
    var defaultOpt = this.props.optionsData && this.props.optionsData.default?this.props.optionsData.default:'';
    return (<div className="SelectContainer" >
      <select onChange={(e)=> {
        this.handleCountChange(e);
      }} defaultValue={defaultOpt}>
        {this.state.optData && this.state.optData.map(function (data, index) {
          return (<option key={index} value={data.name} >{data.value}</option>);
        })}
      </select>
    </div>);
  }
}

function mapStateToProps(state) {
  return {dropDownData: state.dropDownData};
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(dropDownAction, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps) (SelectComponent);
