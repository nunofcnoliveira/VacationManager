import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import $ from 'jquery';
import { api } from '../api';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import MyAutosuggest from '../components/MyAutosuggest';

class HREmployeesEdit extends Component {
	constructor(props) {
		super(props);

		this.state = {
			employeeListData: undefined,
			approverListData: undefined,
			logout: false,

			// Used by page operations
			selectedEmployeeId: '',
			selectedEmployeeName: '',
			emplfullname: '',
			emplemail: '',
			emplidentifier: '',
			emplapproverId: '',
			emplapproverName: '',
			emplroles: [],
			emplstatus: '',
			emplIsExternal: '',

			wasUpdated: 0,

			// Related with react-autosuggest
			employeeNameList: '',
			approverNameList: '',
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

	handleUserInput(e) {
		e.target.classList.add('active');
		this.setState({[e.target.name]: e.target.value});

		this.formValidation(e.target.name);
	}

	formValidation(fieldName) {
		const validity = this.refs[fieldName].validity;
		const label = document.getElementById(`${fieldName}Label`).textContent;
		const error = document.getElementById(`${fieldName}Error`);

		if (!validity.valid) {
			if (validity.valueMissing) {
				// error.textContent = 'Please enter a value';
				error.textContent = `'${label}' is a required field`;
			} else if (validity.typeMismatch) {
				// error.textContent = 'Please enter a valid email address';
				error.textContent = `'${label}' should be a valid e-mail address`;
			}

			return false;
		}

		error.textContent = '';
		return true;
	}

	handleEmployeeUpdate(e, corfirmSubmit) {
		e.preventDefault();

		// Checks if all input form fields are valid. Will have to be adjusted for other FF types (radio, textarea, etc) if necessary
		const inputs = document.querySelectorAll('input[type="text"], input[type="email"]');
		let isFormValid = true;

		inputs.forEach(input => {
			input.classList.add('active');

			if (input.name !== "") {
				const isInputValid = this.formValidation(input.name, input.min, input.max);

				if (!isInputValid) {
					isFormValid = false;
				}
			}
		});

		if (this.state.emplapproverName === '' || this.state.emplapproverName === null) {
			document.getElementById(`emplapproverNameError`).textContent = 'Please select an approver'
			isFormValid = false;
		}

		if (!isFormValid) {
			console.log('Form is invalid: do not submit.');
		} else {
			if (this.state.emplstatus === '3' && corfirmSubmit === 'no') {
				$('#submitConfirmationModal').modal('show');
			} else if (this.state.emplstatus < '3' || (this.state.emplstatus === '3' && corfirmSubmit === 'yes')) {
				$('#submitConfirmationModal').modal('hide');

				// Update employee
				let curr_approver_id = null;
				if (this.state.emplapproverId !== '')
					curr_approver_id = this.state.emplapproverId;

				api.employees.editEmployee(this.state.selectedEmployeeId, this.state.emplfullname, this.state.emplidentifier, this.state.emplemail, curr_approver_id, this.state.emplIsExternal)
				.then((response) => {
					if (response.ok)
						return response.json()
					else
						this.handleHTTPErrors(response);
				}).then((json) => {
					if (!json.error) {
						$("#submitFailed").hide();
						$("#submitSuccessful").show().text( json.message ).delay(3000).fadeOut();

						// Add roles to user, if any were defined
						let curr_roles = ['reset'];
						if (this.state.emplroles.length > 0)
							curr_roles = this.state.emplroles;

						api.employees.editRoles(this.state.selectedEmployeeId, curr_roles)
						.then((response) => {
							if (response.ok)
								return response.json()
							else
								this.handleHTTPErrors(response);
						}).then((json) => {
							// Get updated employee list
							this.getEmployeeList();
						}).catch((ex) => {
							console.log('Parsing failed', ex);
						})

						// Update employee status
						api.employees.editStatus(this.state.selectedEmployeeId, this.state.emplstatus)
						.then((response) => {
							if (response.ok)
								return response.json()
							else
								this.handleHTTPErrors(response);
						}).then((json) => {
							
						}).catch((ex) => {
							console.log('Parsing failed', ex);
						})

						// Get updated employee list
						this.getEmployeeList();

						// Clear state vars
						this.setState({
							selectedEmployeeId: '',
							selectedEmployeeName: '',
							emplfullname: '',
							emplemail: '',
							emplidentifier: '',
							emplapproverId: '',
							emplapproverName: '',
							emplroles: [],
							emplstatus: '',
							emplIsExternal: 0,
							wasUpdated: 1,
						})

						// Remove 'active' class from all input form fields
						$('input').removeClass('active');

						// Clear selected approver name field
						$('#selectedApprover').empty();
						$('#removeSelectedApprover').hide();

						// Unselect all 'roles' checkboxes
						$('input[type="checkbox"]').prop('checked', false);

						// Enable form fields
						$('#hremployeesedit_left .list-group-item').removeClass('list-group-item-active');
						$('#hremployeesedit_right input').prop("disabled", true);
						$('#hremployeesedit_right select').prop("disabled", true);
						$('#form-group-button-disabled').removeClass('active').css({'opacity': '0.5', 'pointer-events': 'none'});
						$('#btnSubmit').addClass('disabled').css({'pointer-events': 'none'});
					} else {
						$("#submitFailed").show().text( json.error.custom_message );
						$("#submitSuccessful").hide();
					}
				}).catch((ex) => {
					console.log('Parsing failed', ex);
				})
			}
		}
	}

	getEmployeeList() {
		// Get employee list (enabled)
		api.employees.getEmployeeList()
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			let employeeNameList = [];

			// Put all enabled users on the autosuggest list
			json.employee_list.map((item) => {
				return employeeNameList.push(item.name);
			})

			// Get employee list (disabled)
			api.employees.getInactiveEmployeeList()
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json2) => {
				// Append all disabled - but not removed - employees to the autosuggest list. Also delete all 'removed' employees from main employee array. Shoo :)
				json2.employee_list.map((item, index) => {
					if (item.status < 3) {
						return employeeNameList.push(item.name);
					} else {
						return json2.employee_list.splice(index, 1000);
					}
				})

				employeeNameList.sort();

				// Combine and sort (alpha by name) all employeenames, enabled and disabled
				let allEmployees = [...json.employee_list, ...json2.employee_list];
				allEmployees.sort((a, b) => a.name.localeCompare(b.name));

				this.setState({
					employeeNameList: employeeNameList,
					employeeListData: allEmployees,
					wasUpdated: 0
				});
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})
	}

