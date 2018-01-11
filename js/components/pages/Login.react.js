import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import { login } from '../../actions/loginAction';
import postman from  '../../utils/postman';
class Login extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            userField: [{
                name: 'user',
                value: '',
                isValid: false
            },
                {
                    name: 'pwd',
                    value: '',
                    isValid: false
                }
            ]
        };
    }

    handleChange(type, e) {
        this.state.userField.map(function (field, index) {
            if (field.name == type) {
                field.value = e.target.value;
            }
        });
        this.setState(this.state);
    }

    validateUserField(type, value) {
        let isInvalid = false;
        switch (type) {
            case 'user':
                if(value)
                isInvalid = !value /*!validationService.isValidEmail(value)*/;
                break;
            case 'pwd':
                isInvalid = !value;
        }
        return isInvalid;
    }

    onLogin = (e) => {
        e.preventDefault();
        let userData = {};
        let isValid = 0;
        let self = this;
        this.state.userField.map(function (field, index) {
            field.isValid = self.validateUserField(field.name, field.value);
            isValid += field.isValid;
            userData[field.name] = field.value;
        });
        this.setState(this.state);
        if (isValid == 0) {
            this.props.login(userData);
        }
        self.setState(self.state);
    };

    render() {
        return (
			<div className="rootLogin">
                {/*Start login here*/}
				<div className="loginContainer">
					<div id="login-header" className="auto header">
						<div className="lightText letterspacing text30 pbt14">Welcome to Paytm Boxoffice POS!</div>
					</div>
                    {/*End login here*/}
					<div className="userLoginSubContainer">
						<form onSubmit={this.onLogin.bind(this)}>
							<div className="loginSubHead">Please Login to Continue</div>
							<div><label>Username</label><br/><input type="number" autocomplete="off" maxLength="10" minLength="10" placeholder="Enter User Phone Number" onChange={(e)=> {
                                this.handleChange('user', e);
                            }}/></div>
                            {this.state.userField[0].isValid && <span className="errorStyle">Please enter valid Username</span>}
							<div><label>Password</label><br/><input type="password" autocomplete="off" placeholder="Enter Password" onChange={e=> {
                                this.handleChange('pwd', e);
                            }} id="secret-password"/></div>
                            {this.state.userField[1].isValid && <span className="errorStyle">Please enter valid Password</span>}
							<div>
								<button type="submit">Login</button>
							</div>
						</form>
					</div>
					<div id="login-body">
						<div id="imagePopCorn">
							<div>
								<div className="popCornIcons"></div>
								<p className="footerText">One stop to manage your Cinema, Showtimes, Movies & More</p>
							</div>
						</div>

					</div>
				</div>
			</div>
        );
    }
}

function mapStateToProps(state) {
    return {
        userData: state.loginReducer.userData,
    };
}

export default connect(mapStateToProps, (dispatch) => {
    return {
        login : (userData) => {
            dispatch(login(userData));
        }
    };
})(Login);

