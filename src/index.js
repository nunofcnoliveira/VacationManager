import React from 'react';
import ReactDOM from 'react-dom';
import registerServiceWorker from './registerServiceWorker';

// import $ from 'jquery';
import 'popper.js/dist/umd/popper';
import 'bootstrap/dist/js/bootstrap.js';
import 'jquery-easing';
import './assets/js/sb-admin.js';

import 'bootstrap/dist/css/bootstrap.css';
import './assets/vendor/font-awesome/css/font-awesome.min.css';
import './assets/css/layout.css'
import './assets/css/actions.css';

import AppRouter from './containers/AppRouter';

ReactDOM.render(
	<AppRouter />,
	document.getElementById('root')
);
registerServiceWorker();