	// Related with react-autosuggest
	processAutosuggest(newValue) {
		// Get details for the selected emplooyee
		this.state.employeeListData.map(item => {
			if (item.name === newValue) {
				// Process approver data
				let currApproverId = item.approver !== null ? item.approver.id : null
				let currApproverName = item.approver !== null ? item.approver.name : null

				if(currApproverName !== null) {
					$('#selectedApprover').text( item.approver.name );
					$('#removeSelectedApprover').show();
				} else {
					$('#selectedApprover').empty();
					$('#removeSelectedApprover').hide();
				}

				$('#approverSelectionModal').modal('hide');

				// Process roles data
				$('input[type="checkbox"]').prop('checked', false);

				$('input[type=checkbox]').map((index1, el) =>  {
					for (var value of item.roles) {
						if (el.value === value)
							el.checked = true;
					}

					return true;
				});

				let currIsExternal = item.is_external !== null ? item.is_external : 0

				this.setState({
					selectedEmployeeId: item.id,
					selectedEmployeeName: item.name,
					emplfullname: item.name,
					emplemail: item.email,
					emplidentifier: item.employee_identifier,
					emplapproverId: currApproverId,
					emplapproverName: currApproverName,
					emplroles: item.roles,
					emplstatus: item.status,
					emplIsExternal: currIsExternal,
					wasUpdated: 0
				})

				// Enable form fields
				$('input').prop("disabled", false);
				$('select').prop("disabled", false);
				$('#form-group-button-disabled').addClass('active').css({'opacity': '1', 'pointer-events': 'auto'});
				$('#btnSubmit').removeClass('disabled').css({'pointer-events': 'auto'});

				let approverNameList = [];
				let allApprovers = [...this.state.employeeListData];

				/*
				allApprovers.map((currApprover, index) => {
					if (currApprover.name === item.name)
						allApprovers.splice(index, 1);
				})
				*/

				allApprovers.map((currApprover, index) => {
					return approverNameList.push(currApprover.name);
				})

				this.setState({
					approverListData: allApprovers,
					approverNameList: approverNameList
				});

				return true;
			} else {
				return false;
			}
		})
	};

	// Related with react-autosuggest
	processAutosuggestModal(newValue) {
		// Update employee Id and employee name based on selected suggestion
		this.state.employeeListData.map(item => {
			if (item.name === newValue) {
				this.setState({
					emplapproverId: item.id, 
					emplapproverName: item.name
				});

				$('#approverSelectionModal').modal('hide');
				$('#selectedApprover').text( item.name );
				$('#removeSelectedApprover').show();
			}

			return true;
		})
	};

