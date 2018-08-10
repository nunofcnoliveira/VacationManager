import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

import $ from 'jquery';
import { api } from '../api';

import moment from 'moment';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

class HRGlobalVM extends Component {
	constructor(props) {
		super(props);

		const today = moment();

		this.state = {
			allVMsData: undefined,
			publicHolidaysData: undefined,
			employeeNameList: '',
			logout: false,

			yearList: [{ Name: today.year() + 1 }, { Name: today.year() }, { Name: today.year() - 1 }, { Name: today.year() - 2 }, { Name: today.year() - 3 }],
			selectedYear: today.year().toString()
		}
	}

	handleHTTPErrors(response) {
		// If getting an HTTP error 401 or 403, logout (i.e. clean all local storage data and re-direct to /login)
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

	getAllVMData(year) {
		api.employees.getEmployeeList()
		.then((response) => {
			if (response.ok)
				return response.json()
			else
				this.handleHTTPErrors(response);
		}).then((json) => {
			api.vacation_maps.listAllMapsGlobal(year)
			.then((response) => {
				if (response.ok)
					return response.json()
				else
					this.handleHTTPErrors(response);
			}).then((json2) => {
				let allEMployeesMaps = [];

				json.employee_list.map((curr_employee) => {
					let vm_days = [];
					let allowed_days = 0;
					let transitive_days = 0;
					let vm_status = 0;
					json2.vacation_maps.map((curr_vm) => {
						if (curr_employee.id === curr_vm.employee.id) {
							// if (curr_vm.status === 5) {
								vm_days.push(curr_vm.days);
								allowed_days = curr_vm.allowed_days;
								transitive_days = curr_vm.transitive_days;
								vm_status = curr_vm.status;
							// }
						}

						return true
					})

					allEMployeesMaps.push([curr_employee.id, curr_employee.name, vm_days, allowed_days, transitive_days, vm_status]);

					return true
				})

				this.setState({ allVMsData: allEMployeesMaps });
			}).catch((ex) => {
				console.log('Parsing failed', ex);
			})
		}).catch((ex) => {
			console.log('Parsing failed', ex);
		})
	}

	handleSelectedYear(e) {
		this.getAllVMData(e.target.value)

		this.setState({ selectedYear: e.target.value });
	}

	// Export PDF with global vacation maps for the selected year
	exportToPDF(e) {
		$.ajax({
			type : 'GET',
			url: process.env.API_URL + '/api/map/export/' + this.state.selectedYear,
			xhrFields: {
				responseType: 'blob',
				withCredentials: true
			},
			headers: {
				'Authorization': 'Bearer ' + localStorage.getItem("access_token")
			},
			success: (blob) => {
				let filename = "Mapa_global_de_ferias-" + moment(new Date()).format("YYYY-MM-DD") + ".pdf";

				if (window.navigator.msSaveOrOpenBlob) // IE10+
					window.navigator.msSaveOrOpenBlob(blob, filename);
				else { // Others
					let a = document.createElement("a");
					let url = URL.createObjectURL(blob);

					a.href = url;
					a.download = filename;
					document.body.appendChild(a);
					a.click();
					setTimeout(() => {
						document.body.removeChild(a);
						window.URL.revokeObjectURL(url);  
					}, 0);
				}
			},
			error: (jqXHR, status, error) => {
				this.handleHTTPErrors(jqXHR);
			}
		});
	}

	componentDidMount() {
		this.getAllVMData(this.state.selectedYear);

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
			this.setState({ publicHolidaysData: publicHolidays });
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

		if (this.state.allVMsData !== undefined && this.state.publicHolidaysData !== undefined) {
			let masterSpentDaysCounter = [];

			const calendar = (currYear, currMonth) => {
				// General vars
				let weekDayNamesRow = '';
				let monthDayNumbersRow = '';
				let currWeekDay = 0;
				let currDay = 1;
				let totalDaysInFeb = 0;
				let paddingTotal = 0;

				// Date-related vars
				let current = new Date();
				let year = current.setFullYear(currYear);
				year = current.getFullYear();

				// Deal with leap years
				if (currMonth === 2) {
					if (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)) {
						totalDaysInFeb = 29;
					} else {
						totalDaysInFeb = 28;
					}
				}

				// Setting up arrays for the name of the months, days, and the number of days in the current month.
				let monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
				let dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thrusday", "Friday", "Saturday"];
				let totalDays = ["31", "" + totalDaysInFeb + "", "31", "30", "31", "30", "31", "31", "30", "31", "30", "31"];

				// Temp values to get the number of days in current month, and previous month. Also getting the day of the week.
				let tempDate = new Date(currMonth + ' 1 ,' + year);
				let tempWeekday = tempDate.getDay();
				let totalDaysInMonth = totalDays[(currMonth - 1)];

				///////////////////////////////////////////////////////////////////////
				// Prepare calendar header rows (week days row + month day numbers row)
				///////////////////////////////////////////////////////////////////////

				// 1. After getting the first day of the week for the month, calculate padding (the other days for that week with the previous months days)
				while (tempWeekday > 0) {
					monthDayNumbersRow += "<td class='paddingDays'></td>";

					tempWeekday--;
					paddingTotal++;
				}

				// 2. Calculate and display all weekdays for the month (i.e. Sunday, Monday, etc)
				while (currDay <= 37) {
					weekDayNamesRow += "<td class='weekDays'>" + dayNames[currWeekDay].substring(0, 1) + "</td>";

					currWeekDay < 6 ? currWeekDay++ : currWeekDay = 0
					currDay++;
				}

				currDay = 1;

				// 3. Calculate and display the current month's day numbers (pre-padding + day numbers + post-padding)
				currWeekDay = paddingTotal;
				while (currDay <= (37 - paddingTotal)) {
					// If current day <= total number of days for current month
					if (currDay <= totalDaysInMonth) {
						// Check if curr day/month is a public holiday
						let publicHolidayMatch = false;
						for (let publicHoliday of this.state.publicHolidaysData) {
							if (currDay === Number(moment.parseZone(publicHoliday).format('D')) && currMonth === Number(moment.parseZone(publicHoliday).format('M'))) {
								publicHolidayMatch = true;

								break;
							}
						}

						if (publicHolidayMatch)
							monthDayNumbersRow += "<td class='publicHolidays'>" + currDay + "</td>";
						else if (dayNames[currWeekDay] === 'Saturday' || dayNames[currWeekDay] === 'Sunday')
							monthDayNumbersRow += "<td class='weekendDayNumbers'>" + currDay + "</td>";
						else
							monthDayNumbersRow += "<td class='monthDayNumbers'>" + currDay + "</td>";
					} else {
						monthDayNumbersRow += "<td class='paddingDays'></td>";
					}

					currWeekDay < 6 ? currWeekDay++ : currWeekDay = 0;
					currDay++;
				}

				currDay = 1;

				//////////////////////////
				// Display calendar header
				//////////////////////////
				let calendarTable = "<div style='overflow-x:auto;'>";

				calendarTable += "<table class='globalVMCalendarTable'>";
				calendarTable += "<tr>";
				calendarTable += "<td rowspan='2' class='monthCell'>" + monthNames[(currMonth - 1)] + "</td>";
				calendarTable += weekDayNamesRow;
				calendarTable += "<td style='background: white; border: 1px solid white;'>&nbsp;&nbsp;&nbsp;</td>";
				calendarTable += "<td colspan='3' style='background: white; border: 1px solid white; color: #666;'><strong>Month Totals</strong></td>";
				calendarTable += "</tr>";
				calendarTable += "<tr>";
				calendarTable += monthDayNumbersRow;
				calendarTable += "<td style='background: white; border-bottom: 1px solid white;'></td>";
				calendarTable += "<td style='padding: 5px; background-color: #888; color: white;'><strong>Allowed days</strong></td>";
				calendarTable += "<td style='padding: 5px; background-color: #888; color: white;'><strong>Spent</strong></td>";
				calendarTable += "<td style='padding: 5px; background-color: #888; color: white;'><strong>Remaining</strong></td>";
				calendarTable += "</tr>";

				///////////////////////////
				// Output vacation map data
				///////////////////////////
				this.state.allVMsData.map((employeeVM) => {
					// Parse employee name and get only first name + last name
					let tempEmployeeName = employeeVM[1].split(' ');
					let currEmployeeName = '';

					switch(tempEmployeeName.length) {
						case 1:
							currEmployeeName = tempEmployeeName[0];
							break;
						case 2:
							currEmployeeName = tempEmployeeName[0] + ' ' + tempEmployeeName[1];
							break;
						default:
							currEmployeeName = tempEmployeeName[0] + ' ' + tempEmployeeName[tempEmployeeName.length - 1];
					}

					// Display current employee
					calendarTable += "<tr>";
					calendarTable += "<td class='employeeCells'>" + currEmployeeName + "</td>";

					// Display first padding days
					for (let paddingCounter = 0; paddingCounter < paddingTotal; paddingCounter++) {
						calendarTable += "<td class='paddingDays'></td>";
					}

					// Loop through all the current month's days
					currWeekDay = paddingTotal;
					let spentDaysCounter = 0;
					while (currDay <= (37 - paddingTotal)) {
						// If current day <= total number of days for current month
						if (currDay <= totalDaysInMonth) {
							// Check if current day/month is a vacation day / bonus day, provided there are vacation days defined AND the map has been approved (status=5)
							let vacationDayMatch = false;
							let bonusDayMatch = false;
							if (employeeVM[2].length > 0 && employeeVM[5] === 5) {
								for (let vacationMap of employeeVM[2][0]) {
									if (currDay === Number(moment.parseZone(vacationMap.date).format('D')) && currMonth === Number(moment.parseZone(vacationMap.date).format('M'))) {
										if (!vacationMap.is_other) {
											vacationDayMatch = true;
											spentDaysCounter++;
										} else {
											bonusDayMatch = true;
										}
									}
								}
							}

							// Check if current day/month is a public holiday day
							let publicHolidayMatch = false;
							for (let publicHoliday of this.state.publicHolidaysData) {
								if (currDay === Number(moment.parseZone(publicHoliday).format('D')) && currMonth === Number(moment.parseZone(publicHoliday).format('M'))) {
									publicHolidayMatch = true;
									break;
								}
							}

							if (vacationDayMatch)
								calendarTable += "<td class='holidayDays'>x</td>";
							else if (bonusDayMatch)
								calendarTable += "<td class='holidayDays'>o</td>";
							else if (publicHolidayMatch)
								calendarTable += "<td class='publicHolidays'></td>";
							else if (dayNames[currWeekDay] === 'Saturday' || dayNames[currWeekDay] === 'Sunday')
								calendarTable += "<td class='weekendDays'></td>";
							else
								calendarTable += "<td class='regularDays'></td>";
						} else {
							calendarTable += "<td class='paddingDays'></td>";
						}

						currWeekDay < 6 ? currWeekDay++ : currWeekDay = 0;
						currDay++;
					}

					currDay = 1;

					/////////////////
					// Display totals
					/////////////////
					// Add current employee to the master spent days array, if it's not already added
					let alreadtExists = masterSpentDaysCounter.find( (el) => { 
						return el.employee === employeeVM[1];
					});

					calendarTable += "<td style='background: white; border-bottom: 1px solid white;'></td>";

					// If there are vacation days OR transitive days defined
					if (employeeVM[3] > 0 || employeeVM[4] > 0) {
						// If current employee is not yet part of the master spent days counter array (this is January), add him/her, and display initial totals
						if (!alreadtExists) {
							let item = {
								employee: employeeVM[1],
								spentDays: spentDaysCounter
							};
		
							masterSpentDaysCounter.push(item);

							calendarTable += "<td>" + (employeeVM[3] + employeeVM[4]) + "</td>";
							calendarTable += "<td>" + spentDaysCounter + "</td>";
							calendarTable += "<td>" + ((employeeVM[3] + employeeVM[4]) - spentDaysCounter) + "</td>";
						// Current employee already exists, calculate totals based on previous month's values
						} else {
							let currAllowedDays = (employeeVM[3] + employeeVM[4]) - alreadtExists.spentDays;
							let currRemaining = currAllowedDays - spentDaysCounter;

							calendarTable += "<td>" + currAllowedDays + "</td>";
							calendarTable += "<td>" + spentDaysCounter + "</td>";
							calendarTable += "<td>" + currRemaining + "</td>";

							// Update 'spentDays' array value for current user. This is the magic that makes the whole totals's mechanism work ;)
							alreadtExists.spentDays = alreadtExists.spentDays + spentDaysCounter;
						}
					} else {
						calendarTable += "<td>N/A</td>";
						calendarTable += "<td>N/A</td>";
						calendarTable += "<td>N/A</td>";
					}

					calendarTable += "</tr>";

					return true;
				})

				calendarTable += "</table>";

				calendarTable += "</div>";

				$('#calendar').append(calendarTable);
			}

			const year_calendar = (currYear) => {
				$('#calendar').html('');
				for (let currMonth = 1; currMonth <= 12; currMonth++) {
					calendar(currYear, currMonth, masterSpentDaysCounter);
				}
			}

			year_calendar(this.state.selectedYear);
		} else {
			$('#calendar').append("Loading...<br /><br />");
		}

		return (
			<div>
				{/* Navigation */}
				<Navigation />

				<div className="content-wrapper">
					{/* Content */}
					<div className="container-fluid">
						{/* Year selection */}
						<div className="row">
							<div className="col-12">
								<div className="hrglobalvm_content">
									<div className="form-group text-center">
										<strong>Please select a year: </strong>
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

						{/* Export PDF button */}
						<div className="row">
							<div className="col-12">
								<div className="hrglobalvm_content text-center">
								<button type="button" className="btn btn-primary mb-3" onClick={(e) => this.exportToPDF(e)}>Export to PDF</button>
								</div>
							</div>
						</div>

						{/* Global Vacation Map */}
						<div className="row">
							<div className="col-12">
								<div className="hrglobalvm_content text-center">
									<div id="calendar"></div>
								</div>
							</div>
						</div>

						{/* Export PDF button */}
						<div className="row">
							<div className="col-12">
								<div className="hrglobalvm_content text-center">
								<button type="button" className="btn btn-primary mt-0 mb-3" onClick={(e) => this.exportToPDF(e)}>Export to PDF</button>
								</div>
							</div>
						</div>
					</div>

					{/* Footer */}
					<Footer />
				</div>
			</div>
		);
	}
}

export default HRGlobalVM;