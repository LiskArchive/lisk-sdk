const rewire = require('rewire');

const startListening = rewire(
	'../../../../../../src/modules/http_api/init_steps/start_listening'
);

describe('init_steps/start_listening', () => {
	let stub;
	let timeoutStub;

	const startServerStub = sinonSandbox.stub().resolves();
	startListening.__set__('startServer', startServerStub);

	beforeEach(async () => {
		timeoutStub = {
			remoteAddress: '13607583239938732846L',
			remotePort: 9999,
			destroy: sinonSandbox.stub(),
		};

		stub = {
			arg1: {
				components: {
					logger: {
						info: sinonSandbox.stub(),
					},
				},
				config: {
					httpPort: 8000,
					address: '1085993630748340485L',
					api: {
						options: {
							limits: {
								headersTimeout: 1000,
								serverSetTimeout: 2000,
							},
						},
						ssl: {
							enabled: true,
							options: {
								port: 4000,
								address: '13308611084197332487L',
							},
						},
					},
				},
			},
			arg2: {
				httpServer: {
					setTimeout: sinonSandbox.stub(),
					on: sinonSandbox.stub().yields(timeoutStub),
				},
				httpsServer: {
					setTimeout: sinonSandbox.stub(),
					on: sinonSandbox.stub(),
				},
			},
		};
		await startListening(stub.arg1, stub.arg2);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	it('should be an async function', async () =>
		expect(startListening.constructor.name).to.equal('AsyncFunction'));

	it('should set server timeout value from config to http server', async () =>
		expect(stub.arg2.httpServer.setTimeout.getCall(0).args[0]).to.equal(2000));

	it('should start listening http server with proper data', async () => {
		expect(typeof startServerStub.getCall(0).args[0]).to.equal('object');
		expect(startServerStub.getCall(0).args[1]).to.equal(
			stub.arg1.config.httpPort
		);
		expect(startServerStub.getCall(0).args[2]).to.equal(
			stub.arg1.config.address
		);
	});

	it('should destroy socket on http server timeout event', async () =>
		expect(timeoutStub.destroy.calledOnce).to.equal(true));

	it('should call logger.info with proper data on http server timeout', async () =>
		expect(stub.arg1.components.logger.info.getCall(0).args[0]).to.equal(
			`Disconnecting idle socket: ${timeoutStub.remoteAddress}:${
				timeoutStub.remotePort
			}`
		));

	it('should call logger.info with proper data if http server started listening correctly', async () =>
		expect(stub.arg1.components.logger.info.getCall(1).args[0]).to.equal(
			`Lisk started: ${stub.arg1.config.address}:${stub.arg1.config.httpPort}`
		));

	describe('when SSL is enabled', () => {
		it('should set timeout value from config to https server', async () =>
			expect(stub.arg2.httpsServer.setTimeout.getCall(0).args[0]).to.equal(
				2000
			));

		it('should start listening https server with proper data', async () => {
			expect(typeof startServerStub.getCall(1).args[0]).to.equal('object');
			expect(startServerStub.getCall(1).args[1]).to.equal(
				stub.arg1.config.api.ssl.options.port
			);
			expect(startServerStub.getCall(1).args[2]).to.equal(
				stub.arg1.config.api.ssl.options.address
			);
		});

		it('should destroy socket on https server timeout event', async () =>
			expect(timeoutStub.destroy.calledOnce).to.equal(true));

		it('should call logger.info with proper data on https server timeout', async () =>
			expect(stub.arg1.components.logger.info.getCall(0).args[0]).to.equal(
				`Disconnecting idle socket: ${timeoutStub.remoteAddress}:${
					timeoutStub.remotePort
				}`
			));

		it('should call logger.info with proper data if http server started listening correctly', async () =>
			expect(stub.arg1.components.logger.info.getCall(2).args[0]).to.equal(
				`Lisk https started: ${stub.arg1.config.api.ssl.options.address}:${
					stub.arg1.config.api.ssl.options.port
				}`
			));
	});
});
