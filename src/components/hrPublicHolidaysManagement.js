import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import $ from 'jquery';
import { api } from '../api';

import moment from 'moment';
import { Calendar } from 'react-yearly-calendar';
import '../assets/css/calendars/calendar_mobile_hrPublicHolidaysManagement.css';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

class HRPublicHolidaysManagement extends Component {
	constructor(props) {
		super(props);

		const today = moment();

		const customCSSclasses = {
			weekend: 'Sat,Sun',
			public_holidays: [],
			vacation_days: [],
			other_days: []
		}

		this.state = {
			publicHolidaysData: undefined,
			logout: false,

			yearList: [{ Name: today.year() + 1 }, { Name: today.year() }, { Name: today.year() - 1 }, { Name: today.year() - 2 }, { Name: today.year() - 3 }],

			// Used by page operations
			selectedYear: today.year(),
			curr_publicholiday_date: '',
			curr_publicholiday_origdesc: '',
			curr_publicholiday_desc: '',
			isInputValid: false,

			// Used by react-yearly-calendar
			year: today.year(),
			selectedDay: today,
			showWeekSeparators: false,
			customCSSclasses,
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
		// Get public holidays
		api.public_holidays.getPublicHolidaysList(e.target.value)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			// Get list of public holiday days
			let publicHolidays = [];
			json.holidays.map(item => {
				return publicHolidays.push(item.date);
			})

			// Update style of calendar's public holiday days + public holiday data + public holiday data
			let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
			newCustomCSSclasses.public_holidays = publicHolidays;
			this.setState({ customCSSclasses: newCustomCSSclasses, publicHolidaysData: json.holidays });
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})

