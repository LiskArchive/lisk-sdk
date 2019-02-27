/* eslint-disable mocha/no-pending-tests */

describe('init_steps/start_listening', () => {
	it('should be an async function');
	it('should set timeout value from config to http server');
	it('should start listening http server with proper data');
	it('should destroy socket on http server timeout event');
	it('should call logger.info with proper data on http server timeout');
	it(
		'should call logger.info with proper data if http server started listening correctly'
	);

	describe('when SSL is enabled', () => {
		it('should set timeout value from config to http server');
		it('should start listening https server with proper data');
		it('should destroy socket on https server timeout event');
		it('should call logger.info with proper data on http server timeout');
		it(
			'should call logger.info with proper data if http server started listening correctly'
		);
	});
});
