const _ = require('lodash');
const rewire = require('rewire');
const fs = require('fs');
const https = require('https');
const http = require('http');

const setupServers = rewire(
	'../../../../../../src/modules/http_api/init_steps/setup_servers'
);

describe('init_steps/setup_servers', () => {
	let servers;
	let expressStub;
	let socketIOStub;
	const stub = {
		components: {
			logger: {
				debug: sinonSandbox.stub(),
			},
		},
		config: {
			coverage: false,
			trustProxy: false,
			api: {
				ssl: {
					enabled: false,
					options: {
						key: './ssl/lisk.key',
						cert: './ssl/lisk.crt',
					},
				},
			},
		},
	};

	setupServers.__set__('im', {
		createHandler: sinonSandbox.stub(),
		hookLoader: sinonSandbox.stub(),
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('ssl.enabled=false', () => {
		beforeEach(async () => {
			sinonSandbox.stub(fs, 'readFileSync');
			sinonSandbox.stub(https, 'createServer').returns('https');
			sinonSandbox.stub(http, 'createServer').returns('http');

			socketIOStub = sinonSandbox.stub().returns('socket');
			setupServers.__set__('socketIO', socketIOStub);

			expressStub = {
				use: sinonSandbox.stub(),
				enable: sinonSandbox.stub(),
			};
			setupServers.__set__('express', () => expressStub);

			const clonedStub = _.cloneDeep(stub);
			clonedStub.config.trustProxy = true;
			clonedStub.config.coverage = true;

			servers = setupServers(clonedStub);
		});

		it('should create an http server and assign it to object instance', async () => {
			expect(http.createServer.called).to.equal(true);
			expect(https.createServer.called).to.equal(false);
			expect(servers.httpServer).to.equal('http');
			expect(servers.httpsServer).to.equal(undefined);
		});

		it('should create a ws server with socket.io and assign it to object instance', async () => {
			expect(socketIOStub.calledOnce).to.equal(true);
			expect(servers.wsServer).to.equal('socket');
			expect(servers.wssServer).to.equal(undefined);
		});

		it('should enable coverage if enabled in config', async () =>
			expect(stub.components.logger.debug.calledOnce));

		it('should call express.enable("trustProxy") if trustProxy is enabled in config', async () =>
			expect(expressStub.enable.calledOnce));

		it('should return object holding correct 5 properties', async () =>
			expect(servers).to.have.keys(
				'expressApp',
				'httpServer',
				'httpsServer',
				'wsServer',
				'wssServer'
			));
	});

	describe('ssl.enabled=true', () => {
		beforeEach(async () => {
			sinonSandbox.stub(fs, 'readFileSync');
			sinonSandbox.stub(https, 'createServer').returns('https');
			sinonSandbox.stub(http, 'createServer').returns('http');

			socketIOStub = sinonSandbox.stub().returns('socket');
			setupServers.__set__('socketIO', socketIOStub);

			expressStub = {
				use: sinonSandbox.stub(),
				enable: sinonSandbox.stub(),
			};
			setupServers.__set__('express', () => expressStub);

			const clonedStub = _.cloneDeep(stub);
			clonedStub.config.api.ssl.enabled = true;

			servers = setupServers(clonedStub);
		});

		it('should create https server if ssl is enabled in config and assign it to object instance', async () => {
			expect(https.createServer.called).to.equal(true);
			expect(servers.httpsServer).to.equal('https');
		});

		it('should create wss server if ssl is enabled in config and assign it to object instance', async () => {
			expect(socketIOStub.callCount).to.equal(2);
			expect(servers.wssServer).to.equal('socket');
		});

		it('should read ssl options from filesystem for privateKey and certificate', async () => {
			expect(fs.readFileSync.callCount).to.equal(2);
		});

		it('should call readFileSync with correct parameters', async () => {
			expect(fs.readFileSync.getCall(0).args[0]).to.equal(
				stub.config.api.ssl.options.key
			);
			expect(fs.readFileSync.getCall(1).args[0]).to.equal(
				stub.config.api.ssl.options.cert
			);
		});
	});
});
