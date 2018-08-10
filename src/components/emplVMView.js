import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import $ from 'jquery';
import { api } from '../api';

import moment from 'moment';
import { Calendar, CalendarControls } from 'react-yearly-calendar';
import '../assets/css/calendars/calendar_mobile_emplVMView.css';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

class EmployeeVacationMapView extends Component {
	constructor(props) {
		super(props);

		const today = moment();

		const customCSSclasses = {
			weekend: 'Sat,Sun',
			public_holidays: [],
			vacation_days: [],
			other_days: [],
			conflicting_days: [],
		}

		this.state = {
			publicHolidaysData: undefined,
			logout: false,

			// Used for page operations
			employee_id: localStorage.getItem("emplId"),

			year: today.year(),
			showWeekSeparators: false,
			customCSSclasses,

			remainingVacationDays: 0,
			remainingOtherDays: 0
		};
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

	onPrevYear() {
		// Get public holidays
		api.public_holidays.getPublicHolidaysList(this.state.year - 1)
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

		this.setState({ year: this.state.year - 1 });
		$( "#conflictMessage" ).hide();

		// Get public holidays again. This is necessary to check if there are conflicting days (i.e. public holidays intersecting with vacation days)
		api.public_holidays.getPublicHolidaysList(this.state.year - 1)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			this.setState({ publicHolidaysData: json.holidays });

			var currPublicHolidays = [];
			json.holidays.map(item => {
				return currPublicHolidays.push(moment(item.date).format('YYYY-MM-DD'));
			})

			// Get VM data for current year and user
			api.vacation_maps.getMapHistory(this.state.employee_id, this.state.year)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json) => {
				if (json.vacation_map) {
					$("#calendar_header, #legend, #yearTotal, #calendar_mobile_emplvmview").css({ 'opacity': '1', 'pointer-events': 'auto' });
					$( "#noVMMapMessage" ).hide();

					for (const [index, value] of json.vacation_map.entries()) {
						if (json.vacation_map[index].status < 5) {
							// Calculate remaining vacation_days and other_days
							this.setState({
								remainingVacationDays: (value.allowed_days + value.transitive_days),
								remainingOtherDays: value.other_days
							});
						} else if (json.vacation_map[index].status === 5) {
							let currVacationDays = [];
							let currOtherDays = [];
							value.days.map(item => {
								if (!item.is_other) {
									return currVacationDays.push(moment.parseZone(item.date).format('YYYY-MM-DD'));
								} else {
									return currOtherDays.push(moment.parseZone(item.date).format('YYYY-MM-DD'));
								}
							})

							// Check for vacation_days / public_holidays and other_days / public_holidays intersections
							let testPublicHolidaysDays = new Set(currPublicHolidays);
		
							let vd_ph_intersection = [...currVacationDays].filter(a => testPublicHolidaysDays.has(a));
							let od_ph_intersection = [...currOtherDays].filter(a => testPublicHolidaysDays.has(a));
							let intersectedDays = [...vd_ph_intersection, ...od_ph_intersection];
		
							// If there are date conflicts, display suitable message
							if (intersectedDays.length > 0) {
								$( "#conflictMessage" ).show();
							} else {
								$( "#conflictMessage" ).hide();
							}
		
							// Update CSS classes (vacation days, other days and conflicting days)
							var newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
							newCustomCSSclasses.vacation_days = currVacationDays;
							newCustomCSSclasses.other_days = currOtherDays;
							newCustomCSSclasses.conflicting_days = intersectedDays;
							newCustomCSSclasses.public_holidays = currPublicHolidays;
							this.setState({ customCSSclasses: newCustomCSSclasses });

							// Calculate remaining vacation_days and other_days
							this.setState({
								remainingVacationDays: (value.allowed_days + value.transitive_days) - this.state.customCSSclasses.vacation_days.length,
								remainingOtherDays: value.other_days - this.state.customCSSclasses.other_days.length
							});

							break
						}
					}

					////////////////////////////////////////////
					// Handle totals (month totals + year total)
					////////////////////////////////////////////
					let masterCounter = 0;

					let rows = $('.calendar tbody tr');
					for (let currMonth = 0; currMonth < rows.length; currMonth++) {
						let monthDayCounter = 0;
						for (let item of this.state.customCSSclasses.vacation_days) {
							if (Number(moment(item).format('Y')) === Number(this.state.year) && Number(moment(item).format('M')) === Number(currMonth + 1))
								monthDayCounter++;
						}

						masterCounter = masterCounter + monthDayCounter;

						$(rows[currMonth]).find('td:last').html(monthDayCounter);
					}

					let output = "<div class='float-right yearTotalCell'>" + masterCounter + "</div>";
					$('#emplVMView_container #yearTotalValue').html(output);
				} else {
					this.setState({
						remainingVacationDays: 0,
						remainingOtherDays: 0
					});

					$("#calendar_header, #legend, #yearTotal, #calendar_mobile_emplvmview").css({ 'opacity': '0.5', 'pointer-events': 'none' });
					$( "#noVMMapMessage" ).show();

					////////////////////////////////////////////
					// Handle totals (month totals + year total)
					////////////////////////////////////////////
					let rows = $('.calendar tbody tr');
					for (let currMonth = 0; currMonth < rows.length; currMonth++) {
						$(rows[currMonth]).find('td:last').html(0);
					}

					let output = "<div class='float-right yearTotalCell'>0</div>";
					$('#emplVMView_container #yearTotalValue').html(output);
				}
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})
	}

	onNextYear() {
		// Get public holidays
		api.public_holidays.getPublicHolidaysList(this.state.year + 1)
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

		this.setState({ year: this.state.year + 1 });
		$( "#conflictMessage" ).hide();

		// Get public holidays again. This is necessary to check if there are conflicting days (i.e. public holidays intersecting with vacation days)
		api.public_holidays.getPublicHolidaysList(this.state.year + 1)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			this.setState({ publicHolidaysData: json.holidays });

			var currPublicHolidays = [];
			json.holidays.map(item => {
				return currPublicHolidays.push(moment(item.date).format('YYYY-MM-DD'));
			})

			// Get VM data for current year and user
			api.vacation_maps.getMapHistory(this.state.employee_id, this.state.year)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json) => {
				if (json.vacation_map) {
					$("#calendar_header, #legend, #yearTotal, #calendar_mobile_emplvmview").css({ 'opacity': '1', 'pointer-events': 'auto' });
					$( "#noVMMapMessage" ).hide();

					for (const [index, value] of json.vacation_map.entries()) {
						if (json.vacation_map[index].status < 5) {
							// Calculate remaining vacation_days and other_days
							this.setState({
								remainingVacationDays: (value.allowed_days + value.transitive_days),
								remainingOtherDays: value.other_days
							});
						} else if (json.vacation_map[index].status === 5) {
							let currVacationDays = [];
							let currOtherDays = [];
							value.days.map(item => {
								if (!item.is_other) {
									return currVacationDays.push(moment.parseZone(item.date).format('YYYY-MM-DD'));
								} else {
									return currOtherDays.push(moment.parseZone(item.date).format('YYYY-MM-DD'));
								}
							})

							// Check for vacation_days / public_holidays and other_days / public_holidays intersections
							let testPublicHolidaysDays = new Set(currPublicHolidays);

							let vd_ph_intersection = [...currVacationDays].filter(a => testPublicHolidaysDays.has(a));
							let od_ph_intersection = [...currOtherDays].filter(a => testPublicHolidaysDays.has(a));
							let intersectedDays = [...vd_ph_intersection, ...od_ph_intersection];

							// If there are date conflicts, display suitable message
							if (intersectedDays.length > 0) {
								$( "#conflictMessage" ).show();
							} else {
								$( "#conflictMessage" ).hide();
							}

							// Update CSS classes (vacation days, other days and conflicting days)
							var newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
							newCustomCSSclasses.vacation_days = currVacationDays;
							newCustomCSSclasses.other_days = currOtherDays;
							newCustomCSSclasses.conflicting_days = intersectedDays;
							newCustomCSSclasses.public_holidays = currPublicHolidays;
							this.setState({ customCSSclasses: newCustomCSSclasses });

							// Calculate remaining vacation_days and other_days
							this.setState({
								remainingVacationDays: (value.allowed_days + value.transitive_days) - this.state.customCSSclasses.vacation_days.length,
								remainingOtherDays: value.other_days - this.state.customCSSclasses.other_days.length
							});

							break
						}
					}

					////////////////////////////////////////////
					// Handle totals (month totals + year total)
					////////////////////////////////////////////
					let masterCounter = 0;

					let rows = $('.calendar tbody tr');
					for (let currMonth = 0; currMonth < rows.length; currMonth++) {
						let monthDayCounter = 0;
						for (let item of this.state.customCSSclasses.vacation_days) {
							if (Number(moment(item).format('Y')) === Number(this.state.year) && Number(moment(item).format('M')) === Number(currMonth + 1))
								monthDayCounter++;
						}

						masterCounter = masterCounter + monthDayCounter;

						$(rows[currMonth]).find('td:last').html(monthDayCounter);
					}

					let output = "<div class='float-right yearTotalCell'>" + masterCounter + "</div>";
					$('#emplVMView_container #yearTotalValue').html(output);
				} else {
					this.setState({
						remainingVacationDays: 0,
						remainingOtherDays: 0
					});

					$("#calendar_header, #legend, #yearTotal, #calendar_mobile_emplvmview").css({ 'opacity': '0.5', 'pointer-events': 'none' });
					$( "#noVMMapMessage" ).show();

					////////////////////////////////////////////
					// Handle totals (month totals + year total)
					////////////////////////////////////////////
					let rows = $('.calendar tbody tr');
					for (let currMonth = 0; currMonth < rows.length; currMonth++) {
						$(rows[currMonth]).find('td:last').html(0);
					}

					let output = "<div class='float-right yearTotalCell'>0</div>";
					$('#emplVMView_container #yearTotalValue').html(output);
				}
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})
	}

	toggleShowWeekSeparators() {
		this.setState({ showWeekSeparators: !this.state.showWeekSeparators });
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

			// Update style of calendar's public holiday days + public holiday data
			let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
			newCustomCSSclasses.public_holidays = publicHolidays;
			this.setState({ customCSSclasses: newCustomCSSclasses, publicHolidaysData: json.holidays });
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})

		// Get public holidays again. This is necessary to check if there are conflicting days (i.e. public holidays intersecting with vacation days)
		api.public_holidays.getPublicHolidaysList(this.state.year)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			this.setState({ publicHolidaysData: json.holidays });

			var currPublicHolidays = [];
			json.holidays.map(item => {
				return currPublicHolidays.push(moment(item.date).format('YYYY-MM-DD'));
			})

			// Get VM data for current year and user
			api.vacation_maps.getMapHistory(this.state.employee_id, this.state.year)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json) => {
				if (json.vacation_map) {
					$("#calendar_header, #legend, #yearTotal, #calendar_mobile_emplvmview").css({ 'opacity': '1', 'pointer-events': 'auto' });
					$( "#noVMMapMessage" ).hide();

					for (const [index, value] of json.vacation_map.entries()) {
						if (json.vacation_map[index].status < 5) {
							// Calculate remaining vacation_days and other_days
							this.setState({
								remainingVacationDays: (value.allowed_days + value.transitive_days),
								remainingOtherDays: value.other_days
							});
						} else if (json.vacation_map[index].status === 5) {
							let currVacationDays = [];
							let currOtherDays = [];
							value.days.map(item => {
								if (!item.is_other) {
									return currVacationDays.push(moment.parseZone(item.date).format('YYYY-MM-DD'));
								} else {
									return currOtherDays.push(moment.parseZone(item.date).format('YYYY-MM-DD'));
								}
							})

							// Check for vacation_days / public_holidays and other_days / public_holidays intersections
							let testPublicHolidaysDays = new Set(currPublicHolidays);
		
							let vd_ph_intersection = [...currVacationDays].filter(a => testPublicHolidaysDays.has(a));
							let od_ph_intersection = [...currOtherDays].filter(a => testPublicHolidaysDays.has(a));
							let intersectedDays = [...vd_ph_intersection, ...od_ph_intersection];
		
							// If there are date conflicts, display suitable message
							if (intersectedDays.length > 0) {
								$( "#conflictMessage" ).show();
							} else {
								$( "#conflictMessage" ).hide();
							}
		
							// Update CSS classes (vacation days, other days and conflicting days)
							var newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
							newCustomCSSclasses.vacation_days = currVacationDays;
							newCustomCSSclasses.other_days = currOtherDays;
							newCustomCSSclasses.conflicting_days = intersectedDays;
							newCustomCSSclasses.public_holidays = currPublicHolidays;
							this.setState({ customCSSclasses: newCustomCSSclasses });

							// Calculate remaining vacation_days and other_days
							this.setState({
								remainingVacationDays: (value.allowed_days + value.transitive_days) - this.state.customCSSclasses.vacation_days.length,
								remainingOtherDays: value.other_days - this.state.customCSSclasses.other_days.length
							});

							break
						}
					}

					////////////////////////////////////////////
					// Handle totals (month totals + year total)
					////////////////////////////////////////////
					let masterCounter = 0;

					$(".calendar thead tr").append("<th class='totalHeader' style='padding: 0 10px;font-weight: bold;'>Total</th>");
					let rows = $('.calendar tbody tr');
					for (let currMonth = 0; currMonth < rows.length; currMonth++) {
						let monthDayCounter = 0;
						for (let item of this.state.customCSSclasses.vacation_days) {
							if (Number(moment(item).format('Y')) === Number(this.state.year) && Number(moment(item).format('M')) === Number(currMonth + 1))
								monthDayCounter++;
						}

						masterCounter = masterCounter + monthDayCounter;

						$(rows[currMonth]).find('td:last').after("<td class='totalMonth'><span class='day-number'>" + monthDayCounter + "</span></td>");
					}

					let output = "<div class='float-right yearTotalCell'>" + masterCounter + "</div>";
					$('#emplVMView_container #yearTotalValue').append(output);
				} else {
					$("#calendar_header, #legend, #yearTotal, #calendar_mobile_emplvmview").css({ 'opacity': '0.5', 'pointer-events': 'none' });
					$( "#noVMMapMessage" ).show();

					////////////////////////////////////////////
					// Handle totals (month totals + year total)
					////////////////////////////////////////////
					$(".calendar thead tr").append("<th class='totalHeader' style='padding: 0 10px;font-weight: bold;'>Total</th>");
					let rows = $('.calendar tbody tr');
					for (let currMonth = 0; currMonth < rows.length; currMonth++) {
						$(rows[currMonth]).find('td:last').after("<td class='totalMonth'><span class='day-number'>0</span></td>");
					}

					let output = "<div class='float-right yearTotalCell'>0</div>";
					$('#emplVMView_container #yearTotalValue').append(output);
				}
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})
	}

	render() {
		var { year, showWeekSeparators, customCSSclasses, remainingVacationDays, remainingOtherDays, logout } = this.state;

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
						{/* Calendar */}
						<div className="row">
							<div className="col-12">
								<div id="emplVMView_container">
									<div id="calendar_mobile_calendarcontrols">
										<CalendarControls
											year={ year }
											onPrevYear={ () => this.onPrevYear() }
											onNextYear={ () => this.onNextYear() }
										/>
									</div>

									<div id="calendar_header">
										<label>
											<strong>Vacation days left: </strong>{ remainingVacationDays }
										</label>
										&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
										<label>
											<strong>Bonus days left: </strong> { remainingOtherDays }
										</label>
									</div>

									<div id="calendar_mobile_emplvmview">
										<Calendar
											year={ year }
											showWeekSeparators={ showWeekSeparators }
											onPickDate={ (date, classes) => this.datePicked(date, classes) }
											customClasses={ customCSSclasses }
										/>
									</div>

 									<div id="legendYeartotalWrapper">
										<div id="legend" className="float-left">
											<strong>Legend:</strong>
											<div className="smallLegendSquares" style={{ background: '#FFA07A' }}></div> vacation days
											<div className="smallLegendSquares" style={{ background: '#B84B9E' }}></div> bonus days
											<div className="smallLegendSquares" style={{ background: '#5F9EA0' }}></div> public holidays
											<div className="smallLegendSquares" style={{ background: '#FF0000' }}></div> conflicts
										</div>

										<div id="yearTotal">
											<div id="yearTotalValue" className="float-right">&nbsp;</div>
											<div className="float-right yearTotalHeader">
												<strong>Year total:&nbsp;</strong>
											</div>
										</div>
									</div>

									<div id="noVMMapMessage" className="alert alert-danger" style={{ margin: '50px 0 -10px 0', display: 'none' }}>
										<strong>Attention!</strong> There is not a vacation map defined for {this.state.year}.
									</div>

									<div id="conflictMessage" className="alert alert-danger" style={{ margin: '50px 0 -10px 0', display: 'none' }}>
										<strong>Problem!</strong> There is a conflict between vacation days / other days and public holidays. Please go to "Edit Vacation Map" and rectify the problem.
									</div>
								</div>
							</div>
						</div>

						{/* Public holiday list */}
						{ this.state.publicHolidaysData !== undefined && this.state.publicHolidaysData.length > 0 &&
							<div className="row" id="publicHolidayList">
								<div className="col-12">
									<br />
									<button type="button" className="btn btn-secondary" style={{ margin: '0 0 10px 0' }} data-toggle="collapse" data-target="#phList">Public Holiday List</button>
									<div id="phList" className="collapse">
										<div>
											<div className="card">
												{ this.state.publicHolidaysData !== undefined ? (
													<table className="table table-condensed table-striped">
													<thead>
														<tr>
															<th className="text-center">Date</th>
															<th className="text-center">Description</th>
														</tr>
													</thead>
													<tbody>
													{
														this.state.publicHolidaysData.map(item => {
															return <tr key={ item.date }>
																<td className="text-center">
																	{ moment(item.date).format('YYYY/MM/DD') }
																</td>
																<td className="text-center">
																	{ item.description }
																</td>
															</tr>;
														})
													}
													</tbody>
													</table>
												) : (
													<table className="table table-condensed table-striped">
													<thead>
														<tr>
															<th className="text-center col-md-6">Date</th>
															<th className="text-center col-md-6">Description</th>
														</tr>
													</thead>
													<tbody>
														<tr><td colSpan="4">Loading...</td></tr>
													</tbody>
													</table>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						}
					</div>

					<Footer />
				</div>
			</div>
		);
	}
}

export default EmployeeVacationMapView;