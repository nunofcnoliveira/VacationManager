import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import $ from 'jquery';
import { api } from '../api';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import MyAutosuggest from '../components/MyAutosuggest';

class HREmployeeCreate extends Component {
	constructor(props) {
		super(props);

		this.state = {
			employeeListData: undefined,
			logout: false,

			// Used by page operations
			emplfullname: '',
			emplemail: '',
			emplidentifier: '',
			emplapproverId: '',
			emplapproverName: '',
			emplroles: [],

			// Related with react-autosuggest
			employeeNameList: '',
			value: '',
			suggestions: [],
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

	handleEmployeeCreation(e) {
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

		if (!isFormValid) {
			console.log('Form is invalid: do not submit.');
		} else {
			let curr_approver_id = null;
			if (this.state.emplapproverId !== '')
				curr_approver_id = this.state.emplapproverId;

			// Save new employee
			api.employees.createEmployee(this.state.emplfullname, this.state.emplidentifier, this.state.emplemail, curr_approver_id)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json) => {
				if (!json.error) {
					$("#submitFailed").hide();
					$("#submitSuccessful").show().text( json.message ).delay(3000).fadeOut();

					if (this.state.emplroles.length > 0) {
						// Add roles to user, if any were defined
						api.employees.editRoles(json.employee.id, this.state.emplroles)
						.then((response) => {
							if (response.ok)
								return response.json()
							else
								this.handleHTTPErrors(response);
						}).then((json) => {
							
						}).catch((ex) => {
							console.log('Parsing failed', ex);
						})
					}

					// Get updated employee list
					api.employees.getEmployeeList()
					.then((response) => {
						if (response.ok)
							return response.json()
						else
							this.handleHTTPErrors(response);
					}).then((json) => {
						let employeeNameList = [];
						// Loop through each employee
						json.employee_list.map((item) => {
							return employeeNameList.push(item.name);
						})

						this.setState({
							employeeNameList: employeeNameList,
							employeeListData: json.employee_list
						});
					}).catch((ex) => {
						console.log('Parsing failed', ex);
					})

					// Clear state vars
					this.setState({
						emplfullname: '',
						emplemail: '',
						emplidentifier: '',
						emplapproverId: '',
						emplapproverName: '',
						emplroles: []
					})

					// Remove 'active' class from all input form fields
					$('input').removeClass('active');

					// Clear selected approver name field
					$('#selectedApprover').empty();
					$('#removeSelectedApprover').hide();

					// Unselect all 'roles' checkboxes
					$('input[type="checkbox"]').prop('checked', false);
				} else {
					$("#submitFailed").show().text( json.error.custom_message );
					$("#submitSuccessful").hide();
				}
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}
	}

	// Related with react-autosuggest
	processAutosuggest(newValue) {
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

				return true;
			} else {
				return false;
			}
		})
	};

	// Used by approver-selection list (modal)
	handleSelectedApproverModal(e, approverId, approverName) {
		this.setState({
			emplapproverId: approverId,
			emplapproverName: approverName,
		})

		$('#approverSelectionModal').modal('hide');
		$('#selectedApprover').text( approverName );
		$('#removeSelectedApprover').show();
	}

	showApproverSelectionModal(e) {
		this.setState({ value: '' })
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

	componentDidMount() {
		// Get employee list
		api.employees.getEmployeeList()
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			let employeeNameList = [];
			// Loop through each employee
			json.employee_list.map((item) => {
				return employeeNameList.push(item.name);
			})

			this.setState({
				employeeNameList: employeeNameList,
				employeeListData: json.employee_list
			});
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

		$(document).ready(function() {
			// Display currently selected employee as 'active'
			const $listGroup = $('#mngmtvmhistory_row1_left .list-group-item');
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
							<div className="col-12">
								<div className="hremployeecreate_content">
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
												autoFocus
												required
											/>
										</div>
										<div className="frmErrMsg">
											<div id="emplfullnameError"></div>
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
											/>
										</div>
										<div className="frmErrMsg">
											<div id="emplemailError"></div>
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
											/>
										</div>

										<div className="frmErrMsg">
											<div id="emplidentifierError"></div>
										</div>
									</div>

									<div className="form-group">
										<label className="control-label">Approver</label>
										<button type="button" className="btn btn-link" data-toggle="modal" data-target="#approverSelectionModal" onClick={ (e) => this.showApproverSelectionModal(e) }>Select approver</button>

										<div>
											<span style={{ display: 'inline-block' }}>
												<span id="selectedApprover"></span>&nbsp;
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
											</span>
										</div>
									</div>

									<div className="form-group">
										<label className="control-label">Roles</label>

										{ arrRoles.includes('ROLE_ADMIN') &&
											<div className="checkbox">
												<label><input type="checkbox" value="ROLE_ADMIN" onChange={ (e) => this.onChangeRoles(e) } /> Admin</label>
											</div>
										}
										<div className="checkbox">
											<label><input type="checkbox" value="ROLE_HR" onChange={ (e) => this.onChangeRoles(e) } /> HR</label>
										</div>
										<div className="checkbox">
											<label><input type="checkbox" value="ROLE_MANAGER" onChange={ (e) => this.onChangeRoles(e) } /> Manager</label>
										</div> 
									</div>

									<hr />

									<div className="text-center">
										<button className="btn btn-default btn-primary" onClick={ (e) => this.handleEmployeeCreation(e) }>Create</button>
									</div>

									<div id="submitSuccessful" className="generalMsg" />
									<div id="submitFailed" className="generalErrMsg" />

									<div id="emailAlreadyExists" className="alert alert-danger" style={{ margin: '10px 0 0 0', display: 'none' }}>
										<strong>Attention!</strong> An employee for the specified email address already exists.
									</div>
								</div>

								{/* DEBUG
								<div>
									<strong>Full Name:</strong> { this.state.emplfullname }<br />
									<strongmail:</strong> { this.state.emplemail }<br />
									<strong>Identifier:</strong> { this.state.emplidentifier }<br />
									<strong>Approver:</strong> { this.state.emplapproverId }, { this.state.emplapproverName }<br />
									<strong>Roles:</strong> { this.state.emplroles }
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
															<div id="accordion">
																<div className="card">
																	<div className="card-header">
																		<a 
																			className="card-link" 
																			data-toggle="collapse" 
																			data-parent="#accordion" 
																			href="#collapseOne"
																			onClick={ (e) => { 
																				this.setState({ emplapproverId: '', emplapproverName: '' });
																			}}
																		>
																			<strong>Search an approver</strong>
																		</a>
																	</div>
																	<div id="collapseOne" className="collapse show">
																		<div className="card-body">
																			<MyAutosuggest 
																				id="hrEmployeeCreate"
																				placeholder="Type approver name"
																				data={ this.state.employeeNameList }
																				processfunction={ (e) => this.processAutosuggest(e) }
																			/>
																		</div>
																	</div>
																</div>
																<div className="card">
																	<div className="card-header">
																		<a 
																			className="collapsed card-link" 
																			data-toggle="collapse" 
																			data-parent="#accordion" 
																			href="#collapseTwo"
																			onClick={ (e) => {
																				this.setState({ value: '', emplapproverId: '', emplapproverName: '' });
																			}}
																		>
																			<strong>Select an approver</strong>
																		</a>
																	</div>
																	<div id="collapseTwo" className="collapse">
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
															<div className="card">
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
							</div>
						</div>
					</div>

					<Footer />
				</div>
			</div>
		);
	}
}

export default HREmployeeCreate;