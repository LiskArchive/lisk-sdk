/*
 * Copyright © 2018 Lisk Foundation
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

const config = require('../../../../../../src/modules/chain/helpers/config');
const {
	ZSchema,
} = require('../../../../../../src/controller/helpers/validator');

describe('helpers/config', () => {
	let processExitStub;
	let zSchemaStub;

	const env = JSON.stringify(process.env);
	const argv = JSON.stringify(process.argv);
	const packageJsonArgs = {
		version: '1.5.0',
		lisk: {
			protocolVersion: '1.0',
		},
	};

	beforeEach(async () => {
		process.argv = JSON.parse(argv);
		process.env = JSON.parse(env);

		zSchemaStub = sinonSandbox.stub(ZSchema.prototype, 'getLastErrors');
		processExitStub = sinonSandbox.stub(process, 'exit');
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	it('should return appConfig containing correct properties', async () => {
		const appConfig = config(packageJsonArgs, false);

		// Only check if most important properties are present
		expect(appConfig).to.have.property('db');
		expect(appConfig).to.have.property('redis');
		expect(appConfig).to.have.property('api');
		expect(appConfig).to.have.property('peers');
		expect(appConfig).to.have.property('genesisBlock');
		expect(appConfig).to.have.property('constants');
	});

	describe('Commandline options: process.argv', () => {
		it('should exit app if validation fails for config', async () => {
			// Arrange
			process.argv.push('-p', '99990');

			// Act
			config(packageJsonArgs);

			// Assert
			expect(zSchemaStub).to.be.calledOnce;
			expect(processExitStub).to.be.called;
		});

		it('should exit app if non-existent network name is received', async () => {
			// Arrange
			process.argv.push('-p', '8000', '-n', 'invalid-network');

			try {
				// Act
				config(packageJsonArgs);
			} catch (err) {
				// Assert
				expect(processExitStub).to.be.called;
			}
		});

		it('should parse commandline options and return appConfig', async () => {
			const httpPort = 9999;
			process.argv.push('-n', 'devnet', '-h', httpPort.toString());

			const appConfig = config(packageJsonArgs);
			expect(appConfig.httpPort).to.equal(httpPort);
		});

		it('should not parse node args if parseCommandLineOptions=false', async () => {
			config(packageJsonArgs, false);
			expect(zSchemaStub).to.not.be.called;
		});
	});

	describe('Commandline options: process.env', () => {
		it('should parse env vars and return app config', async () => {
			// Arrange
			const port = 8888;
			process.env.LISK_REDIS_PORT = port.toString();

			// Act
			const appConfig = config(packageJsonArgs);

			// Assert
			expect(appConfig.redis.port).to.equal(port);
		});

		it('should exit app if non-existent network name is received', async () => {
			// Arrange
			process.env.LISK_NETWORK = 'wrong-network';

			try {
				// Act
				config(packageJsonArgs);
			} catch (err) {
				// Assert
				expect(processExitStub).to.be.called;
			}
		});

		it('should exit app if validation fails for config', async () => {
			// Arrange
			process.env.LISK_HTTP_PORT = '99990';

			try {
				// Act
				config(packageJsonArgs);
			} catch (err) {
				// Assert
				expect(zSchemaStub).to.be.calledOnce;
				expect(processExitStub).to.be.called;
			}
		});
	});
});
