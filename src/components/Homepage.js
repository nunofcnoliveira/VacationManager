import React, { Component } from 'react';

import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

class Homepage extends Component {
	render() {
		return (
			<div>
				<Navigation />

				<div className="content-wrapper">
					<div className="container-fluid">
						<div className="row">
							{/* Content */}
							<div className="col-12">
								<div className="container text-center">
									<h1 style={{ marginTop: '5em', color: '#FF7F50', textShadow: '2px 2px 4px #000000' }}>Welcome to the Vacation Map Manager Application!</h1>
									<h3>Feel free to explore. Innovation works!</h3>
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

export default Homepage;
