import React, { Component } from 'react';

import Autosuggest from 'react-autosuggest';
import '../assets/css/other/react_autosuggest.css';

/*
 * USAGE (parent component):
 * 
 * 1. Import MyAutosuggest: import MyAutosuggest from './MyAutosuggest';
 * 
 * 2. Define custom function (to update specific state vars, adjust UI elements etc):
 * 
 * 		processAutosuggest(newValue) {
 * 			this.setState({
 * 				selectedEmployeeId: <whatever>,
 * 				selectedEmployeeName: <whatever>
 * 			});
 * 		}
 * 
 * 3. Call MyAutosuggest inside Render() e.g.
 * 
 * 		<MyAutosuggest 
 * 			id="hrVMCreate"
 * 			placeholder="Type employee name"
 * 			data={ this.state.employeeNameList }
 * 			processfunction={ (e) => this.processAutosuggest(e) }
 * 		/>
 */

class MyAutosuggest extends Component {
	constructor(props) {
		super(props);

		this.state = {
			value: '',
			suggestions: []
		}
	}

	onSearchChange(event, { newValue, method }) {
		this.setState({ value: newValue });

		// Custom function passed in by parent component as a prop. Executed on parent by simply calling it. Pure magic :)
		this.props.processfunction(newValue);
	}

	onSuggestionsFetchRequested({ value }) {
		const escapeRegexCharacters = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		const getSuggestions = value => {
			const escapedValue = escapeRegexCharacters(value.trim());
			if (escapedValue === '') { return [] }
			const regex = new RegExp('^' + escapedValue, 'i');

			return this.props.data.filter(name => regex.test(name));
		}

		this.setState({ suggestions: getSuggestions(value) });
	};

	onSuggestionsClearRequested() {
		this.setState({ suggestions: [] });
	};

	componentWillUpdate(newProps, newState) {
		if (this.props.wasupdated && this.props.wasupdated === 1) {
			this.setState({ value: '' });
		}
	}

	render() {
		const { id, placeholder } = this.props;
		const { value, suggestions } = this.state;
		const inputProps = {
			placeholder,
			value,
			onChange: this.onSearchChange.bind(this)
		};
		const getSuggestionValue = suggestion => suggestion;
		const renderSuggestion = suggestion => (
			<div>
				{suggestion}
			</div>
		);

		return (
			<Autosuggest 
				id={ id }
				suggestions={ suggestions }
				onSuggestionsFetchRequested={ (e) => this.onSuggestionsFetchRequested(e) }
				onSuggestionsClearRequested={ (e) => this.onSuggestionsClearRequested(e) }
				getSuggestionValue={ getSuggestionValue }
				renderSuggestion={ renderSuggestion }
				inputProps={ inputProps } 
			/>
		);
	}
}

export default MyAutosuggest;