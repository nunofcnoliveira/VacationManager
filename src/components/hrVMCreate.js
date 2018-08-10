import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import $ from 'jquery';
import { api } from '../api';

import moment from 'moment';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import MyAutosuggest from '../components/MyAutosuggest';

class HRVacationMapCreate extends Component {
	constructor(props) {
		super(props);

		const today = moment();

		this.state = {
			employeeListData: undefined,
			logout: false,

			selectedEmployeeId: '',
			selectedEmployeeName: '',
			allowedVacationDays: '',
			allowedOtherVacationDays: '',

			yearList: [{ Name: today.year() + 1 }, { Name: today.year() }, { Name: today.year() - 1 }, { Name: today.year() - 2 }, { Name: today.year() - 3 }],
			selectedYear: '',

			// Related with react-autosuggest
			employeeNameList: '',
			wasUpdated: 0,
		}
	}

	handleHTTPErrors(response) {
		if (response.status === 401 || response.status === 403) {
			localStorage.removeItem("access_token");
			localStorage.removeItem("expires_in");
			localStorage.removeItem("curr_username");
			localStorage.removeItem("curr_password");
			localStorage.removeItem("emplId");
			localStorage.removeItem("emplRoles");
			localStorage.removeItem("no_access_msg");
			localStorage.clear();

			setTimeout(() => {
				this.setState(_ => ({
					logout: true
				}));
			}, 100);
		} else {
			var error = new Error(response.status + ": " + response.statusText)
			error.response = response
			throw error
		}
	}

	handleSelectedYear(e) {
		// If selected year is blank
		if (e.target.value === '0') {
			// Clear any error messages
			document.getElementById(`allowedVacationDaysError`).textContent = '';
			document.getElementById(`allowedOtherVacationDaysError`).textContent = '';
			document.getElementById(`noEmployeeSelectedError`).textContent = '';

			// Make whole page - except year selection form field - inactive i.e. "grayed-out"
			$('.row:last-of-type .hrvmcreate_content').css({'opacity': '0.5', 'pointer-events': 'none'});
			// Make already grayed-out employees fully visible, so that they don't get double-grayed-out
			$('#hrvmcreate_col_left .list-group-item').css({'opacity': '1', 'pointer-events': 'none'});
			// Unselect currently selected employee (if any)
			$('#hrvmcreate_col_left .list-group-item').removeClass('list-group-item-active');
		// Otherwise, if an actual year was selected
		} else {
			// Make whole page - except year selection form field - active
			$('.row:last-of-type .hrvmcreate_content').css({'opacity': '1', 'pointer-events': 'auto'});

			let employeeNameList = [];

			// Loop through each employee
			this.state.employeeListData.map((item, index) => {
				let yearList = [];
				// Get list of years for which the current employee has a VM
				item.vacation_maps.map(item2 => {
					return yearList.push(item2.year);
				})

				// If current current employee already has a vacation map for the currently selected year (i.e. already has a v0)
				// ...make that employee inactive, we don't want to create multiple VM v0s for the same employee, for the same year :)
				if (yearList.includes(Number(e.target.value))) {
					$('#hrvmcreate_col_left .list-group-item:nth-of-type(' + (index + 1) + ')').css({'opacity': '0.5', 'pointer-events': 'none'});
				// Current employee doesn't have a VM for the selected year, so make that employee active.
				// Also add that employee to the autosuggest list. This way, we can only search for employees without a VM v0 ;)
				} else {
					$('#hrvmcreate_col_left .list-group-item:nth-of-type(' + (index + 1) + ')').css({'opacity': '1', 'pointer-events': 'auto'});
					employeeNameList.push(item.name);
				}

				return true;
			})

			this.setState({ employeeNameList: employeeNameList });
		}

		this.setState({
			selectedEmployeeId: '',
			selectedEmployeeName: '',
			selectedYear: (e.target.value > 0) ? e.target.value : '',
			allowedVacationDays: '',
			allowedOtherVacationDays: '',
			// value: '',
		});
	}

	// Related with react-autosuggest
	processAutosuggest(newValue) {
		// Update employee Id and employee name based on selected suggestion
		this.state.employeeListData.map(item => {
			if (item.name === newValue) {
				this.setState({
					selectedEmployeeId: item.id, 
					selectedEmployeeName: item.name,
				});
			}

			return true;
		})
	}

