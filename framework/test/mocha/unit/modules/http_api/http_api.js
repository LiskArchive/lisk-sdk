/* eslint-disable mocha/no-pending-tests */

describe('HttpApi', () => {
	it('should export HttpApi class');

	describe('constructor', () => {
		it(
			'should accept channel as first parameter and assign to object instance'
		);
		it(
			'should accept options as second parameter and assign to object instance'
		);
		it('should assign null to logger');
		it('should assign null to scope');
		it('should assign null to httpServer');
		it('should assign null to httpsServer');
		it('should assign null to wsServer');
		it('should assign null to wssServer');
	});

	describe('bootstrap', () => {
		it('should be an async function');
		it('should invoke lisk:getComponentConfig to get "logger" configuration');
		it('should invoke lisk:getComponentConfig to get "storage" configuration');
		it('should invoke lisk:getComponentConfig to get "cache" configuration');
		it('should invoke lisk:getComponentConfig to get "system" configuration');
		it('should create logger component and assign to object instance');
		describe('dbLogger', () => {
			it('should set to logger if main log file is same as storage log file');
			it(
				'should create new logger component if main log file is not same as storage log file'
			);
		});
		it('should set global.constants from the constants passed by options');
		it('should log "Initiating cache..."');
		it('should create cache component');
		it('should log "Initiating storage..."');
		it('should create storage component');
		it('should bootstrap storage');
		it('should bootstrap cache');
		it('should initialize scope object with valid structure');
		it('should assign scope to object instance');
		it('should call bootstrapApi()');
		it('should call startListening()');
		it('should call subscribeToEvents()');
	});

	describe('_bootstrapApi()', () => {
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
		it('should call httpApi.bootstrapSwagger');
	});

	describe('__startListening()', () => {
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

	describe('__subscribeToEvent()', () => {
		it(
			'should subscribe to "blocks:change" on channel and emit "blocks/change" event on wsServer with proper data'
		);
		it(
			'should subscribe to "signature:change" on channel and emit "signature/change" event on wsServer with proper data'
		);
		it(
			'should subscribe to "transactions:change" on channel and emit "transactions/change" event on wsServer with proper data'
		);
		it(
			'should subscribe to "rounds:change" on channel and emit "rounds/change" event on wsServer with proper data'
		);
		it(
			'should subscribe to "multisignatures:signature:change" on channel and emit "multisignatures/signature/change" event on wsServer with proper data'
		);
		it(
			'should subscribe to "delegates:fork" on channel and emit "delegates/fork" event on wsServer with proper data'
		);
		it(
			'should subscribe to "loader:sync" on channel and emit "loader/sync" event on wsServer with proper data'
		);
	});
});
