/* eslint-disable mocha/no-pending-tests */

describe('init_steps/init_submodules', () => {
	it('should load correct submodules list');

	describe('domain object', () => {
		it('should create domain object for each submodule');
		it('should register error handler to domain');
		it('should register run handler to domain');
	});

	it('should load all submodules domain objects');
	it('should log message for Loading submodules');
	it('should log error if there is any');
	it('should register loaded submodules to bus');
	it('should return loaded submodules');
});
