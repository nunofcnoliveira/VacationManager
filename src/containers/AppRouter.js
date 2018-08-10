import React, { Component } from 'react';

import {
	BrowserRouter as Router,
	Route,
	Switch
} from 'react-router-dom';

import Login from './Login';
import Homepage from '../components/Homepage';

import EmployeeVacationMapView from '../components/emplVMView';
import EmployeeVacationMapEdit from '../components/emplVMEdit';
import EmployeeVacationMapHistory from '../components/emplVMHistory';

import ManagementVacationMapManagement from '../components/mngmtVMManagement';
import ManagementVacationMapHistory from '../components/mngmtVMHistory';

import HRVacationMapCreate from '../components/hrVMCreate';
import HRVacationMapEdit from '../components/hrVMEdit';
import HRPublicHolidaysManagement from '../components/hrPublicHolidaysManagement';
import HREmployeeCreate from '../components/hrEmployeeCreate';
import HREmployeesEdit from '../components/hrEmployeesEdit';
import HRGlobalVM from '../components/hrGlobalVM';

import Tests1 from '../components/Tests1';
import Tests2 from '../components/Tests2';

import NoMatch from '../containers/NoMatch';

class AppRouter extends Component {
	render() {
		return (
			<Router>
				<Switch>
					<Route exact path="/" component={ Homepage } />
					<Route path="/login" component={ Login } />

					<Route path="/vacationmapview" component={ EmployeeVacationMapView } />
					<Route path="/vacationmapedit" component={ EmployeeVacationMapEdit } />
					<Route path="/vacationmaphistory" component={ EmployeeVacationMapHistory } />

					<Route path="/vacationmapmanagement" component={ ManagementVacationMapManagement } />
					<Route path="/managevacationmaphistory" component={ ManagementVacationMapHistory } />

					<Route path="/hrvacationmapcreate" component={ HRVacationMapCreate } />
					<Route path="/hrvacationmapedit" component={ HRVacationMapEdit } />
					<Route path="/hrpublicholidaysmanagement" component={ HRPublicHolidaysManagement } />
					<Route path="/hremployeecreate" component={ HREmployeeCreate } />
					<Route path="/hremployeesedit" component={ HREmployeesEdit } />
					<Route path="/hrglobalvm" component={ HRGlobalVM } />

					<Route path="/tests1" component={ Tests1 } />
					<Route path="/tests2" component={ Tests2 } />

					<Route path="*" component={ NoMatch } />
				</Switch>
			</Router>
		);
	}
}

export default AppRouter;