	// Triggered when allowed_days or other_days are changed. Updates state and provides real-time validation
	handleDaysChange(e) {
		this.setState({ [e.target.name]: e.target.value });
		this.showInputError(e.target.name, e.target.min, e.target.max);
	}

	// Provides form validation
	showInputError(fieldName, fieldMinVal, fieldMaxVal) {
		const validity = this.refs[fieldName].validity;
		const error = document.getElementById(`${fieldName}Error`);

		if (!validity.valid) {
			if (validity.valueMissing) {
				error.textContent = 'Please enter a value';
			} else if (validity.rangeUnderflow) {
				error.textContent = 'Value must be between ' + fieldMinVal + ' and ' + fieldMaxVal;
			} else if (validity.rangeOverflow) {
				error.textContent = 'Value must be between ' + fieldMinVal + ' and ' + fieldMaxVal;
			}

			return false;
		}

		error.textContent = '';
		return true;
	}

	handleSubmit(e) {
		e.preventDefault();

		// Checks if all input form fields are valid. Will have to be adjusted for other FF types (radio, textarea, etc) if necessary
		const inputs = document.querySelectorAll('input');
		let isFormValid = true;

		inputs.forEach(input => {
			if (input.name !== "") {
				const isInputValid = this.showInputError(input.name, input.min, input.max);

				if (!isInputValid) {
					isFormValid = false;
				}
			}
		});

		// Check if an employee has been selected from the list
		if (this.state.selectedEmployeeId === '') {
			document.getElementById(`noEmployeeSelectedError`).textContent = 'Please select an employee from the list'
			isFormValid = false;
		}

		if (!isFormValid) {
			console.log('Form is invalid: do not submit.');
		} else {
			// Create vacation map (v0) for the selected employee, for the selected year
			api.vacation_maps.createMap(this.state.selectedYear, this.state.selectedEmployeeId, this.state.allowedVacationDays, this.state.allowedOtherVacationDays)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json) => {
				
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})

			// Do general page maintenance (clear states, update employee in question from highlighted to grayed-out, display submit message)
			this.setState({
				selectedEmployeeId: '',
				selectedEmployeeName: '',
				allowedVacationDays: '',
				allowedOtherVacationDays: '',
			})

			$('#hrvmcreate_col_left li.list-group-item-active').css({'opacity': '0.5', 'pointer-events': 'none'});
			$('#hrvmcreate_col_left .list-group-item').removeClass('list-group-item-active');

