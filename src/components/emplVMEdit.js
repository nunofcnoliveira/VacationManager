import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import $ from 'jquery';
import { api } from '../api';

import moment from 'moment';
import { Calendar, CalendarControls } from 'react-yearly-calendar';
import '../assets/css/calendars/calendar_mobile_emplVMEdit.css';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

class EmployeeVacationMapEdit extends Component {
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
			selectedDay: today,
			showWeekSeparators: false,
			customCSSclasses,

			radio_daysleft_otherdaysleft: 'yes',
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

	handleChange(e) {
		this.setState({
			[e.target.name]: e.target.value
		});
	}

	onRadioChange(value) {
		this.setState({ radio_daysleft_otherdaysleft: value })

		if (value === 'yes') {
			$('#calendar_mobile_emplvmedit table.calendar td.vacation_days').css('pointer-events', 'auto');
			$('#calendar_mobile_emplvmedit table.calendar td.other_days').css('pointer-events', 'none');
		} else {
			$('#calendar_mobile_emplvmedit table.calendar td.vacation_days').css('pointer-events', 'none');
			$('#calendar_mobile_emplvmedit table.calendar td.other_days').css('pointer-events', 'auto');
		}
	}

	handleSave(e) {
		e.preventDefault();

		api.vacation_maps.saveMap(this.state.map_id, this.state.customCSSclasses.vacation_days, this.state.customCSSclasses.other_days)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {

		}).catch(function (ex) {
			console.log('Parsing failed', ex);
		})

