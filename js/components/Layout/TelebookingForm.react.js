// @flow
import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Link} from 'react-router';
import $ from 'jquery';
import * as modalActions from '../../common/actions/modalActions';
import * as layoutAction from '../../actions/layoutAction';
import './Telebooking.scss';

class TelebookingForm extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            mob:'',
            name:'',
            mobValid:true,
            nameValid:true,
            isNameCharecter:true,
            firstLoad:false,
            alreadyExist:false
        };
    }

   /**
    *
    * This method work on change of inputs for telebooking form
    * **/
    handleValidate=(type, e)=>{
        let val =e.target.value, obj={};

        if(type=='mob'){
            if(val.length<11){
                obj['mobValid']=true;
                obj[type] = val;
                this.setState({
                    alreadyExist:false
                });
                this.setState(obj, ()=>{
                    //Check for number already exist
                    if(this.state.mob.length == 10){
                        //check avalability of number
                        let phoneStatus = layoutAction.getPhoneNumberStatus({
                            'tele_book_no':this.state.mob
                        });
                        phoneStatus.then((resp)=>{
                            if(resp.hasOwnProperty('result') && resp.result.hasOwnProperty('9')){
                                this.setState({
                                    alreadyExist:true
                                });
                            }else{
                                this.setState({
                                    alreadyExist:false
                                });
                            }
                        }, (err)=>{
                            if(err.hasOwnProperty('error')){
                                this.setState({
                                    alreadyExist:false
                                });
                            }
                        });
                    }
                });
            }
            return;
        }else if(type=='name'){
            obj[type] = val;
            this.setState(obj);
        }

    }
    /**
     * This method validate name and phone nimber seats and submit
     * **/
    handleTelebook=()=>{
        var patt = /[7-9]{1}\d{9}/;
        var patt1 = /^[a-zA-Z]+((\s){0,1}[a-zA-Z]+)*$/;
        let obj={
            name:this.state.name,
            mob:this.state.mob
        };
        let validMobile = patt.test(this.state.mob);
        let validateName = patt1.test(this.state.name);
        if(obj.mob && obj.name && this.state.mobValid && validMobile && validateName && !this.state.alreadyExist){
            this.setState({
                isNameCharecter:validateName
            });
            this.props.handleTelebook(obj);
        }else{
            this.setState({
                mobValid:validMobile,
                isNameCharecter:validateName,
                nameValid:this.state.mob?true:false,
                firstLoad:true
            });
        }
    }


    render() {
        return (<div className="telebookingMain">
            <div className="telebookingHeader">
                Telebooking Details
            </div>
            <div className="telebookingBody">
            <form>
                <div>
                    <input type="number" onChange={this.handleValidate.bind(this,'mob')} value={this.state.mob} placeholder="Enter Your Mobile"/><span className="redbrdr">*</span>
                    {this.state.mob && !this.state.mobValid && this.state.firstLoad && <div className="redbrdr">Invalid Mobile Number</div>}
                    {!this.state.mob && this.state.firstLoad && <div className="redbrdr">Enter Phone Number</div>}
                    {this.state.mob && this.state.alreadyExist && <div className="redbrdr">Number already exist</div>}
                </div>
                <div>
                    <input type="text" placeholder="Enter Your Name" onChange={this.handleValidate.bind(this,'name')}/><span className="redbrdr">*</span>
                    {!this.state.name && this.state.firstLoad && <div className="redbrdr">Enter Name</div>}
                    {this.state.name && !this.state.isNameCharecter && <div className="redbrdr">Only Charecter Allowed in Name</div>}
                </div>
                <div>
                    <input type="button" value="Telebook" className={this.state.mob && (this.state.mob.length==10) && this.state.name? '':'disabled'} onClick={this.handleTelebook}/>
                </div>
            </form>
            </div>
        </div>);
    }
}

function mapStateToProps(state) {
    return {modalReducer: state};
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators(modalActions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(TelebookingForm);
