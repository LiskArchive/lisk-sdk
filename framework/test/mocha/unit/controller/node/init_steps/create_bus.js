/* eslint-disable mocha/no-pending-tests */

describe('init_steps/create_bus', () => {
	it('should create and return a bus object');
	describe('bus object', () => {
		it('should expose a method "message"');
		it('should expose a method "registerModules"');

		describe('message', () => {
			it('should set topic from first argument.');
			it('should iterate over all modules and call "on<Topic>"');
			it(
				'should iterate over all submodules of each module and call "on<Topic>"',
			);
		});

		describe('registerModules', () => {
			it('should register modules with the object');
		});
	});
});