	// Used by user-selection list
	handleSelectedEmployee(e, employeeId, employeeName) {
		// Get details for the selected emplooyee
		this.state.employeeListData.map(item => {
			if (employeeId === item.id) {
				// Process approver data
				let currApproverId = item.approver !== null ? item.approver.id : null
				let currApproverName = item.approver !== null ? item.approver.name : null

				if (currApproverName !== null) {
					$('#selectedApprover').text( item.approver.name );
					$('#removeSelectedApprover').show();
				} else {
					$('#selectedApprover').empty();
					$('#removeSelectedApprover').hide();
				}

				// Process roles data
				$('input[type="checkbox"]').prop('checked', false);

				$('input[type=checkbox]').map((index1, el) =>  {
					for (var value of item.roles) {
						if (el.value === value)
							el.checked = true;
					}

					return true;
				});

				let currIsExternal = item.is_external !== null ? item.is_external : 0

				this.setState({
					selectedEmployeeId: employeeId,
					selectedEmployeeName: employeeName,
					emplfullname: item.name,
					emplemail: item.email,
					emplidentifier: item.employee_identifier,
					emplapproverId: currApproverId,
					emplapproverName: currApproverName,
					emplroles: item.roles,
					emplstatus: item.status,
					emplIsExternal: currIsExternal,
					wasUpdated: 0
				})

				let approverNameList = [];
				let allApprovers = [...this.state.employeeListData];

				/*
				allApprovers.map((currApprover, index) => {
					if (currApprover.name === item.name)
						allApprovers.splice(index, 1);
				})
				*/

				allApprovers.map((currApprover, index) => {
					return approverNameList.push(currApprover.name);
				})

				this.setState({
					approverListData: allApprovers,
					approverNameList: approverNameList
				});

				return true;
			} else {
				return false;
			}
		})

		// Enable form fields
		$('input').prop("disabled", false);
		$('select').prop("disabled", false);
		$('#emplapproverNameLabel').addClass('active').css({'opacity': '1', 'pointer-events': 'auto'});
		$('#btnSubmit').removeClass('disabled').css({'pointer-events': 'auto'});
	}

	// Used by approver-selection list (modal)
	handleSelectedApproverModal(e, approverId, approverName) {
		this.setState({
			emplapproverId: approverId,
			emplapproverName: approverName,
		})


		$('#approverSelectionModal').modal('hide');
		$('#selectedApprover').text( approverName );
		$('#removeSelectedApprover').show();

		$('#emplapproverNameError').text('');
	}

	showApproverSelectionModal(e) {
		this.setState({
			// emplapproverId: '', 
			// emplapproverName: '',
			showApproverSelectionModal: true
		})
	}

	onChangeRoles(e) {
		let options = this.state.emplroles;

		// Add check option to options array
		if (e.target.checked) {
			options.push( e.target.value )
		// Remove option from list in one line - using es6, not old-fashioned splice, indexOf functions ;)
		} else {
			options = options.filter(item => item !== e.target.value);
		}

		options.sort()

		this.setState({ emplroles: options })
	}

	onChangeIsExternal(e) {
		if (e.target.checked) {
			this.setState({ emplIsExternal: 1 })
		} else {
			this.setState({ emplIsExternal: 0 })
		}
	}

	componentDidMount() {
		this.getEmployeeList();
	}

