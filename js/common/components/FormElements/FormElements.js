// @flow
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as formActions from '../../actions/formActions';

class FormElements extends Component {
    constructor(props, context) {      
      super(props, context);             
    }

    componentWillMount() {
      this.props.getFormItems();  
    }   

    componentWillUnmount(){
      this.props.formReducer.formItems && this.props.formReducer.formItems.map(function(field,index){
        field.value = 0;
      });
    }
    
    handleCountChange(opType,index,currencyValue){
      let upData = Object.assign({}, this.props.formReducer);     
      let totalCollectedAmt = this.props.formReducer.totalAmount;  
      if(opType == 'inc'){
        if(upData.formItems[index]){     
          upData.formItems[index].value = upData.formItems[index].value +1;
          totalCollectedAmt = totalCollectedAmt + currencyValue; 
        }
      }else{
        if(upData.formItems[index] && upData.formItems[index].value > 0){
          upData.formItems[index].value = upData.formItems[index].value -1;
          totalCollectedAmt = (totalCollectedAmt > currencyValue) ? (totalCollectedAmt - currencyValue) : 0;   
        }
      }

      upData.totalAmount = totalCollectedAmt;
      this.props.updateFormData(upData);   
    }
    render() {
          return (
              <div className="items">
                  {this.props.formReducer && this.props.formReducer.formItems && this.props.formReducer.formItems.map(function(field,index){
                    return (<div key={index} className="item">
                      <div  className="amount">{field.label}</div>
                      <div className="numericSelector commonClass">
                        <span data-value="minus" onClick={() => {this.handleCountChange('desc',index,field.currencyValue);}}>–</span>
                        <label className="currency_count" >{field.value}</label>
                        <span data-value="plus" onClick={() => {this.handleCountChange('inc',index,field.currencyValue);}}>+</span>
                      </div>
                    </div>);
                  },this)}
              </div>
          );
    }
}

function mapStateToProps(state) { 
  return {formReducer: state.formReducer};
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(formActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(FormElements);
