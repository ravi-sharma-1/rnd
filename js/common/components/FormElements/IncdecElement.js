// @flow
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as formActions from '../../actions/formActions';
import formInfo from './FormElements.json';
class IncdecElement extends Component {
    field=formInfo.indivdualFormItem;
    constructor(props, context) {
        super(props, context);
        this.state={
        };
    }

    componentWillMount() {
    }

    componentWillUnmount(){

    }

    handleCountChange=(opType, index, id)=>{
        var itemValue = parseInt(this.props.defaultValue);
            if(opType == 'inc'){
                ++itemValue;
            }else {
                if (itemValue > 0) {
                    --itemValue;
                }
            }
         this.props.handleIncDecValue({
             itemVal:itemValue,
             itemIndex:index,
             itemId:id
         });
    }
    // componentWillReceiveProps=(item)=>{
    //     this.setState({
    //         "itemVal":item.defaultValue
    //     });
    // }
    render() {
        return (
            <div className="items">
                <div key={this.props.itemIndex} className="item">
                    <div className="numericSelector commonClass">
                        <span data-value="minus" onClick={() => {this.handleCountChange('desc', this.props.itemIndex, this.props.itemId);}}>–</span>
                        <label className="currency_count_new" >{parseInt(this.props.defaultValue)}</label>
                        <span data-value="plus" onClick={() => {this.handleCountChange('inc', this.props.itemIndex, this.props.itemId);}}>+</span>
                    </div>
                </div>
            </div>
        );
    }
}

export default IncdecElement;