			$("#submitSuccessful").show().text('Vacation map saved successfully.').delay(3000).fadeOut();
		}
	}

	handleSelectedEmployee(e, selectedEmployeeId, selectedEmployeeName) {
		// Clear any error messages
		document.getElementById(`allowedVacationDaysError`).textContent = '';
		document.getElementById(`allowedOtherVacationDaysError`).textContent = '';
		document.getElementById(`noEmployeeSelectedError`).textContent = '';

		this.setState({
			selectedEmployeeId: selectedEmployeeId,
			selectedEmployeeName: selectedEmployeeName,
		})
	}

	componentDidMount() {
		// Get employee list
		api.employees.getEmployeeList()
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			this.setState({ employeeListData: json.employee_list });
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})
	}

	render() {
		let { logout } = this.state;

		if (logout) {
			return (
				<Redirect to="/login"/>
			)
		}

		// Display currently selected employee as 'active'
		$(document).ready(function() {
			const $listGroup = $('#hrvmcreate_col_left .list-group-item');
			$listGroup.on('click', (e) => {
				$listGroup.removeClass('list-group-item-active')
				$(e.currentTarget).addClass('list-group-item-active')
			})
		});

		return (
			<div>
				<Navigation />

				<div className="content-wrapper">
					{/* Content */}
					<div className="container-fluid">
						{/* Year selection */}
						<div className="row">
							<div className="col-12">
								<div className="hrvmcreate_content">
									<div className="form-group">
										<strong>Please select a year: </strong>
										<select className="form-control" onChange={ (e) => this.handleSelectedYear(e) } value={ this.state.selectedYear }>
											<option value="0"></option>
											{
												this.state.yearList.map(item => {
													return <option key={ item.Name } value={ item.Name }>{ item.Name }</option>;
												})
											}
										</select>
									</div>
								</div>
							</div>
						</div>

						{/* VM management */}
						<div className="row">
							<div className="col-12">
								<div className="hrvmcreate_content">
									{/* User selection */}
									<div id="hrvmcreate_col_left">
										{ this.state.employeeListData !== undefined ? (
											<div className="card">
												<div className="card-body">
													{/* If there are more than 10 employees, display employee search as well as the employee list */}
													{/* Otherwise, if there are up to 10 employees, only display the employee list, no need to search :) */}
													{ this.state.employeeListData.length > 10 ? (
														<div id="accordion">
															<div className="card">
																<div className="card-header">
																	<a className="card-link" data-toggle="collapse" data-parent="#accordion" href="#collapseOne">
																		<strong>Search an employee</strong>
																	</a>
																</div>
																<div id="collapseOne" className="collapse show">
																	<div className="card-body">
																		<MyAutosuggest 
																			id="mngmnVMHistory"
																			placeholder="Type employee name"
																			data={ this.state.employeeNameList }
																			processfunction={ (e) => this.processAutosuggest(e) }
																		/>
																	</div>
																</div>
															</div>
															<div className="card">
																<div className="card-header">
																	<a className="collapsed card-link" data-toggle="collapse" data-parent="#accordion" href="#collapseTwo">
																		<strong>Select an employee</strong>
																	</a>
																</div>
																<div id="collapseTwo" className="collapse">
																	<div className="card-body">
																		<ul className="list-group">
																			{
																				this.state.employeeListData.map(item => {
																					return <li key={ item.employee_identifier } name={ item.name } className="list-group-item" onClick={ (e) => this.handleSelectedEmployee(e, item.id, item.name) }>{ item.name }</li>;
																				})
																			}
																		</ul>
																	</div>
																</div>
															</div>
														</div>
													) : (
														<ul className="list-group">
															{
																this.state.employeeListData.map(item => {
																	return <li key={ item.employee_identifier } name={ item.name } className="list-group-item" onClick={ (e) => this.handleSelectedEmployee(e, item.id, item.name) }>{ item.name }</li>;
																})
															}
														</ul>
													)}
												</div>
											</div>
										) : (
											<div className="card">
												<div className="card-body">
													Loading...
												</div>
											</div>
										)}
									</div>

									{/* VM creation */}
									<div id="hrvmcreate_col_right">
										<div id="hrvmcreate_col_right_row1">
											<div className="card">
												<div className="card-header">
													<strong>Employee:</strong> { this.state.selectedEmployeeName }
												</div>

												<div className="card-body">
													<div className="card-body-container">
												 		<div className="row">
															<div className="rowCaption">
																<strong>Allowed vacation days:</strong>
															</div>
															<div className="rowFF">
																<input 
																	name="allowedVacationDays" 
																	ref="allowedVacationDays" 
																	value={ this.state.allowedVacationDays } 
																	onChange={ (e) => this.handleDaysChange(e) }
																	className="form-control" 
																	required type="number" min="1" max="99" />
															</div>
															<div className="rowErrMsg">
																<div id="allowedVacationDaysError" />
															</div>
														</div>

														<div className="row">
															<div className="rowCaption">
																<strong>Allowed bonus days:</strong>
															</div>
															<div className="rowFF">
																<input 
																	name="allowedOtherVacationDays" 
																	ref="allowedOtherVacationDays" 
																	value={ this.state.allowedOtherVacationDays } 
																	onChange={ (e) => this.handleDaysChange(e) }
																	className="form-control" 
																	required type="number" min="1" max="3" />
															</div>
															<div className="rowErrMsg">
																<div id="allowedOtherVacationDaysError" />
															</div>
														</div>
												 	</div>
												</div>
											</div>
										</div>

										<div id="hrvmcreate_col_right_row2">
											<div className="text-center">
												<button className="btn btn-default btn-primary" onClick={ (e) => this.handleSubmit(e) }>Create</button>
											</div>

											<div id="noEmployeeSelectedError" className="generalErrMsg" />
											<div id="submitSuccessful" className="generalMsg" />
										</div>

										<div id="hrvmcreate_col_right_row3">
											{/* 
											<br />
											<strong>Selected year:</strong> { this.state.selectedYear }<br />
											<strong>Selected employee id:</strong> { this.state.selectedEmployeeId }<br />
											<strong>Selected employee name:</strong> { this.state.selectedEmployeeName }<br />
											<strong>Allowed vacation days:</strong> { this.state.allowedVacationDays }<br />
											<strong>Allowed other vacation days:</strong> { this.state.allowedOtherVacationDays }
											*/}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<Footer />
				</div>
			</div>
		);
	}
}

export default HRVacationMapCreate;