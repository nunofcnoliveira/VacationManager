import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import $ from 'jquery';
import { api } from '../api';

import moment from 'moment';
import { Calendar, CalendarControls } from 'react-yearly-calendar';
import '../assets/css/calendars/calendar_mobile_emplVMHistory.css';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

class EmployeeVacationMapHistory extends Component {
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
			vmVersionHistoryData: undefined,
			logout: false,

			yearList: [{ Name: today.year() + 1 }, { Name: today.year() }, { Name: today.year() - 1 }, { Name: today.year() - 2 }, { Name: today.year() - 3 }],

			// Used for page operations
			employee_id: localStorage.getItem("emplId"),

			// Used by react-yearly-calendar
			year: today.year(),
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
		$('#emplVMHistory_container #yearTotalValue').html(output);
	}

	// Used by react-yearly-calendar
	onPrevYear() {
		this.setState({ year: this.state.year - 1 });

		// Get VM data for previous year and user
		api.vacation_maps.getMapHistory(this.state.employee_id, this.state.year - 1)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			this.setState({ vmVersionHistoryData: json.vacation_map });
		}).catch((ex) => {
			this.setState({ remainingVacationDays: 0, remainingOtherDays: 0 });
			console.log('Parsing failed', ex);
		})

		////////////////////////////////////////////
		// Handle totals (month totals + year total)
		////////////////////////////////////////////
		let rows = $('.calendar tbody tr');
		for (let currMonth = 0; currMonth < rows.length; currMonth++) {
			$(rows[currMonth]).find('td:last').html(0);
		}

		let output = "<div class='float-right yearTotalCell'>0</div>";
		$('#emplVMHistory_container #yearTotalValue').html(output);
	}

	// Used by react-yearly-calendar
	onNextYear() {
		this.setState({ year: this.state.year + 1 });

		// Get VM data for next year and user
		api.vacation_maps.getMapHistory(this.state.employee_id, this.state.year + 1)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			this.setState({ vmVersionHistoryData: json.vacation_map });
		}).catch((ex) => {
			this.setState({ remainingVacationDays: 0, remainingOtherDays: 0 });
			console.log('Parsing failed', ex);
		})

		////////////////////////////////////////////
		// Handle totals (month totals + year total)
		////////////////////////////////////////////
		let rows = $('.calendar tbody tr');
		for (let currMonth = 0; currMonth < rows.length; currMonth++) {
			$(rows[currMonth]).find('td:last').html(0);
		}

		let output = "<div class='float-right yearTotalCell'>0</div>";
		$('#emplVMHistory_container #yearTotalValue').html(output);
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
			// Get list of public holiday days
			let publicHolidays = [];
			json.holidays.map(item => {
				return publicHolidays.push(item.date);
			})

			// Update style of calendar's public holiday days + public holiday data + public holiday data
			let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
			newCustomCSSclasses.public_holidays = publicHolidays;
			this.setState({ customCSSclasses: newCustomCSSclasses });
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})

		// Get VM data for current year and user
		api.vacation_maps.getMapHistory(this.state.employee_id, this.state.year)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			this.setState({ vmVersionHistoryData: json.vacation_map });
		}).catch((ex) => {
			this.setState({ remainingVacationDays: 0, remainingOtherDays: 0 });
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
		$('#emplVMHistory_container #yearTotalValue').append(output);
	}

	render() {
		let { year, selectedDay, showWeekSeparators, customCSSclasses, logout } = this.state;

		if (logout) {
			return (
				<Redirect to="/login"/>
			)
		}

		$(document).ready(function() {
			const $listGroup = $('.clickable-row');
			$listGroup.on('click', (e) => {
				$listGroup.removeClass('clickable-row-active')
				$(e.currentTarget).addClass('clickable-row-active')
			})
		});

		return (
			<div>
				<Navigation />

				<div className="content-wrapper">
					{/* Content */}
					<div className="container-fluid">
						{/* Calendar */}
						<div className="row">
							<div className="col-12">
								<div id="emplVMHistory_container">
									<div id="calendar_mobile_calendarcontrols">
										<CalendarControls
											year={ year }
											onPrevYear={ () => this.onPrevYear() }
											onNextYear={ () => this.onNextYear() }
										/>
									</div>

									<div id="calendar_mobile_emplvmhistory">
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

						{/* Employee history */}
						<div className="row mt-2">
							<div className="col-12">
								<div id="emplVMHistoryList">
									{ this.state.vmVersionHistoryData !== undefined ? (
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
													<td className="text-center" style={{ cursor: 'pointer', padding: '15px 0 15px 0' }} onClick={ (e) => this.populateCalendar(e, currVersion.days) }>
														{ (currVersion.version + 1) }
													</td>
													<td className="text-center" style={{ cursor: 'pointer', padding: '15px 0 15px 0' }} onClick={ (e) => this.populateCalendar(e, currVersion.days) }>
														{ moment(currVersion.created_at).format('YYYY/MM/DD HH:mm:ss') }
													</td>
													<td className="text-center" style={{ cursor: 'pointer', padding: '15px 0 15px 0' }} onClick={ (e) => this.populateCalendar(e, currVersion.days) }>
														{ (currVersion.allowed_days + currVersion.transitive_days) } / { ((currVersion.allowed_days + currVersion.transitive_days) - totalDays) }
													</td>
													<td className="text-center" style={{ cursor: 'pointer', padding: '15px 0 15px 0' }} onClick={ (e) => this.populateCalendar(e, currVersion.days) }>
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
										<div className="alert alert-danger">
											<strong>Attention!</strong> There is no vacation map version history defined for { this.state.year }.
										</div>
									)}
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

export default EmployeeVacationMapHistory;