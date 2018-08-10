import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import LogoImg from '../assets/img/cleverti_logo.png';

import $ from 'jquery';
import { api } from '../api';

class Login extends Component {
	constructor(props) {
		super(props);

		this.state = {
			username: '',
			password: '',
			client_id: '',
			client_secret: '',
			redirectToReferrer: false
		};
	}

	handleChange(e) {
		this.setState({ [e.target.name]: e.target.value });
	}

	showInputError(refName) {
		const validity = this.refs[refName].validity;
		const label = document.getElementById(`${refName}Label`).textContent;
		const error = document.getElementById(`${refName}Error`);
		const isPassword = refName.indexOf('password') !== -1;

		if (!validity.valid) {
			if (validity.valueMissing) {
				error.textContent = `${label} is a required field`;
			} else if (validity.typeMismatch) {
				error.textContent = `${label} should be a valid email address`; 
			} else if (isPassword && validity.patternMismatch) {
				error.textContent = `${label} should be longer than 4 chars`; 
			}

			return false;
		}

		error.textContent = '';
		return true;
	}

	handleKeyPress(e) {
		if (e.charCode === 13) {
			this.handleLoginSubmit(e);
		}
	}

	handleLoginSubmit(e) {
		e.preventDefault();

		const inputs = document.querySelectorAll('input');
		let isFormValid = true;

		inputs.forEach(input => {
			const isInputValid = this.showInputError(input.name);

			if (!isInputValid) {
				isFormValid = false;
			}
		});

		// If user input (U/N + P/W) is valid, check if login has been successful
		if (isFormValid) {
			api.oauth.login(this.state.username, this.state.password)
				.then((response) => {
					if (response.ok) {
						return response.json()
					} else {
						let error = new Error(response.status + ": " + response.statusText)

						$('#login_errors').html(error);
					}
				}).then((json) => {
					// console.log(json);
					localStorage.setItem("access_token", json.token.access_token);
					localStorage.setItem("refresh_token", json.token.refresh_token);
					localStorage.setItem("expires_in", json.token.expires_in);
					localStorage.setItem("login_datetime", new Date().getTime());

					this.setState({ redirectToReferrer: true })
				}).catch((ex) => {
					console.log('Parsing failed', ex);
				})
		}
	}

	componentDidMount() {
		// Clear console (multi-browser solution)
		if (typeof console._commandLineAPI !== 'undefined') {
			console.API = console._commandLineAPI;
		} else if (typeof console._inspectorCommandLineAPI !== 'undefined') {
			console.API = console._inspectorCommandLineAPI;
		} else if (typeof console.clear !== 'undefined') {
			console.API = console;
		}

		console.API.clear();

		// When page loads, get client_id + client_secret
		api.oauth.getClient()
		.then((response) => {
			return response.json()
		}).then((json) => {
			this.setState({
				client_id: json.client.client_id,
				client_secret: json.client.client_secret
			});

			localStorage.setItem("client_id", json.client.client_id);
			localStorage.setItem("client_secret", json.client.client_secret);
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})

		// If users have tried to access a propected page without being logged in first, display a suitable message
		if (localStorage.getItem("no_access_msg")) {
			$('#login_errors').html(localStorage.getItem("no_access_msg")).delay(3000).fadeOut();;
		}
	}

	render() {
		const { redirectToReferrer } = this.state

		// If login has been successful, redirect user to homepage
		if (redirectToReferrer) {
			return (
				<Redirect to="/"/>
			)
		}

		return (
			<div className="bg-white">
				<div className="container">
					<div className="card card-login mx-auto mt-5">
						<div className="card-header">
							<div className="row" style={{ background: 'transparent' }}>
								<div className="pl-2">
									<img src={LogoImg} style={{ width: '150px' }} alt='' />
								</div>
							</div>
						</div>
						<div className="card-body pb-0">
								<div className="form-group">
									<label id="usernameLabel"><strong>E-mail address</strong></label>
									<input 
										type="email"
										name="username"
										ref="username"
										className="form-control frm-login"
										value={ this.state.username }
										onChange={ (e) => this.handleChange(e) }
										onKeyPress={ (e) => this.handleKeyPress(e) }
										placeholder="Enter e-mail"
										autoFocus
										required
									/>
									<div className="rowErrMsg" id="usernameError" />
								</div>
								<div className="form-group">
									<label id="passwordLabel"><strong>Password</strong></label>
									<input 
										type="password"
										name="password"
										ref="password"
										className="form-control frm-login"
										value={ this.state.password }
										onChange={ (e) => this.handleChange(e) }
										onKeyPress={ (e) => this.handleKeyPress(e) }
										pattern=".{5,}"
										placeholder="Enter password"
										required
									/>
									<div className="rowErrMsg" id="passwordError" />
								</div>
								<div className="form-group">
									<button className="btn btn-secondary btn-lg btn-block" onClick={ (e) => this.handleLoginSubmit(e) }>
										<i className="fa fa-fw fa-sign-in"></i> Login
									</button>
								</div>
						</div>
					</div>
				</div>

				<div id="login_errors" className="generalErrMsg" />
			</div>
		);
	}
}

export default Login;