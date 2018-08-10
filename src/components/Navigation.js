import React, { Component } from 'react';
import { NavLink, Redirect } from 'react-router-dom';

import LogoImg from '../assets/img/cleverti_logo.png';

import $ from 'jquery';
import { api } from '../api';

class Navigation extends Component {
	constructor(props) {
		super(props);

		this.state = {
			logout: false,
			emplName: undefined,
			emplRoles: [],
			showDeleteConfirmModal: false,
		};
	}

	showDeleteConfirmModal(e) {
		this.setState({ showDeleteConfirmModal: true })
	}

	logout(e) {
		// User has clicked on 'Logout', so set state and clear localStorage accordingly
		localStorage.removeItem("access_token");
		localStorage.removeItem("expires_in");
		localStorage.removeItem("curr_username");
		localStorage.removeItem("curr_password");
		localStorage.removeItem("emplId");
		localStorage.removeItem("emplRoles");
		localStorage.removeItem("no_access_msg");
		localStorage.clear();

		this.setState({ logout: true })

		$('#exampleModal').on('shown.bs.modal', function () {
			$(".modal-backdrop.in").hide();
		})
	}

	componentDidMount() {
		this.setState({
			emplName: localStorage.getItem("emplName"),
			emplRoles: localStorage.getItem("emplRoles")
		});

		// If we're loggin in, get employee details (id, roles)
		if (localStorage.getItem("access_token")) {
			if (!localStorage.getItem("emplId")) {
				api.users.logincheck()
				.then((response) => {
					return response.json()
				}).then((json) => {
					this.setState({
						emplName: json.employee.name,
						emplRoles: json.employee.roles
					})

					localStorage.setItem("emplId", json.employee.id);
					localStorage.setItem("emplName", json.employee.name);
					localStorage.setItem("emplRoles", json.employee.roles);
				}).catch(function(ex) {
					console.log('Parsing failed', ex);
				})
			}

			// DEAL WITH LOGIN EXPIRATION

			// Calculate seconds elapsed between login and now. When half of the allocated user session time is reached, get a new token,
			// When the allocated user session time is reached, log the user out.
			let expires_in = localStorage.getItem("expires_in");
			let login_datetime = localStorage.getItem("login_datetime");
			let curr_datetime = new Date().getTime();
			let time_after_login = Math.round((curr_datetime - login_datetime) / 1000);

			if (time_after_login >= (expires_in / 2) && time_after_login < expires_in) {
				console.log('Session is about to expire, renew token');

				api.oauth.refreshToken(
					localStorage.getItem("client_id"),
					localStorage.getItem("client_secret"),
					localStorage.getItem("refresh_token")
				).done((response) => {
					localStorage.setItem("access_token", response.access_token);
					localStorage.setItem("refresh_token", response.refresh_token);
					localStorage.setItem("expires_in", response.expires_in);
				}).fail((response) => {
					$('#login_errors').html(response.error_description || response.statusText);
				});

				localStorage.setItem("login_datetime", new Date().getTime());
			} else if (time_after_login >= expires_in) {
				this.setState({ logout: true });
			}
		// We're not loged in (either user )
		} else {
			this.setState({ logout: true });

			if (window.location.pathname !== '/')
				localStorage.setItem("no_access_msg", "That page is protected. Please login in order to access it.");
			else
				localStorage.removeItem("no_access_msg");
		}
	}

	render() {
		const { logout } = this.state

		$(window).resize(function() {
			$("#dimensions").html($(window).width() + 'px');
		}).resize();

		// User has clicked on 'Logout', so re-direct to login page
		if (logout) {
			return (
				<Redirect to="/login"/>
			)
		}

		return(
			<div>
				<nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top" id="mainNav"> 
				{/* <nav className="navbar navbar-expand-lg navbar-light bg-light static-top" id="mainNav"> */}
					<NavLink className="navbar-brand" style={{ background: 'transparent' }} to="/">
						<img src={LogoImg} alt='' />
						{/* Vacation Manager
						Page Width: <span id="dimensions"></span> */}
					</NavLink>

					{ this.state.emplName !== undefined ? (
						<div className="lead nav-brand-employee">Vacation Manager for { this.state.emplName }</div>
					) : (
						<div className="lead nav-brand-employee">Vacation Manager</div>
					)}

					<button className="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarResponsive" aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
						<span className="navbar-toggler-icon"></span>
					</button>
					<div className="collapse navbar-collapse" id="navbarResponsive">
						<ul className="navbar-nav navbar-sidenav sidebar_list">
							<h5><strong>GENERAL</strong></h5>
							<li><NavLink to="/vacationmapview">View Vacation Map</NavLink></li>
							<li><NavLink to="/vacationmapedit">Edit Vacation Map</NavLink></li>
							<li><NavLink to="/vacationmaphistory">Version History</NavLink></li>

							{ this.state.emplRoles !== null && this.state.emplRoles.includes('ROLE_MANAGER') &&
								<hr />
							}

							{ this.state.emplRoles !== null && this.state.emplRoles.includes('ROLE_MANAGER') &&
								<div>
								<h5><strong>MANAGEMENT</strong></h5>
								<li><NavLink to="/vacationmapmanagement">Manage Vacation Map</NavLink></li>
								<li><NavLink to="/managevacationmaphistory">Vacation Map History</NavLink></li>
								</div>
							}

							{ this.state.emplRoles !== null && this.state.emplRoles.includes('ROLE_HR') &&
								<hr />
							}

							{ this.state.emplRoles !== null && this.state.emplRoles.includes('ROLE_HR') &&
								<div>
									<h5><strong>HR</strong></h5>
									<li><NavLink to="/hrvacationmapcreate">Create Vacation Map</NavLink></li>
									<li><NavLink to="/hrvacationmapedit">Edit Allowed Days</NavLink></li>
									<li><NavLink to="/hrpublicholidaysmanagement">Public Holidays Management</NavLink></li>
									<li><NavLink to="/hremployeecreate">Create New Employee</NavLink></li>
									<li><NavLink to="/hremployeesedit">Edit Employees</NavLink></li>
									<li><NavLink to="/hrglobalvm">Global Vacation Map</NavLink></li>
									{/*
									<li><NavLink to="/tests1">Tests 1</NavLink></li>
									<li><NavLink to="/tests2">Tests 2</NavLink></li>
									*/}
								</div>
							}
						</ul>

						<ul className="navbar-nav ml-auto">
							<li className="nav-item">
								<a className="nav-link" data-toggle="modal" data-target="#myModal">
									<i className="fa fa-fw fa-sign-out"></i>Logout
								</a>
							</li>
						</ul>
					</div>
				</nav>

				{/* Logout confirmation modal */}
				<div className="modal fade" id="myModal">
					<div className="modal-dialog">
						<div className="modal-content">
							<div className="modal-header">
								<h5 className="modal-title" id="exampleModalLabel">Ready to Leave?</h5>
								<button className="close" type="button" data-dismiss="modal" aria-label="Close">
								<span aria-hidden="true">×</span>
								</button>
							</div>

							<div className="modal-body">
								Select "Logout" below if you are ready to end your current session.
							</div>

							<div className="modal-footer">
								<button className="btn btn-secondary" type="button" data-dismiss="modal">Cancel</button>
								<button className="btn btn-primary" type="button" data-dismiss="modal" onClick={ (e) => this.logout(e) }>Logout</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

export default Navigation;