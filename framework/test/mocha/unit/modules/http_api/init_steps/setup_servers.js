/* eslint-disable mocha/no-pending-tests */

describe('init_steps/setup_servers', () => {
	it('should be an async function');
	it('should instantiate an express app');
	it('should enable coverage if enabled in config');
	it(
		'should call express.enable("trustProxy") if trustProxy is enabled in config'
	);
	it('should create an http server and assign it to object instance');
	it(
		'should create a ws server with socket.io and assign it to object instance'
	);
	it(
		'should create https server if ssl is enabled in config and assign it to object instance'
	);
	it(
		'should create wss server if ssl is enabled in config and assign it to object instance'
	);
});
