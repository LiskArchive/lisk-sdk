/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const startListening = require('../../../../../../src/modules/http_api/init_steps/start_listening');

describe('init_steps/start_listening', () => {
	let stub;
	let timeoutStub;

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
					listen: sinonSandbox.stub().yields(),
				},
				httpsServer: {
					setTimeout: sinonSandbox.stub(),
					on: sinonSandbox.stub(),
					listen: sinonSandbox.stub().yields(),
				},
			},
		};

		await startListening.listen(stub.arg1, stub.arg2);
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	it('should be an async function', async () =>
		expect(startListening.listen.constructor.name).to.equal('AsyncFunction'));

	it('should set server timeout value from config to http server', async () =>
		expect(stub.arg2.httpServer.setTimeout).to.be.calledWithExactly(2000));

	it('should start listening http server with proper data', async () => {
		expect(stub.arg2.httpServer.listen.getCall(0).args[0]).to.deep.equal({
			host: stub.arg1.config.address,
			port: stub.arg1.config.httpPort,
		});
	});

	it('should destroy socket on http server timeout event', async () =>
		expect(timeoutStub.destroy.calledOnce).to.equal(true));

	it('should call logger.info with proper data on http server timeout', async () =>
		expect(stub.arg1.components.logger.info).to.be.calledWithExactly(
			`Disconnecting idle socket: ${timeoutStub.remoteAddress}:${
				timeoutStub.remotePort
			}`
		));

	it('should call logger.info with proper data if http server started listening correctly', async () =>
		expect(stub.arg1.components.logger.info).calledWithExactly(
			`Lisk started: ${stub.arg1.config.address}:${stub.arg1.config.httpPort}`
		));

	describe('when SSL is enabled', () => {
		it('should set timeout value from config to https server', async () =>
			expect(stub.arg2.httpsServer.setTimeout).calledWithExactly(
				stub.arg1.config.api.options.limits.serverSetTimeout
			));

		it('should start listening https server with proper data', async () => {
			expect(stub.arg2.httpsServer.listen.getCall(0).args[0]).to.deep.equal({
				host: stub.arg1.config.api.ssl.options.address,
				port: stub.arg1.config.api.ssl.options.port,
			});
		});

		it('should destroy socket on https server timeout event', async () => {
			expect(timeoutStub.destroy.calledOnce).to.equal(true);
		});

		it('should call logger.info with proper data on https server timeout', async () =>
			expect(stub.arg1.components.logger.info).to.be.calledWithExactly(
				`Disconnecting idle socket: ${timeoutStub.remoteAddress}:${
					timeoutStub.remotePort
				}`
			));

		it('should call logger.info with proper data if http server started listening correctly', async () =>
			expect(stub.arg1.components.logger.info).to.be.calledWithExactly(
				`Lisk https started: ${stub.arg1.config.api.ssl.options.address}:${
					stub.arg1.config.api.ssl.options.port
				}`
			));
	});
});
