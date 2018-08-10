import React, { Component } from 'react';

class Footer extends Component {
	render() {
		return(
			<div>
				<footer className="sticky-footer">
					<div className="container">
						<div className="text-center">
							<small>Copyright © Cleverti 2017</small>
						</div>
					</div>
				</footer>

				{/* Scroll to Top Button */}
				<a className="scroll-to-top rounded" href="#page-top">
					<i className="fa fa-angle-up"></i>
				</a>
			</div>
		);
	}
}

export default Footer;