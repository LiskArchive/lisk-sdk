/* eslint-disable mocha/no-pending-tests */

describe('Chain', () => {
	it('should export chain class');

	describe('constructor', () => {
		it(
			'should accept channel as first parameter and assign to object instance'
		);
		it(
			'should accept options as second parameter and assign to object instance'
		);
		it('should assign null to logger');
		it('should assign null to scope');
	});

	describe('bootstrap', () => {
		it('should be an async function');
		it('should invoke lisk:getComponentConfig to get "logger" configuration');
		it('should invoke lisk:getComponentConfig to get "storage" configuration');
		it('should invoke lisk:getComponentConfig to get "cache" configuration');
		it('should create logger component and assign to object instance');
		describe('dbLogger', () => {
			it('should set to logger if main log file is same as storage log file');
			it(
				'should create new logger component if main log file is not same as storage log file'
			);
		});
		it('should get last commit from git');
		it(
			'should log error if there is any error during getting last commit from git'
		);
		it('should set global.constants from the constants passed by options');
		it(
			'should set global.exceptions as a merger default exceptions and passed options'
		);
		it('should log "Initiating cache..."');
		it('should create cache component');
		it('should log "Initiating storage..."');
		it('should create storage component');
		it("should throw error if provided options don't have nethash attribute");
		it('should initialize scope object with valid structure');
		it('should lookup for peer ips');
		it('should bootstrap storage');
		it('should bootstrap cache');
		it('should create bus object and assign to scope.bus');
		it('should create httpServer object and assign to scope.network');
		it('should init logic structure object and assign to scope.logic');
		it('should init submodules object and assign to scope.submodules');
		it('should create socket cluster object and assign to scope.webSocket');
		it('should attach swagger to http server and assign to scope.swagger');
		it('should assign scope.swagger as a module scope.submodules.swagger');
		it('should bind submodules with scope.logic.peers');
		it('should send bind message on the bus');
		it('should start listening on socket cluster');
		it('should start listening on network');
		it('should log "Modules ready and launched"');
		it('should assign scope to object instance');

		describe('if any error thrown', () => {
			it('should log "Chain initialization"');
			it('should emit an event "cleanup" on the process');
		});
	});

	describe('cleanup', () => {
		it('should be an async function');
		it('should log "Cleaning chain..."');
		it('should call cleanup on all components');
		it('should call cleanup on all submodules');
		it('should log error if occurred during submodule cleanup');
		it('should log "Cleaned up successfully"');
	});
});