	render() {
		let { logout } = this.state;

		if (logout) {
			return (
				<Redirect to="/login"/>
			)
		}

		$(document).ready(function() {
			// Display currently selected employee as 'active'
			const $listGroup = $('#hremployeesedit_left .list-group-item');
			$listGroup.on('click', (e) => {
				$listGroup.removeClass('list-group-item-active')
				$(e.currentTarget).addClass('list-group-item-active')
			});
		});

		let arrRoles = localStorage.getItem("emplRoles").split(",");

		return (
			<div>
				<Navigation />

				<div className="content-wrapper">
					{/* Content */}
					<div className="container-fluid">
						{/* Employee creation */}
						<div className="row">
							{/* Content */}
							<div className="col-12">
								<div id="hremployeesedit_content">
									{/* User selection */}
									<div id="hremployeesedit_left">
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
																			id="hrEmployeesEdit"
																			placeholder="Type employee name"
																			data={ this.state.employeeNameList }
																			processfunction={ (e) => this.processAutosuggest(e) }
																			wasupdated={ this.state.wasUpdated }
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

									{/* User details */}
									<div id="hremployeesedit_right">
										<div>
											<div className="form-group required" style={{ display: 'inline-block' }}>
												<label id="emplfullnameLabel" className="control-label">Full Name</label>
												<input 
													type="text"
													name="emplfullname"
													ref="emplfullname"
													className="form-control large"
													value={ this.state.emplfullname }
													onChange={ (e) => this.handleUserInput(e) }
													required
													disabled
												/>
											</div>
											<div className="frmErrMsg">
												<div id="emplfullnameError" />
											</div>
										</div>

										<div>
											<div className="form-group required" style={{ display: 'inline-block' }}>
												<label id="emplemailLabel" className="control-label">E-mail</label>
												<input 
													type="email"
													name="emplemail"
													ref="emplemail"
													className="form-control large"
													value={ this.state.emplemail }
													onChange={ (e) => this.handleUserInput(e) }
													pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,3}$"
													required
													disabled
												/>
											</div>
											<div className="frmErrMsg">
												<div id="emplemailError" />
											</div>
										</div>

										<div>
											<div className="form-group required" style={{ display: 'inline-block' }}>
												<label id="emplidentifierLabel" className="control-label">Identifier</label>
												<input 
													type="text"
													name="emplidentifier"
													ref="emplidentifier"
													className="form-control medium"
													value={ this.state.emplidentifier }
													onChange={ (e) => this.handleUserInput(e) }
													required
													disabled
												/>
											</div>
											<div className="frmErrMsg">
												<div id="emplidentifierError" />
											</div>
										</div>

										<div className="form-group disabled required">
											<label className="control-label">Approver</label>
											<span id="emplapproverNameLabel" className="form-group-button-disabled" style={{ opacity: '0.5', pointerEvents: 'none' }}>
												<button type="button" className="btn btn-link" data-toggle="modal" data-target="#approverSelectionModal" onClick={ (e) => this.showApproverSelectionModal(e) }>Select approver</button>
											</span>
											<div className="frmErrMsg" style={{ display: 'inline-block', margin: '0 0 0 0', color: 'red', fontWeight: 'bold' }}>
												<div id="emplapproverNameError" />
											</div>

											<div>
												<span style={{ display: 'inline-block' }}>
													<span id="selectedApprover"></span>&nbsp;
													{/*
													<span 
														id="removeSelectedApprover" 
														className="glyphicon glyphicon-remove text-danger" 
														title="Remove"
														style={{ display: 'none', cursor: 'pointer' }}
														onClick={ (e) => {
															this.setState({ emplapproverId: '', emplapproverName: '' });
															$('#selectedApprover').empty();
															$('#removeSelectedApprover').hide();
														}}
													></span>
													*/}
												</span>
											</div>
										</div>

										<div className="form-group">
											<label className="control-label">Roles</label>

											{ arrRoles.includes('ROLE_ADMIN') &&
												<div className="checkbox">
													<label><input type="checkbox" value="ROLE_ADMIN" onChange={ (e) => this.onChangeRoles(e) } disabled /> Admin</label>
												</div>
											}
											<div className="checkbox">
												<label><input type="checkbox" value="ROLE_HR" onChange={ (e) => this.onChangeRoles(e) } disabled /> HR</label>
											</div>
											<div className="checkbox">
												<label><input type="checkbox" value="ROLE_MANAGER" onChange={ (e) => this.onChangeRoles(e) } disabled /> Manager</label>
											</div> 
										</div>

										<div className="form-group">
											<label className="control-label">Status</label>

											<select className="form-control frmmedium" value={ this.state.emplstatus } onChange={ (e) => this.setState({ emplstatus: e.target.value }) } disabled>
												<option value="1">Enabled</option>
												<option value="2">Disabled</option>
												<option value="3">Removed</option>
											</select>
										</div>

										<div className="form-group">
											<label className="control-label">Is external</label>&nbsp;&nbsp;
											<input type="checkbox" checked={ this.state.emplIsExternal } onChange={ (e) => this.onChangeIsExternal(e) } disabled />
										</div>

										<hr />

										<div className="text-center">
											<button id="btnSubmit" className="btn btn-default btn-primary disabled" style={{ pointerEvents: 'none' }} onClick={ (e) => this.handleEmployeeUpdate(e, 'no') }>Update</button>
										</div>

										<div id="submitSuccessful" className="generalMsg" />
										<div id="submitFailed" className="generalErrMsg" />

										<div id="emailAlreadyExists" className="alert alert-danger" style={{ margin: '10px 0 0 0', display: 'none' }}>
											<strong>Attention!</strong> An employee for the specified email address already exists.
										</div>
									</div>
								</div>

								{/* DEBUG
								<div>
									<strong>Selected employee:</strong> { this.state.selectedEmployeeId }, { this.state.selectedEmployeeName }<br />
									<strong>Full Name:</strong> { this.state.emplfullname }<br />
									<strong>E-mail:</strong> { this.state.emplemail }<br />
									<strong>Identifier:</strong> { this.state.emplidentifier }<br />
									<strong>Approver:</strong> { this.state.emplapproverId }, { this.state.emplapproverName }<br />
									<strong>Roles:</strong> { this.state.emplroles }<br />
									<strong>Status:</strong> { this.state.emplstatus }<br />
									<strong>Is_external:</strong> { this.state.emplIsExternal }
								</div>
								 */}

								{/* Approver Selection Modal */}
								<div className="modal fade" id="approverSelectionModal">
									<div className="modal-dialog modal-lg">
										<div className="modal-content">
											<div className="modal-header">
												<h5 className="modal-title">
													Select approver
												</h5>
												<button className="close" type="button" data-dismiss="modal" aria-label="Close">
													<span aria-hidden="true">×</span>
												</button>
											</div>

											<div className="modal-body">
												{ this.state.employeeListData !== undefined ? (
													<div>
														{/* If there are more than 10 employees, display employee search as well as the employee list */}
														{/* Otherwise, if there are up to 10 employees, only display the employee list, no need to search :) */}
														{ this.state.employeeListData.length > 10 ? (
															<div id="accordion_modal">
																<div className="card">
																	<div className="card-header">
																		<a 
																			className="card-link" 
																			data-toggle="collapse" 
																			data-parent="#accordion_modal" 
																			href="#collapseOneModal"
																			onClick={ (e) => { 
																				this.setState({ emplapproverId: '', emplapproverName: '' });
																			}}
																		>
																			<strong>Search an approver</strong>
																		</a>
																	</div>
																	<div id="collapseOneModal" className="collapse show">
																		<div className="card-body">
																			<MyAutosuggest 
																				id="hrEmployeesEditModal"
																				placeholder="Type approver name"
																				data={ this.state.approverNameList }
																				processfunction={ (e) => this.processAutosuggestModal(e) }
																			/>
																		</div>
																	</div>
																</div>
																<div className="card">
																	<div className="card-header">
																		<a 
																			className="collapsed card-link" 
																			data-toggle="collapse" 
																			data-parent="#accordion_modal" 
																			href="#collapseTwoModal"
																			onClick={ (e) => {
																				this.setState({ value: '', emplapproverId: '', emplapproverName: '' });
																			}}
																		>
																			<strong>Select an approver</strong>
																		</a>
																	</div>
																	<div id="collapseTwoModal" className="collapse">
																		<div className="card-body">
																			<ul className="list-group">
																				{
																					this.state.employeeListData.map(item => {
																						return <li key={ item.employee_identifier } name={ item.name } className="list-group-item" onClick={ (e) => this.handleSelectedApproverModal(e, item.id, item.name) }>{ item.name }</li>;
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
																		return <li key={ item.employee_identifier } name={ item.name } className="list-group-item" onClick={ (e) => this.handleSelectedApproverModal(e, item.id, item.name) }>{ item.name }</li>;
																	})
																}
															</ul>
														)}
													</div>
												) : (
													<div className="card">
														<div className="card-body">
															Loading...
														</div>
													</div>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* Submit confirmation modal */}
								<div className="modal fade" id="submitConfirmationModal">
									<div className="modal-dialog">
										<div className="modal-content">
											<div className="modal-header">
												<h5 className="modal-title">
													Submit employee information
												</h5>
												<button className="close" type="button" data-dismiss="modal" aria-label="Close">
													<span aria-hidden="true">×</span>
												</button>
											</div>

											<div className="modal-body text-left">
												<strong>Warning!</strong> You're about to remove this employee. Are you sure you want to proceed?
											</div>

											<div className="modal-footer mx-auto">
												<button className="btn btn-default btn-primary" onClick={ (e) => this.handleEmployeeUpdate(e, 'yes') }>Confirm</button>
												<button className="btn btn-default btn-secondary" data-dismiss="modal" onClick={ (e) => $('input').removeClass('active') }>Cancel</button>
											</div>
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

export default HREmployeesEdit;