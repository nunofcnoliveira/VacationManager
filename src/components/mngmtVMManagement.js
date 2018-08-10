import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import $ from 'jquery';
import { api } from '../api';

import moment from 'moment';
import { Calendar } from 'react-yearly-calendar';
import '../assets/css/calendars/calendar_mobile_mngmtVMManagement.css';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

class ManagementVacationMapManagement extends Component {
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
			pendingVMsData: undefined,
			logout: false,

			yearList: [{ Name: today.year() + 1 }, { Name: today.year() }, { Name: today.year() - 1 }, { Name: today.year() - 2 }, { Name: today.year() - 3 }],

			// Used for approve / reject
			selectedYear: today.year(),
			selectedEmployeeId: '',
			selectedEmployeeName: '',
			rejectReasons: '',

			// Used by react-yearly-calendar
			year: today.year(),
			showWeekSeparators: false,
			customCSSclasses,
			remainingVacationDays: 10,
			remainingOtherDays: 20,
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
		// Get pending vacation maps for selected year
		api.vacation_maps_management.pending(e.target.value)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			this.setState({ pendingVMsData: json });
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})

		this.setState({
			year: e.target.value,
			selectedYear: e.target.value
		});
	}

	showApproveRejectModal(e, employee_id, employee_name, curr_days, curr_other_days, curr_remaining_days, curr_remaining_other_days) {
		// Get public holidays
		api.public_holidays.getPublicHolidaysList(this.state.year)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			var publicHolidays = [];
			json.holidays.map(item => {
				return publicHolidays.push(moment(item.date).format('YYYY-MM-DD'));
			})

			var newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
			newCustomCSSclasses.public_holidays = publicHolidays;
			this.setState({ customCSSclasses: newCustomCSSclasses });
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})

		var newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
		newCustomCSSclasses.vacation_days = curr_days;
		newCustomCSSclasses.other_days = curr_other_days;
		this.setState({ customCSSclasses: newCustomCSSclasses });

		this.setState({
			selectedEmployeeId: employee_id, 
			selectedEmployeeName: employee_name,
			remainingVacationDays: curr_remaining_days, 
			remainingOtherDays: curr_remaining_other_days
		})

		////////////////////////////////////////////
		// Handle totals (month totals + year total)
		////////////////////////////////////////////
		let masterCounter = 0;

		let rows = $('.calendar tbody tr');
		for (let currMonth = 0; currMonth < rows.length; currMonth++) {
			let monthDayCounter = 0;
			for (let item of curr_days) {
				if (Number(moment(item).format('Y')) === Number(this.state.year) && Number(moment(item).format('M')) === Number(currMonth + 1))
					monthDayCounter++;
			}

			masterCounter = masterCounter + monthDayCounter;

			$(rows[currMonth]).find('td:last').html(monthDayCounter);
		}

		let output = "<div class='float-right yearTotalCell'>" + masterCounter + "</div>";
		$('#myApproveRejectVMModal #yearTotalValue').html(output);
	}

	approvePendingVM(e, employee_id) {
		e.preventDefault();

		// Approve pending VM
		api.vacation_maps_management.approve(this.state.selectedYear, employee_id)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			
		}).then(() => {
			// Get pending vacation maps for current year
			api.vacation_maps_management.pending(this.state.selectedYear)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json) => {
				this.setState({ pendingVMsData: json });
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}).catch(function(ex) {
			console.log('Parsing failed', ex);
		})

		$("#submitSuccessful").show().text('Vacation Map approved successfully.').delay(3000).fadeOut();
	}

	rejectPendingVM(e) {
		e.preventDefault();

		// Reject pending VM
		api.vacation_maps_management.reject(this.state.selectedYear, this.state.selectedEmployeeId, this.state.rejectReasons)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			
		}).then(() => {
			// Get pending vacation maps for current year
			api.vacation_maps_management.pending(this.state.selectedYear)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json) => {
				this.setState({ pendingVMsData: json });
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}).catch(function(ex) {
			console.log('Parsing failed', ex);
		})

		this.setState({ rejectReasons: '' })

		$("#submitSuccessful").show().text('Vacation Map rejected successfully.').delay(3000).fadeOut();
	}

	componentDidMount() {
		// Get pending vacation maps for current year
		api.vacation_maps_management.pending(this.state.selectedYear)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			this.setState({ pendingVMsData: json });
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})

		////////////////////////////////////////////
		// Handle totals (month totals + year total)
		////////////////////////////////////////////
		$(".calendar thead tr").append("<th class='totalHeader' style='padding: 0 10px;font-weight: bold;'>Total</th>");
		let rows = $('.calendar tbody tr');
		for (let currMonth = 0; currMonth < rows.length; currMonth++) {
			$(rows[currMonth]).find('td:last').after("<td class='totalMonth'><span class='day-number'>0</span></td>");
		}

		let output = "<div class='float-right yearTotalCell'>0</div>";
		$('#myApproveRejectVMModal #yearTotalValue').append(output);
	}

	render() {
		let { year, showWeekSeparators, customCSSclasses, remainingVacationDays, remainingOtherDays, logout } = this.state;

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
								<div className="mngmtvmmanagement_content">
									<div className="form-group">
										<strong>Get pending vacation maps for: </strong>
										<select ref="selectedYear" className="form-control" onChange={ (e) => this.handleSelectedYear(e) } defaultValue={ this.state.selectedYear }>
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
								<div className="mngmtvmmanagement_content">
									{ this.state.pendingVMsData !== undefined ? (
										<div id="pendingVMList">
											{ this.state.pendingVMsData.vacation_maps.length > 0 ? (
												<table className="table table-hover">
												<thead className="thead-dark">
													<tr>
														<th className="text-center">Employee Name</th>
														<th className="text-center">Map Version</th>
														<th className="text-center">Approve</th>
														<th className="text-center">Reject</th>
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
													this.state.pendingVMsData.vacation_maps.map(currPendingVM => {
														let currAllowedDaysTotal = currPendingVM.allowed_days;
														let currTransitiveDaysTotal = currPendingVM.transitive_days;
														let currOtherDaysTotal = currPendingVM.other_days;

														// Get list of vacation_days and other_days
														let currDays = [];
														let currOtherDays = [];

														currPendingVM.days.map(currDay => {
															if (!currDay.is_other) {
																return currDays.push(moment.parseZone(currDay.date).format('YYYY-MM-DD'));
															} else {
																return currOtherDays.push(moment.parseZone(currDay.date).format('YYYY-MM-DD'));
															}
														})

														let currRemainingVacationDays = ((currAllowedDaysTotal + currTransitiveDaysTotal) - currDays.length);
														let currRemainingOtherDays = (currOtherDaysTotal - currOtherDays.length);

														return <tr key={ currPendingVM.id }>
															<td className="text-center vmEmployeeName" data-toggle="modal" data-target="#myApproveRejectVMModal" onClick={ (e) => this.showApproveRejectModal(e, currPendingVM.employee.id, currPendingVM.employee.name, currDays, currOtherDays, currRemainingVacationDays, currRemainingOtherDays) }>
																{ currPendingVM.employee.name }
															</td>
															<td className="text-center vmMapVersion" data-toggle="modal" data-target="#myApproveRejectVMModal" onClick={ (e) => this.showApproveRejectModal(e, currPendingVM.employee.id, currPendingVM.employee.name, currDays, currOtherDays, currRemainingVacationDays, currRemainingOtherDays) }>
																{ currPendingVM.version + 1 }
															</td>
															<td className="text-center vmApprove">
																<button className="btn btn-success btn-sm" onClick={ (e) => this.approvePendingVM(e, currPendingVM.employee.id) }>
																	<i className="fa fa-fw fa-check"></i>
																</button>
															</td>
															<td className="text-center vmReject">
																<button className="btn btn-danger btn-sm" data-toggle="modal" data-target="#myRejectConfirmVMModal" onClick={ (e) => this.setState({ selectedEmployeeId: currPendingVM.employee.id }) }>
																	<i className="fa fa-fw fa-times"></i>
																</button>
															</td>
														</tr>;
													})
												}
												</tbody>
												</table>
											) : (
												<div className="generalErrMsg">Sorry, there are no pending vacation maps for { this.state.selectedYear }</div>
											)}
										</div>
									) : (
										<table className="table">
										<thead>
											<tr>
												<th className="text-center">Employee Name</th>
												<th className="text-center">Map Version</th>
												<th className="text-center">Approve</th>
												<th className="text-center">Reject</th>
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
											<tr><td colSpan="4" className="text-center">Loading...</td></tr>
										</tbody>
										</table>
									)}
								</div>
							</div>
						</div>

						{/* Approve / reject with calendar modal */}
						<div className="modal fade" id="myApproveRejectVMModal">
							<div className="modal-dialog modal-lg">
								<div className="modal-content">
									<div className="modal-header">
										<h5 className="modal-title">
											Employee: { this.state.selectedEmployeeName }
											&nbsp;
											Year: { this.state.year }
										</h5>
										<button className="close" type="button" data-dismiss="modal" aria-label="Close">
										<span aria-hidden="true">×</span>
										</button>
									</div>

									<div id="calendar_header">
										<label>
											<strong>Vacation days left: { remainingVacationDays }</strong>{  }
										</label>
										&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
										<label>
											<strong>Bonus days left: { remainingOtherDays }</strong> {  }
										</label>
									</div>

									<div className="modal-body">
										<div id="calendar_mobile_mngmtvmmanagement">
											<Calendar
												year={ year }
												showWeekSeparators={ showWeekSeparators }
												customClasses={ customCSSclasses }
											/>
										</div>

										<div id="legendYeartotalWrapper">
											<div id="legend" className="float-left">
												<strong>Legend:</strong>
												<div className="smallLegendSquares" style={{ background: '#FFA07A' }}></div> vacation days
												<div className="smallLegendSquares" style={{ background: '#B84B9E' }}></div> bonus days
												<div className="smallLegendSquares" style={{ background: '#5F9EA0' }}></div> public holidays
											</div>
										</div>

										<div id="yearTotal">
											<div id="yearTotalValue" className="float-right">&nbsp;</div>
											<div className="float-right yearTotalHeader">
												<strong>Year total:&nbsp;</strong>
											</div>
										</div>
									</div>

									<div className="modal-footer mx-auto">
										<button className="btn btn-default btn-success" data-dismiss="modal" onClick={ (e) => this.approvePendingVM(e, this.state.selectedEmployeeId) }>Approve</button>
										<button className="btn btn-default btn-danger" data-dismiss="modal" data-toggle="modal" data-target="#myRejectConfirmVMModal">Reject</button>
									</div>
								</div>
							</div>
						</div>

						{/* Reject modal */}
						<div className="modal fade" id="myRejectConfirmVMModal">
							<div className="modal-dialog modal-lg">
								<div className="modal-content">
									<div className="modal-body">
											<div className="form-group">
												<label htmlFor="rejectReasons"><strong>Please enter the reason(s) for rejecting the pending vacation map:</strong></label>
												<textarea 
													ref={ textarea => textarea && textarea.focus() } 
													className="form-control" 
													rows="4" 
													id="rejectReasons" 
													value={ this.state.rejectReasons } 
													onChange={ (e) => this.setState({ rejectReasons: e.target.value }) }
												/>
											</div>
										
									</div>

									<div className="modal-footer">
										<button className="btn btn-default btn-primary" data-dismiss="modal" onClick={ (e) => this.rejectPendingVM(e) }>Submit</button>
										<button className="btn btn-default btn-secondary" data-dismiss="modal" onClick={ (e) => this.setState({ showRejectModal: false, rejectReasons: '' }) }>Cancel</button>
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

export default ManagementVacationMapManagement;