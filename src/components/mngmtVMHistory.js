import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import $ from 'jquery';
import { api } from '../api';

import moment from 'moment';
import {Calendar, CalendarControls} from 'react-yearly-calendar';
import '../assets/css/calendars/calendar_mobile_mngmtVMHistory.css';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import MyAutosuggest from '../components/MyAutosuggest';

class ManagementVacationMapHistory extends Component {
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
			employeeListData: undefined,
			vmVersionHistoryData: undefined,
			logout: false,


			// Used in page operations
			selectedEmployeeId: '',
			selectedEmployeeName: '',

			yearList: [{ Name: today.year() + 1 }, { Name: today.year() }, { Name: today.year() - 1 }, { Name: today.year() - 2 }, { Name: today.year() - 3 }],
			selectedYear: '',			// For testing purposes, id=1 - 'testuser' (John Doe)

			// Used by react-yearly-calendar
			year: today.year(),
			showWeekSeparators: false,
			customCSSclasses,

			// Related with react-autosuggest
			employeeNameList: ''
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

	// Related with react-autosuggest
	processAutosuggest(newValue) {
		// Update employee Id and employee name based on selected suggestion
		this.state.employeeListData.map(item => {
			if (item.name === newValue) {
				this.clearCalendar();

				this.setState({
					selectedEmployeeId: item.id, 
					selectedEmployeeName: item.name,
				});

				// Get VM version history data for current year and user
				this.getVMHistory(item.id, this.state.year);

				return true;
			} else {
				return false;
			}
		})
	};

	// Used by employee list (not auto-suggest)
	handleSelectedEmployee(e, selectedEmployeeId, selectedEmployeeName) {
		this.clearCalendar();

		this.setState({
			selectedEmployeeId: selectedEmployeeId,
			selectedEmployeeName: selectedEmployeeName,
		})

		// Get VM version history data for current year and user
		this.getVMHistory(selectedEmployeeId, this.state.year);
	}