		$("#saveSuccessful").show().text('Vacation Map saved successfully.').delay(3000).fadeOut();
	}

	handleSubmit(e) {
		e.preventDefault();

		api.vacation_maps.saveMap(this.state.map_id, this.state.customCSSclasses.vacation_days, this.state.customCSSclasses.other_days)
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {

		}).then(() => {
			api.vacation_maps.submitMap(this.state.map_id)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json) => {

			}).catch(function (ex) {
				console.log('Parsing failed', ex);
			})
		}).catch(function (ex) {
			console.log('Parsing failed', ex);
		})

		$("#submitSuccessful").show().text('Vacation Map submitted successfully.').delay(3000).fadeOut();
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

		this.setState({
			year: this.state.year - 1,
			radio_daysleft_otherdaysleft: 'yes'
		});

		$("#conflictMessage").hide();
		$(".btn-default").addClass('active').css({ 'opacity': '1', 'pointer-events': 'auto' });

		// Get public holidays
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
				return currPublicHolidays.push(item.date);
			})

			// Get VM data for the provided year and user
			api.vacation_maps.showMap(this.state.year, this.state.employee_id)
			.then((response) => {
				if (response.ok) {
					$("#calendar_mobile_emplvmedit, #calendar_header, #legend, #yearTotal").css({ 'opacity': '1', 'pointer-events': 'auto' });
					$("#calendar_buttons").show();
					$("#noVMMapMessage").hide();

					return response.json()
				} else {
					this.setState({
						remainingVacationDays: 0,
						remainingOtherDays: 0
					});

					$("#calendar_mobile_emplvmedit, #calendar_header, #legend, #yearTotal").css({ 'opacity': '0.5', 'pointer-events': 'none' });
					$("#noVMMapMessage").show();
					$("#calendar_buttons").hide();

					var error = new Error(response.status + ": " + response.statusText)
					error.response = response
					throw error
				}
			}).then((json) => {
				// Get list of vacation_days and other_days
				let currVacationDays = [];
				let currOtherDays = [];
				json.vacation_map.days.map(item => {
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
					$("#conflictMessage").show();
					$(".btn-default").addClass('disabled').css({ 'opacity': '0.5', 'pointer-events': 'none' });
				} else {
					$("#conflictMessage").hide();
					$(".btn-default").addClass('active').css({ 'opacity': '1', 'pointer-events': 'auto' });
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
					remainingVacationDays: (json.vacation_map.allowed_days + json.vacation_map.transitive_days) - this.state.customCSSclasses.vacation_days.length,
					remainingOtherDays: json.vacation_map.other_days - this.state.customCSSclasses.other_days.length
				});

				////////////////////////////////////////////
				// Handle totals (month totals + year total)
				////////////////////////////////////////////
				let masterCounter = 0;

				let rows = $('.calendar tbody tr');
				for (let currMonth = 0; currMonth < rows.length; currMonth++) {
					let monthDayCounter = 0;
					for (let item of currVacationDays) {
						if (Number(moment(item).format('Y')) === Number(this.state.year) && Number(moment(item).format('M')) === Number(currMonth + 1))
							monthDayCounter++;
					}

					masterCounter = masterCounter + monthDayCounter;

					$(rows[currMonth]).find('td:last').html(monthDayCounter);
				}

				let output = "<div class='float-right yearTotalCell'>" + masterCounter + "</div>";
				$('#emplVMEdit_container #yearTotalValue').html(output);

				// Ensure draft
				api.vacation_maps.ensuredraft(this.state.year)
				.then((response) => {
					if (response.ok)
						return response.json()
					else
						this.handleHTTPErrors(response);
				}).then((json) => {
					this.setState({ map_id: json.vacation_map.id });
				}).catch((ex) => {
					console.log('Parsing failed', ex);
				})
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

		this.setState({
			year: this.state.year + 1,
			radio_daysleft_otherdaysleft: 'yes'
		});

		$("#conflictMessage").hide();
		$(".btn-default").addClass('active').css({ 'opacity': '1', 'pointer-events': 'auto' });

		// Get public holidays
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
				return currPublicHolidays.push(item.date);
			})

			// Get VM data for the provided year and user
			api.vacation_maps.showMap(this.state.year, this.state.employee_id)
			.then((response) => {
				if (response.ok) {
					$("#calendar_mobile_emplvmedit, #calendar_header, #legend, #yearTotal").css({ 'opacity': '1', 'pointer-events': 'auto' });
					$("#calendar_buttons").show();
					$("#noVMMapMessage").hide();

					return response.json()
				} else {
					this.setState({
						remainingVacationDays: 0,
						remainingOtherDays: 0
					});

					$("#calendar_mobile_emplvmedit, #calendar_header, #legend, #yearTotal").css({ 'opacity': '0.5', 'pointer-events': 'none' });
					$("#noVMMapMessage").show();
					$("#calendar_buttons").hide();

					var error = new Error(response.status + ": " + response.statusText)
					error.response = response
					throw error
				}
			}).then((json) => {
				// Get list of vacation_days and other_days
				let currVacationDays = [];
				let currOtherDays = [];
				json.vacation_map.days.map(item => {
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
					$("#conflictMessage").show();
					$(".btn-default").addClass('disabled').css({ 'opacity': '0.5', 'pointer-events': 'none' });
				} else {
					$("#conflictMessage").hide();
					$(".btn-default").addClass('active').css({ 'opacity': '1', 'pointer-events': 'auto' });
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
					remainingVacationDays: (json.vacation_map.allowed_days + json.vacation_map.transitive_days) - this.state.customCSSclasses.vacation_days.length,
					remainingOtherDays: json.vacation_map.other_days - this.state.customCSSclasses.other_days.length
				});

				////////////////////////////////////////////
				// Handle totals (month totals + year total)
				////////////////////////////////////////////
				let masterCounter = 0;

				let rows = $('.calendar tbody tr');
				for (let currMonth = 0; currMonth < rows.length; currMonth++) {
					let monthDayCounter = 0;
					for (let item of currVacationDays) {
						if (Number(moment(item).format('Y')) === Number(this.state.year) && Number(moment(item).format('M')) === Number(currMonth + 1))
							monthDayCounter++;
					}

					masterCounter = masterCounter + monthDayCounter;

					$(rows[currMonth]).find('td:last').html(monthDayCounter);
				}

				let output = "<div class='float-right yearTotalCell'>" + masterCounter + "</div>";
				$('#emplVMEdit_container #yearTotalValue').html(output);

				// Ensure draft
				api.vacation_maps.ensuredraft(this.state.year)
				.then((response) => {
					if (response.ok)
						return response.json()
					else
						this.handleHTTPErrors(response);
				}).then((json) => {
					this.setState({ map_id: json.vacation_map.id });
				}).catch((ex) => {
					console.log('Parsing failed', ex);
				})
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})
	}

	datePicked(date, classes) {
		let currDate = moment(date).format('YYYY-MM-DD');
		let currVacationDays = this.state.customCSSclasses.vacation_days;
		let currOtherDays = this.state.customCSSclasses.other_days;
		let currPublicHolidays = this.state.customCSSclasses.public_holidays;
		let currConflictingDays = this.state.customCSSclasses.conflicting_days;

		// If there are no conflicts OR there are conflicts but don't affect the current date, proceed as normal
		if (currConflictingDays.length === 0 || (currConflictingDays.length > 0 && !currConflictingDays.includes(currDate))) {
			// vacation_days
			if (this.state.radio_daysleft_otherdaysleft === 'yes') {
				// First off, ensure we don't mess with other_days i.e. make sure selected day isn't already part of the other_days list
				if (!currOtherDays.includes(currDate)) {
					// If the selected day doesn't exist yet in the allowed_days list, add it to the list
					if (!currVacationDays.includes(currDate)) {
						if (this.state.remainingVacationDays > 0) {
							currVacationDays.push(currDate);
							this.setState({ remainingVacationDays: this.state.remainingVacationDays - 1 });
						}
						// Otherwise, the selected day is already included in the allowed_days list, so remove it
					} else {
						currVacationDays = currVacationDays.filter(e => e !== currDate);
						this.setState({ remainingVacationDays: this.state.remainingVacationDays + 1 });
					}
				}
				// other_days
			} else {
				// First off, ensure we don't mess with allowed_days i.e. make sure selected day isn't already part of the allowed_days list
				if (!currVacationDays.includes(currDate)) {
					// If the selected day doesn't exist yet in the other_days list, add it to the list
					if (!currOtherDays.includes(currDate)) {
						if (this.state.remainingOtherDays > 0) {
							currOtherDays.push(currDate);
							this.setState({ remainingOtherDays: this.state.remainingOtherDays - 1 });
						}
						// Otherwise, the selected day is already included in the other_days list, so remove it
					} else {
						currOtherDays = currOtherDays.filter(e => e !== currDate);
						this.setState({ remainingOtherDays: this.state.remainingOtherDays + 1 });
					}
				}
			}

			let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
			newCustomCSSclasses.vacation_days = currVacationDays;
			newCustomCSSclasses.other_days = currOtherDays;
			this.setState({ customCSSclasses: newCustomCSSclasses });
		// There are conflicts, and so the current date is a conflicting date
		} else {
			// Remove date from conflict days list and from vacation_days / other_days list, and add it to the public_holidays list
			currConflictingDays = currConflictingDays.filter(e => e !== currDate);
			currPublicHolidays.push(moment(currDate).format('YYYY-MM-DD'));

			if (currVacationDays.includes(currDate) && this.state.radio_daysleft_otherdaysleft === 'yes') {
				currVacationDays = currVacationDays.filter(e => e !== currDate);
				this.setState({ remainingVacationDays: this.state.remainingVacationDays + 1 });

				let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
				newCustomCSSclasses.vacation_days = currVacationDays;
				newCustomCSSclasses.public_holidays = currPublicHolidays;
				newCustomCSSclasses.conflicting_days = currConflictingDays;
				this.setState({ customCSSclasses: newCustomCSSclasses });
			} else if (currOtherDays.includes(currDate) && this.state.radio_daysleft_otherdaysleft === 'no') {
				currOtherDays = currOtherDays.filter(e => e !== currDate);
				this.setState({ remainingOtherDays: this.state.remainingOtherDays + 1 });

				let newCustomCSSclasses = Object.assign({}, this.state.customCSSclasses);
				newCustomCSSclasses.other_days = currOtherDays;
				newCustomCSSclasses.public_holidays = currPublicHolidays;
				newCustomCSSclasses.conflicting_days = currConflictingDays;
				this.setState({ customCSSclasses: newCustomCSSclasses });
			}

			$('#calendar_mobile_emplvmedit table.calendar td.public_holidays').css('pointer-events', 'none');

			if (currConflictingDays.length === 0) {
				$("#conflictMessage").hide();
				$(".btn-default").addClass('active').css({ 'opacity': '1', 'pointer-events': 'auto', 'cursor': 'pointer' });
			}
		}
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

		$("#calendar_buttons").show();

		// Get public holidays
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
				return currPublicHolidays.push(item.date);
			})

			// Get VM data for the provided year and user
			api.vacation_maps.showMap(this.state.year, this.state.employee_id)
			.then((response) => {
				if (response.ok) {
					$("#calendar_mobile_emplvmedit, #calendar_header, #legend, #yearTotal").css({ 'opacity': '1', 'pointer-events': 'auto' });
					$("#calendar_buttons").show();
					$("#noVMMapMessage").hide();

					return response.json()
				} else {
					$("#calendar_mobile_emplvmedit, #calendar_header, #legend, #yearTotal").css({ 'opacity': '0.5', 'pointer-events': 'none' });
					$("#noVMMapMessage").show();
					$("#calendar_buttons").hide();

					var error = new Error(response.status + ": " + response.statusText)
					error.response = response
					throw error
				}
			}).then((json) => {
				// Get list of vacation_days and other_days
				let currVacationDays = [];
				let currOtherDays = [];
				json.vacation_map.days.map(item => {
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
					$("#conflictMessage").show();
					$(".btn-default").addClass('disabled').css({ 'opacity': '0.5', 'pointer-events': 'none' });
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
					remainingVacationDays: (json.vacation_map.allowed_days + json.vacation_map.transitive_days) - this.state.customCSSclasses.vacation_days.length,
					remainingOtherDays: json.vacation_map.other_days - this.state.customCSSclasses.other_days.length
				});

				$('#calendar_mobile_emplvmedit table.calendar td.vacation_days').css('pointer-events', 'auto');
				$('#calendar_mobile_emplvmedit table.calendar td.other_days').css('pointer-events', 'none');

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
				$('#emplVMEdit_container #yearTotalValue').append(output);

				// Ensure draft
				api.vacation_maps.ensuredraft(this.state.year)
				.then((response) => {
					if (response.ok)
						return response.json()
					else
						this.handleHTTPErrors(response);
				}).then((json) => {
					this.setState({ map_id: json.vacation_map.id });
				}).catch((ex) => {
					console.log('Parsing failed', ex);
				})
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})
	}

	render() {
		var { year, selectedDay, showWeekSeparators, customCSSclasses, remainingVacationDays, remainingOtherDays, logout } = this.state;

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
								<div id="emplVMEdit_container">
									<div id="calendar_mobile_calendarcontrols">
										<CalendarControls
											year={year}
											onPrevYear={() => this.onPrevYear()}
											onNextYear={() => this.onNextYear()}
										/>
									</div>

									<div id="calendar_header">
										<div className="btn-group">
											<label>
												<input
													type="radio"
													id="radioDaysLeft"
													name="optradio"
													value="yes"
													checked={this.state.radio_daysleft_otherdaysleft === 'yes'}
													onChange={(e) => this.onRadioChange('yes')}
												/> <strong>Vacation days left: </strong>{remainingVacationDays}
											</label>
											&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
											<label>
												<input
													type="radio"
													id="radioOtherDaysLeft"
													name="optradio"
													value="no"
													checked={this.state.radio_daysleft_otherdaysleft === 'no'}
													onChange={(e) => this.onRadioChange('no')}
												/> <strong>Bonus days left: </strong> {remainingOtherDays}
											</label>
										</div>
									</div>

									<div id="calendar_mobile_emplvmedit">
										<Calendar
											year={year}
											selectedDay={selectedDay}
											showWeekSeparators={showWeekSeparators}
											onPickDate={(date, classes) => this.datePicked(date, classes)}
											customClasses={customCSSclasses}
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

									<div id="calendar_buttons" className="text-center" style={{ display: 'none' }}>
										<button type="button" id="btnSave" className="btn btn-default btn-primary" onClick={(e) => this.handleSave(e)}>Save</button>&nbsp;
										<button type="button" id="btnSubmit" className="btn btn-default btn-primary" onClick={(e) => this.handleSubmit(e)}>Submit</button>
									</div>

									<div id="noVMMapMessage" className="alert alert-danger" style={{ margin: '50px 0 -10px 0', display: 'none' }}>
										<strong>Attention!</strong> There is not a vacation map defined for {this.state.year}.
									</div>

									<div id="conflictMessage" className="alert alert-danger mt-3" style={{ margin: '50px 0 -10px 0', display: 'none' }}>
										<strong>Problem!</strong> There is a conflict between vacation days / other days and public holidays. Please rectify the problem.
									</div>

									<div id="saveSuccessful" className="generalMsg" />
									<div id="submitSuccessful" className="generalMsg" />
								</div>
							</div>
						</div>

						{/* Public holiday list */}
						{this.state.publicHolidaysData !== undefined && this.state.publicHolidaysData.length > 0 &&
							<div className="row" id="publicHolidayList">
								<div className="col-12">
									<button type="button" className="btn btn-secondary" style={{ margin: '0 0 10px 0' }} data-toggle="collapse" data-target="#phList">Public Holiday List</button>
									<div id="phList" className="collapse">
										<div>
											<div className="card">
												{this.state.publicHolidaysData !== undefined ? (
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
																	return <tr key={item.date}>
																		<td className="text-center">
																			{ item.date }
																		</td>
																		<td className="text-center">
																			{item.description}
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

export default EmployeeVacationMapEdit;