import React, { Component } from 'react';
import moment from 'moment';
import { Calendar, CalendarControls } from 'react-yearly-calendar';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

import '../assets/css/Test2.css';

class Tests2 extends Component {
	constructor(props) {
		super(props);

		const today = moment();

		/*
		const customCSSclasses = {
			holidays: ['2018-04-25', '2018-05-01', '2018-06-02', '2018-08-15', '2018-11-01'],
			spring: {
				start: '2018-03-21',
				end: '2018-6-20'
			},
			summer: {
				start: '2018-06-21',
				end: '2018-09-22'
			},
			autumn: {
				start: '2018-09-23',
				end: '2018-12-21'
			},
			weekend: 'Sat,Sun',
			winter: day => day.isBefore(moment([2018, 2, 21])) || day.isAfter(moment([2018, 11, 21]))
		};
		*/
		const customCSSclasses = {
			weekend: 'Sat,Sun',
			public_holidays: [],
			vacation_days: [],
			other_days: []
		}
		// alternatively, customClasses can be a function accepting a moment object. For example:
		// day => (day.isBefore(moment([day.year(),2,21])) || day.isAfter(moment([day.year(),11,21]))) ? 'winter': 'summer'

		this.state = {
			year: today.year(),
			selectedDay: today,
			selectedRange: [today, moment(today).add(15, 'day')],
			showWeekSeparators: true,
			selectRange: true,
			customCSSclasses
		};
	}

	onPrevYear() {
		this.setState(prevState => ({
			year: prevState.year - 1
		}));
	}

	onNextYear() {
		this.setState(prevState => ({
			year: prevState.year + 1
		}));
	}

	datePicked(date) {
		this.setState({
			selectedDay: date,
			selectedRange: [date, moment(date).add(15, 'day')]
		});
	}

	rangePicked(start, end) {
		this.setState({
			selectedRange: [start, end],
			selectedDay: start
		});
	}

	render() {
		const {
			year,
			selectedDay,
			showWeekSeparators,
			selectRange,
			selectedRange,
			customCSSclasses
		} = this.state;

		return (
			<div>
				<Navigation />

				<div className="content-wrapper">
					<div className="container-fluid">
						{/* Content */}
						<div className="row">
							<div id="calendar">
								<CalendarControls
									year={year}
									onPrevYear={() => this.onPrevYear()}
									onNextYear={() => this.onNextYear()}
								/>
								<Calendar
									year={year}
									selectedDay={selectedDay}
									showWeekSeparators={showWeekSeparators}
									selectRange={selectRange}
									selectedRange={selectedRange}
									onPickDate={(date, classes) => this.datePicked(date, classes)}
									onPickRange={(start, end) => this.rangePicked(start, end)}
									customClasses={customCSSclasses}
								/>
							</div>
						</div>
					</div>
					<Footer />
				</div>
			</div>
		);
	}
}

export default Tests2;