	populateCalendar(e, days) {
		// Get public holidays
		api.public_holidays.getPublicHolidaysList(this.state.year)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			let publicHolidays = [];
			json.holidays.map(item => {
				return publicHolidays.push(moment(item.date).format('YYYY-MM-DD'));
			})

			let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
			newCustomCSSclasses.public_holidays = publicHolidays;
			this.setState({ customCSSclasses: newCustomCSSclasses });
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})

		// Get list of vacation_days and other_days
		let currDays = [];
		let currOtherDays = [];
		days.map(item => {
			if (!item.is_other) {
				return currDays.push(moment.parseZone(item.date).format('YYYY-MM-DD'));
			} else {
				return currOtherDays.push(moment.parseZone(item.date).format('YYYY-MM-DD'));
			}
		})

		let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
		newCustomCSSclasses.vacation_days = currDays;
		newCustomCSSclasses.other_days = currOtherDays;
		this.setState({ customCSSclasses: newCustomCSSclasses });

		////////////////////////////////////////////
		// Handle totals (month totals + year total)
		////////////////////////////////////////////
		let masterCounter = 0;

		let rows = $('.calendar tbody tr');
		for (let currMonth = 0; currMonth < rows.length; currMonth++) {
			let monthDayCounter = 0;
			for (let item of currDays) {
				if (Number(moment(item).format('Y')) === Number(this.state.year) && Number(moment(item).format('M')) === Number(currMonth + 1))
					monthDayCounter++;
			}

			masterCounter = masterCounter + monthDayCounter;

			$(rows[currMonth]).find('td:last').html(monthDayCounter);
		}

		let output = "<div class='float-right yearTotalCell'>" + masterCounter + "</div>";
		$('#mngmtvmhistory_row1_right #yearTotalValue').html(output);
	}

	clearCalendar() {
		let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
		newCustomCSSclasses.vacation_days = [];
		newCustomCSSclasses.other_days = [];
		newCustomCSSclasses.public_holidays = [];
		this.setState({ customCSSclasses: newCustomCSSclasses });

		////////////////////////////////////////////
		// Handle totals (month totals + year total)
		////////////////////////////////////////////
		let rows = $('.calendar tbody tr');
		for (let currMonth = 0; currMonth < rows.length; currMonth++) {
			$(rows[currMonth]).find('td:last').html(0);
		}

		let output = "<div class='float-right yearTotalCell'>0</div>";
		$('#mngmtvmhistory_row1_right #yearTotalValue').html(output);
	}

	// Used by react-yearly-calendar
	onPrevYear() {
		this.setState({ year: this.state.year - 1 });

		this.getVMHistory(this.state.selectedEmployeeId, (this.state.year - 1));
		this.clearCalendar();
	}

	// Used by react-yearly-calendar
	onNextYear() {
		this.setState({ year: this.state.year + 1 });

		this.getVMHistory(this.state.selectedEmployeeId, (this.state.year + 1));
		this.clearCalendar();
	}

	// Get VM version history data for current year and user
	getVMHistory(selectedEmployeeId, selectedYear) {
		api.vacation_maps.getMapHistory(selectedEmployeeId, selectedYear)
		.then((response) => {
			// return response.json()
			if (response.ok) {
				$( "#showResults" ).show();
				$( "#hideResults" ).hide();

				return response.json()
			} else {
				$( "#showResults" ).hide();
				$( "#hideResults" ).show();

				this.handleHTTPErrors(response);
			}
		}).then((json) => {
			this.setState({ vmVersionHistoryData: json.vacation_map });
		}).catch((ex) => {
			this.setState({ remainingVacationDays: 0, remainingOtherDays: 0 });
			console.log('Parsing failed', ex);
		})
	}

	componentDidMount() {
		// Get public holidays
		api.public_holidays.getPublicHolidaysList(this.state.year)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			let publicHolidays = [];
			json.holidays.map(item => {
				return publicHolidays.push(moment(item.date).format('YYYY-MM-DD'));
			})

			let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
			newCustomCSSclasses.public_holidays = publicHolidays;
			this.setState({ customCSSclasses: newCustomCSSclasses });
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})

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

		////////////////////////////////////////////
		// Handle totals (month totals + year total)
		////////////////////////////////////////////
		$(".calendar thead tr").append("<th class='totalHeader' style='padding: 0 10px;font-weight: bold;'>Total</th>");
		let rows = $('.calendar tbody tr');
		for (let currMonth = 0; currMonth < rows.length; currMonth++) {
			$(rows[currMonth]).find('td:last').after("<td class='totalMonth'><span class='day-number'>0</span></td>");
		}

		let output = "<div class='float-right yearTotalCell'>0</div>";
		$('#mngmtvmhistory_row1_right #yearTotalValue').append(output);
	}

	render() {
		let { year, selectedDay, showWeekSeparators, customCSSclasses, logout } = this.state;

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

			// Highlight selected history version
			const $listGroup2 = $('.clickable-row');
			$listGroup2.on('click', (e) => {
				$listGroup2.removeClass('clickable-row-active')
				$(e.currentTarget).addClass('clickable-row-active')
			});
		});

		return (
			<div>
				<Navigation />

				<div className="content-wrapper">
					{/* Content */}
					<div className="container-fluid">
						{/* User selection and calendar */}
						<div className="row">
							<div className="col-12">
								<div id="mngmtvmhistory_content">
									{/* User selection */}
									<div id="mngmtvmhistory_row1_left">
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
														<ul className="list-group solo">
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

									{/* Calendar */}
									<div id="mngmtvmhistory_row1_right">
										<div id="calendar_mobile_calendarcontrols">
											<CalendarControls
												year={ year }
												onPrevYear={ () => this.onPrevYear() }
												onNextYear={ () => this.onNextYear() }
											/>
										</div>

										<div id="calendar_mobile_mngmtvmhistory">
											<Calendar
												year={ year }
												selectedDay={ selectedDay }
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

											<div id="yearTotal">
												<div id="yearTotalValue" className="float-right">&nbsp;</div>
												<div className="float-right yearTotalHeader">
													<strong>Year total:&nbsp;</strong>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Selected employee history */}
						<div className="row mt-2">
							<div className="col-12">
								<div id="mngmtVMHistoryList">
									{ this.state.selectedEmployeeId === '' ? (
										<div>
											<div className="alert alert-warning">
												<strong>Warning!</strong> Please select a user from the list.
											</div>
										</div>
									) : (
										<div>
											<div id="showResults" style={{ display: 'none' }}>
												<div>
													{ this.state.vmVersionHistoryData !== undefined && this.state.vmVersionHistoryData !== null ? (
														<table className="table table-hover">
														<thead className="thead-dark">
															<tr>
																<th className="text-center">Version #</th>
																<th className="text-center">Creation Date</th>
																<th className="text-center">Allowed Days (total / left)</th>
																<th className="text-center">Other Days (total / left)</th>
																<th className="text-center">Status</th>
															</tr>
														</thead>
														<tbody>
														{
															this.state.vmVersionHistoryData.map(currVersion => {
																let totalDays = 0;
																let totalOtherDays = 0;

																currVersion.days.map(item => {
																	if (!item.is_other) {
																		return totalDays++;
																	} else {
																		return totalOtherDays++;
																	}
																})

																let currStatus = '';
																switch (currVersion.status) {
																	case 1:
																		currStatus = "New";
																		break;
																	case 3:
																		currStatus = "Pending";
																		break;
																	case 4:
																		currStatus = "Rejected";
																		break;
																	case 5:
																		currStatus = "Approved";
																		break;
																	default:
																		break;
																}

																return <tr key={ currVersion.version } className="clickable-row">
																	<td className="text-center" style={{ cursor: 'pointer', padding: '17px 0 15px 0' }} onClick={ (e) => this.populateCalendar(e, currVersion.days) }>
																		{ (currVersion.version + 1) }
																	</td>
																	<td className="text-center" style={{ cursor: 'pointer', padding: '17px 0 15px 0' }} onClick={ (e) => this.populateCalendar(e, currVersion.days) }>
																		{ moment(currVersion.created_at).format('YYYY/MM/DD HH:mm:ss') }
																	</td>
																	<td className="text-center" style={{ cursor: 'pointer', padding: '17px 0 15px 0' }} onClick={ (e) => this.populateCalendar(e, currVersion.days) }>
																		{ (currVersion.allowed_days + currVersion.transitive_days) } / { ((currVersion.allowed_days + currVersion.transitive_days) - totalDays) }
																	</td>
																	<td className="text-center" style={{ cursor: 'pointer', padding: '17px 0 15px 0' }} onClick={ (e) => this.populateCalendar(e, currVersion.days) }>
																		{ currVersion.other_days } / { currVersion.other_days - totalOtherDays }
																	</td>
																	<td className="text-center" style={{ cursor: 'pointer', padding: '15px 0 15px 0' }} onClick={ (e) => this.populateCalendar(e, currVersion.days) }>
																		{ currStatus }
																	</td>
																</tr>;
															})
														}
														</tbody>
														</table>
													) : (
														<div className="alert alert-warning">
															<strong>Warning!</strong> There is currently no vacation map history for { this.state.selectedEmployeeName } for { this.state.year }.
														</div>
													)}
												</div>
											</div>

											<div id="hideResults" style={{ display: 'none' }}>
												<div className="alert alert-warning">
													<strong>Warning!</strong> There are not results for the selected employee / year ({ this.state.selectedEmployeeName } / { this.state.year }).
												</div>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* DEBUG
						<br />
						<strong>Selected year:</strong> { this.state.year }<br />
						<strong>Selected employee id:</strong> { this.state.selectedEmployeeId }<br />
						<strong>Selected employee name:</strong> { this.state.selectedEmployeeName }<br />
						 */}
					</div>

					<Footer />
				</div>
			</div>
		);
	}
}

export default ManagementVacationMapHistory;