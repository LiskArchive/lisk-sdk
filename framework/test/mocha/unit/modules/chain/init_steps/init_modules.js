/* eslint-disable mocha/no-pending-tests */

describe('init_steps/init_modules', () => {
	it('should load correct modules list');

	describe('domain object', () => {
		it('should create domain object for each module');
		it('should register error handler to domain');
		it('should register run handler to domain');
	});

	it('should load all modules domain objects');
	it('should log message for loading modules');
	it('should log error if there is any');
	it('should register loaded modules to bus');
	it('should return loaded modules');
});