		this.setState({
			year: e.target.value,
			selectedYear: e.target.value
		});
	}

	showAddPublicHolidayModal(e) {
		const today = moment();

		$("#publicholidayNewDescError").empty();

		this.setState({
			curr_publicholiday_date: today,
			isInputValid: false,
			curr_publicholiday_desc: ''
		})
	}

	addPublicHoliday(e) {
		this.showInputError('publicholidayNewDesc');

		if (this.state.isInputValid === true) {
			let updated_public_holidays_list = this.state.publicHolidaysData

			// Append new public holiday entry to existing list
			updated_public_holidays_list.push({ "id": -1, "date": this.state.curr_publicholiday_date.format("YYYY-MM-DD"), "description": this.state.curr_publicholiday_desc.trim() })

			$('#phCreateModal').modal('hide');

			// Finally, save changes to DB
			this.updatePublicHolidayList('save', updated_public_holidays_list)
		}
	}

	showEditPublicHolidayModal(e, publicholiday_date, publicholiday_desc) {
		$("#publicholidayChangeDescError").empty();

		this.setState({
			isInputValid: true,
			curr_publicholiday_date: publicholiday_date,
			curr_publicholiday_desc: publicholiday_desc,
			curr_publicholiday_origdesc: publicholiday_desc
		})
	}

	editPublicHoliday(e) {
		if (this.state.isInputValid === true) {
			let updated_public_holidays_list = this.state.publicHolidaysData

			// Update description for the relevant public holiday entry
			updated_public_holidays_list.forEach((currPublicHoliday) => {
				if (currPublicHoliday.date === this.state.curr_publicholiday_date) {
					currPublicHoliday.description = this.state.curr_publicholiday_desc.trim();
				}
			});

			$('#phEditModal').modal('hide');

			// Finally, save changes to DB
			this.updatePublicHolidayList('edit', updated_public_holidays_list)
		}
	}

	showDeletePublicHolidayModal(e, publicholiday_date, publicholiday_desc) {
		this.setState({
			curr_publicholiday_date: publicholiday_date,
			curr_publicholiday_desc: publicholiday_desc
		})
	}

	deletePublicHoliday(e) {
		let updated_public_holidays_list = this.state.publicHolidaysData

		// Delete relevant public holiday entry
		updated_public_holidays_list.forEach((currPublicHoliday, index) => {
			if (currPublicHoliday.date === this.state.curr_publicholiday_date) {
				updated_public_holidays_list.splice(index, 1)
			}
		});

		// Finally, save changes to DB
		this.updatePublicHolidayList('delete', updated_public_holidays_list)
	}

	// Save changes to database
	updatePublicHolidayList(action, data = undefined) {
		api.public_holidays.updatePublicHolidays(this.state.selectedYear, data)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {

		}).then(() => {
			// Get public holidays
			api.public_holidays.getPublicHolidaysList(this.state.year)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json) => {
				// Get list of public holiday days
				let publicHolidays = [];
				json.holidays.map(item => {
					return publicHolidays.push(item.date);
				})

				// Update style of calendar's public holiday days + public holiday data
				let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
				newCustomCSSclasses.public_holidays = publicHolidays;
				this.setState({ customCSSclasses: newCustomCSSclasses, publicHolidaysData: json.holidays });
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}).catch(function(ex) {
			console.log('Parsing failed', ex);
		})
	}

	// Form validation
	showInputError(fieldName) {
		const validity = this.refs[fieldName].validity;
		const error = document.getElementById(`${fieldName}Error`);

		if (!validity.valid) {
			if (validity.valueMissing) {
				error.textContent = 'Please enter a description';
			}

			this.setState({ isInputValid: false })
			return false;
		}

		error.textContent = '';
		this.setState({ isInputValid: true })
		return true;
	}

	handlePHDescChange(e) {
		this.setState({ curr_publicholiday_desc: e.target.value });

		this.showInputError(e.target.name);
	}

	// Used by react-yearly-calendar
	datePicked(date, classes) {
		this.setState({
			selectedDay: date,
			curr_publicholiday_date: date
		});
	}

	// Aux function to move the caret of a given form field to the end
	moveCaretAtEnd(e) {
		let temp_value = e.target.value
		e.target.value = ''
		e.target.value = temp_value
	}

	componentDidMount() {
		// Get public holidays
		api.public_holidays.getPublicHolidaysList(this.state.selectedYear)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json) => {
				// Get list of public holiday days
				let publicHolidays = [];
				json.holidays.map(item => {
					return publicHolidays.push(item.date);
				})

				// Update style of calendar's public holiday days + public holiday data
				let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
				newCustomCSSclasses.public_holidays = publicHolidays;
				this.setState({ customCSSclasses: newCustomCSSclasses, publicHolidaysData: json.holidays });
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
	}

	render() {
		let { year, selectedDay, showWeekSeparators, customCSSclasses, logout } = this.state;

		if (logout) {
			return (
				<Redirect to="/login"/>
			)
		}

		return (
			<div>
				<Navigation />

				<div className="content-wrapper">
					{/* Content */}
					<div className="container-fluid">
						{/* Year selection */}
						<div className="row">
							<div className="col-12">
								<div className="hrpublicholidays_content">
									<div className="form-group text-center">
										<strong>Manage public holidays for: </strong>
										<select ref="selectedYear" className="form-control" onChange={(e) => this.handleSelectedYear(e)} defaultValue={this.state.selectedYear}>
											{
												this.state.yearList.map(item => {
													return <option key={item.Name} value={item.Name}>{item.Name}</option>;
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
								<div className="hrpublicholidays_content text-center">
									<button type="button" className="btn btn-primary btn-lg" data-toggle="modal" data-target="#phCreateModal" onClick={(e) => this.showAddPublicHolidayModal(e)}>Create New Public Holiday</button>

									{/* Public holidays list */}
									{this.state.publicHolidaysData !== undefined ? (
										<div id="phList" className="mt-3">
											{this.state.publicHolidaysData.length > 0 ? (
												<table className="table table-hover">
													<thead className="thead-dark">
														<tr>
															<th className="text-center">Date</th>
															<th className="text-center">Description</th>
															<th className="text-center">Edit</th>
															<th className="text-center">Delete</th>
														</tr>
													</thead>
													<tfoot>
														<tr>
															<td colSpan="4">
																<div id="submitSuccessful" className="generalMsg" />
															</td>
														</tr>
													</tfoot>
													<tbody>
														{
															this.state.publicHolidaysData.map(currPublicHoliday => {
																return <tr key={currPublicHoliday.id}>
																	<td className="text-center phDate">
																		{currPublicHoliday.date}
																	</td>
																	<td className="text-center phDesc">
																		{currPublicHoliday.description}
																	</td>
																	<td className="text-center phEdit">
																		<button className="btn btn-outline-info" data-toggle="modal" data-target="#phEditModal" onClick={(e) => this.showEditPublicHolidayModal(e, currPublicHoliday.date, currPublicHoliday.description)}>
																			<i className="fa fa-edit"></i>
																		</button>
																	</td>
																	<td className="text-center phDelete">
																		<button className="btn btn-outline-danger" data-toggle="modal" data-target="#phDeleteModal" onClick={(e) => this.showDeletePublicHolidayModal(e, currPublicHoliday.date, currPublicHoliday.description)}>
																			<i className="fa fa-remove"></i>
																		</button>
																	</td>
																</tr>;
															})
														}
													</tbody>
												</table>
											) : (
													<div className="alert alert-info text-left" role="alert">
														<strong>Notice!</strong> There are currently no public holidays defined for {this.state.selectedYear}.
												</div>
												)}
										</div>
									) : (
										<div id="phList" className="mt-3">
											<table className="table table-hover">
												<thead>
													<tr>
														<th className="text-center">Date</th>
														<th className="text-center">Description</th>
														<th className="text-center">Edit</th>
														<th className="text-center">Delete</th>
													</tr>
												</thead>
												<tfoot>
													<tr>
														<td colSpan="4">
															<div id="submitSuccessful" className="generalMsg" />
														</td>
													</tr>
												</tfoot>
												<tbody>
													<tr><td colSpan="4">Loading...</td></tr>
												</tbody>
											</table>
										</div>
									)}

									{/* Public holiday creation modal */}
									<div className="modal fade" id="phCreateModal">
										<div className="modal-dialog modal-lg">
											<div className="modal-content">
												<div className="modal-header">
													<h5 className="modal-title">
														Create new public holiday for { this.state.selectedYear }
													</h5>
													<button className="close" type="button" data-dismiss="modal" aria-label="Close">
														<span aria-hidden="true">×</span>
													</button>
												</div>

												<div className="modal-body">
													<div id="calendar_mobile_phcontainer">
														<div id="calendar_mobile_phmanagement">
															<Calendar
																year={ parseInt(year, 10) }
																selectedDay={ selectedDay }
																showWeekSeparators={ showWeekSeparators }
																customClasses={ customCSSclasses }
																onPickDate={ (date, classes) => this.datePicked(date, classes) }
															/>
														</div>

														<div className="mt-3 text-left">
															<div className="d-inline-block mr-2">
																<strong>Date </strong>
															</div>
															<div className="d-inline-block mr-5">
																{ moment(this.state.curr_publicholiday_date).format('YYYY-MM-DD') }
															</div>
															<div className="d-inline-block mr-2">
																<strong>Description </strong>
															</div>
															<div className="d-inline-block">
																<input
																	type="text"
																	name="publicholidayNewDesc"
																	ref="publicholidayNewDesc"
																	className="form-control"
																	value={ this.state.curr_publicholiday_desc }
																	onChange={ (e) => this.handlePHDescChange(e) }
																	autoFocus
																	required
																 />
															</div>
															<div className="text-center" id="publicholidayNewDescError" />
														</div>
													</div>
												</div>

												<div className="modal-footer mx-auto">
													<button className="btn btn-default btn-primary" onClick={ (e) => this.addPublicHoliday(e) }>Save</button>
													<button className="btn btn-default btn-secondary" data-dismiss="modal">Cancel</button>
												</div>
											</div>
										</div>
									</div>

									{/* Public holiday editing modal */}
									<div className="modal fade" id="phEditModal">
										<div className="modal-dialog modal-lg">
											<div className="modal-content">
												<div className="modal-header">
													<h5 className="modal-title">
														Update public holiday
													</h5>
													<button className="close" type="button" data-dismiss="modal" aria-label="Close">
														<span aria-hidden="true">×</span>
													</button>
												</div>

												<div className="modal-body">
													<div className="text-left">
														<div className="d-inline-block w-25"><strong>Date</strong></div>
														<div className="d-inline-block w-75 pl-2">{ moment(this.state.curr_publicholiday_date).format('YYYY/MM/DD') }</div>
													</div>
													<div className="text-left my-3">
														<div className="d-inline-block w-25"><strong>Original description</strong></div>
														<div className="d-inline-block w-75 pl-2">{ this.state.curr_publicholiday_origdesc }</div>
													</div>
													<div className="text-left my-3">
														<div className="d-inline-block w-25"><strong>New description</strong></div>
														<div className="d-inline-block w-75 pl-2">
															<input
																type="text"
																name="publicholidayChangeDesc"
																ref="publicholidayChangeDesc"
																className="form-control"
																value={ this.state.curr_publicholiday_desc }
																onChange={ (e) => this.handlePHDescChange(e) }
																autoFocus
																onFocus={ this.moveCaretAtEnd }
																required
															 />
														</div>
													</div>
													<div id="publicholidayChangeDescError" />
												</div>

												<div className="modal-footer mx-auto">
													<button className="btn btn-default btn-primary" onClick={ (e) => this.editPublicHoliday(e) }>Update</button>
													<button className="btn btn-default btn-secondary" data-dismiss="modal">Cancel</button>
												</div>
											</div>
										</div>
									</div>

									{/* Public holiday deletion modal */}
									<div className="modal fade" id="phDeleteModal">
										<div className="modal-dialog modal-lg">
											<div className="modal-content">
												<div className="modal-header">
													<h5 className="modal-title">
														Delete public holiday
													</h5>
													<button className="close" type="button" data-dismiss="modal" aria-label="Close">
														<span aria-hidden="true">×</span>
													</button>
												</div>

												<div className="modal-body text-left">
													Are you sure you want to delete the <mark>{ moment(this.state.curr_publicholiday_date).format('YYYY/MM/DD') }: { this.state.curr_publicholiday_desc }</mark> public holiday?
												</div>

												<div className="modal-footer mx-auto">
													<button className="btn btn-default btn-primary" data-dismiss="modal" onClick={ (e) => this.deletePublicHoliday(e) }>Delete</button>
													<button className="btn btn-default btn-secondary" data-dismiss="modal">Cancel</button>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<Footer />
				</div>
			</div >
		);
	}
}

export default HRPublicHolidaysManagement;