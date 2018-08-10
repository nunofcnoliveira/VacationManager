import $ from 'jquery';

export const api = {
	/** 
	 * Auth API methods
	 */
	oauth: {
		getClient: () => {
			return fetch(process.env.API_URL + '/oauth/v2/client', {
				method: 'GET'
			});
		},

		getToken: (client_id, client_secret, username, password) =>  {
			return $.ajax({
				url: process.env.API_URL + '/oauth/v2/token',
				type: 'POST',
				data: {
					"grant_type": "password",
					"client_id": client_id,
					"client_secret": client_secret,
					"username": username,
					"password": password
				},
				dataType: "json"
			});
		},

		login: (username, password) => {
			return fetch(process.env.API_URL + '/oauth/v2/login', {
				method: 'POST',
				body: JSON.stringify({
					"username": username,
					"password": password
				})
			});
		},

		refreshToken: (client_id, client_secret, refresh_token) => {
			return $.ajax({
				url : process.env.API_URL + '/oauth/v2/token',
				type : 'POST',
				data : {
					"grant_type": "refresh_token",
					"client_id": client_id,
					"client_secret": client_secret,
					"refresh_token": refresh_token
				},
				dataType: "json",
				async: false
			});
		}
	},

	/** 
	 * Employees API methods
	 */
	employees: {
		getEmployeeList: () => {
			return fetch(process.env.API_URL + '/api/employee/list', {
				method: 'GET',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include"
			});
		},

		getInactiveEmployeeList: () => {
			return fetch(process.env.API_URL + '/api/employee/noaccess', {
				method: 'GET',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include"
			});
		},

		createEmployee: (name, employee_identifier, email, approver_id) => {
			return fetch(process.env.API_URL + '/api/employee/create', {
				method: 'POST',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"name": name,
					"employee_identifier": employee_identifier,
					"email": email,
					"approver_id": approver_id
				})
			});
		},

		editRoles: (employee_id, roles) => {
			return fetch(process.env.API_URL + '/api/employee/editroles', {
				method: 'PUT',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"employee_id": employee_id,
					"roles": roles
				})
			});
		},

		editStatus: (employee_id, status) => {
			return fetch(process.env.API_URL + '/api/employee/editstatus', {
				method: 'PUT',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"employee_id": employee_id,
					"status": status
				})
			});
		},

		editEmployee: (employee_id, name, employee_identifier, email, approver_id, is_external) => {
			return fetch(process.env.API_URL + '/api/employee/edit', {
				method: 'PUT',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"employee_id": employee_id,
					"name": name,
					"employee_identifier": employee_identifier,
					"email": email,
					"approver_id": approver_id,
    				"is_external": is_external
				})
			});
		}
	},

	/** 
	 * Users API methods
	 */
	users: {
		logincheck: () => {
			return fetch(process.env.API_URL + '/api/user/logincheck', {
				method: 'POST',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include"
			});
		}
	},

	/** 
	 * Vacation maps API methods
	 */
	vacation_maps: {
		showMap: (year, employee_id) => {
			return fetch(process.env.API_URL + '/api/map/show/' + year + '/' + employee_id, {
				method: 'GET',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include"
			});
		},

		listAllMaps: (year) => {
			return fetch(process.env.API_URL + '/api/map/listall', {
				method: 'POST',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"year": year
				})
			});
		},

		listAllMapsGlobal: (year) => {
			return fetch(process.env.API_URL + '/api/map/listall/global', {
				method: 'POST',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"year": year
				})
			});
		},

		showApprovedMap: (year) => {
			return fetch(process.env.API_URL + '/api/map/showapproved/' + year, {
				method: 'GET',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include"
			});
		},

		saveMap: (map_id, vacation_days, other_days) => {
			return fetch(process.env.API_URL + '/api/map/save/' + map_id, {
				method: 'PUT',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"vacation_days": vacation_days,
					"other_days": other_days
				})
			});
		},

		submitMap: (map_id) => {
			return fetch(process.env.API_URL + '/api/map/submit/' + map_id, {
				method: 'PUT',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({ })
			});
		},

		ensuredraft: (year) => {
			return fetch(process.env.API_URL + '/api/map/ensuredraft/' + (year), {
				method: 'GET',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include"
			});
		},

		getMapHistory: (employee_id, year) => {
			return fetch(process.env.API_URL + '/api/map/history/' + employee_id + '/' + year, {
				method: 'GET',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include"
			});
		},

		createMap: (year, employee_id, allowed_days, other_days) => {
			return fetch(process.env.API_URL + '/api/map/create', {
				method: 'POST',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"year": year,
					"employee_id": employee_id,
					"allowed_days": allowed_days,
					"other_days": other_days
				})
			});
		},

		editAllowedDays: (year, employee_id, allowed_days, other_days) => {
			return fetch(process.env.API_URL + '/api/map/editalloweddays', {
				method: 'PUT',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"year": year,
					"employee_id": employee_id,
					"allowed_days": allowed_days,
					"other_days": other_days
				})
			});
		}
	},

	/** 
	 * Vacation maps management API methods
	 */
	vacation_maps_management: {
		pending: (year) => {
			return fetch(process.env.API_URL + '/api/map/manage/pending/' + year, {
				method: 'GET',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include"
			});
		},

		approve: (year, employee_id) => {
			return fetch(process.env.API_URL + '/api/map/manage/approve', {
				method: 'PUT',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"year": year,
					"employee_id": employee_id
				})
			});
		},

		reject: (year, employee_id, reason) => {
			return fetch(process.env.API_URL + '/api/map/manage/reject', {
				method: 'PUT',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include",
				body: JSON.stringify({
					"year": year,
					"employee_id": employee_id,
					"reason": reason
				})
			});
		}
	},

	/** 
	 * Public holidays maps API methods
	 */
	public_holidays: {
		getPublicHolidaysList: (year) => {
			return fetch(process.env.API_URL + '/api/holiday/list/' + year, {
				method: 'GET',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token")
				},
				credentials: "include"
			});
		},

		updatePublicHolidays: (year, holidays) => {
			return fetch(process.env.API_URL + '/api/holiday/update', {
				method: 'PUT',
				headers: {
					'Authorization': 'Bearer ' + localStorage.getItem("access_token"),
					'Content-Type': 'application/json'
				},
				credentials: "include",
				body: JSON.stringify({
					"year": year.toString(),
					"holidays": holidays
				})
			});
		}
	}
};