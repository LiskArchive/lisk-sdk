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

const OS = require('os');

const { createSystemComponent } = require('../../../../src/components/system');

describe('components: system', async () => {
	let systemComponent;
	let loggerStub;
	let storageStub;
	let dummyConfig;

	beforeEach(async () => {
		// Library
		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

		storageStub = sinonSandbox.stub();

		dummyConfig = {
			height: 1,
			nethash: 'test broadhash',
			version: '1.0.0-beta.3',
			wsPort: '3001',
			httpPort: '3000',
			minVersion: '1.0.0-beta.0',
			protocolVersion: '1.0',
			nonce: 'test nonce',
		};

		dummyConfig.broadhash = dummyConfig.nethash;

		systemComponent = createSystemComponent(
			dummyConfig,
			loggerStub,
			storageStub
		);
	});

	describe('constructor', async () => {
		it('should assign params to library', async () => {
			const { os, ...headers } = systemComponent.headers;
			expect(systemComponent.logger).to.eql(loggerStub);
			expect(systemComponent.storage).to.eql(storageStub);
			expect(headers).to.deep.equal(dummyConfig);
		});

		it('should assign config to headers', async () => {
			const headers = systemComponent.headers;
			expect(headers.os).to.eql(OS.platform() + OS.release());
			expect(headers.version).to.eql(dummyConfig.version);
			expect(headers.wsPort).to.eql(dummyConfig.wsPort);
			expect(headers.httpPort).to.eql(dummyConfig.httpPort);
			expect(headers.height).to.eql(1);
			expect(headers.nethash).to.eql(dummyConfig.nethash);
			// Broadhash should be assigned to the same as nethash at first instance
			expect(headers.broadhash).to.eql(dummyConfig.nethash);
			expect(headers.minVersion).to.eql(dummyConfig.minVersion);
			expect(headers.protocolVersion).to.eql(dummyConfig.protocolVersion);
			expect(headers.nonce).to.eql(dummyConfig.nonce);
		});

		it('should create an object with several functions availables', async () => {
			expect(systemComponent).to.be.an('object');
			expect(systemComponent.headers).to.be.an('object');
			expect(systemComponent.getBroadhash).to.be.a('function');
			expect(systemComponent.networkCompatible).to.be.a('function');
			expect(systemComponent.versionCompatible).to.be.a('function');
			expect(systemComponent.protocolVersionCompatible).to.be.a('function');
			expect(systemComponent.nonceCompatible).to.be.a('function');
			expect(systemComponent.update).to.be.a('function');
		});
	});

	describe('networkCompatible', async () => {
		describe('when there is no nethash', async () => {
			it('should return false', async () =>
				expect(systemComponent.networkCompatible()).to.be.false);
		});
		describe('when nethash is null', async () => {
			it('should return false', async () =>
				expect(systemComponent.networkCompatible(null)).to.be.false);
		});
		describe('when nethash is undefined', async () => {
			it('should return false', async () =>
				expect(systemComponent.networkCompatible(undefined)).to.be.false);
		});
		describe('when nethash is empty string', async () => {
			it('should return false', async () =>
				expect(systemComponent.networkCompatible('')).to.be.false);
		});
		describe('when nethash is not equal to this.headers.nethash', async () => {
			it('should return false', async () =>
				expect(systemComponent.networkCompatible('2')).to.be.false);
		});
		describe('when nethash is equal to this.headers.nethash', async () => {
			it('should return true', async () =>
				expect(systemComponent.networkCompatible(dummyConfig.nethash)).to.be
					.true);
		});
	});

	describe('versionCompatible', async () => {
		describe('when there is no version', async () => {
			it('should return false', async () =>
				expect(systemComponent.versionCompatible()).to.be.false);
		});
		describe('when version is null', async () => {
			it('should return false', async () =>
				expect(systemComponent.versionCompatible(null)).to.be.false);
		});
		describe('when version is undefined', async () => {
			it('should return false', async () =>
				expect(systemComponent.versionCompatible(undefined)).to.be.false);
		});
		describe('when version is empty string', async () => {
			it('should return false', async () =>
				expect(systemComponent.versionCompatible('')).to.be.false);
		});
		describe('when version is equal to system version', async () => {
			it('should return true', async () =>
				expect(systemComponent.versionCompatible('1.0.0-beta.0')).to.be.true);
		});
		describe('when version is greather than system version', async () => {
			it('should return true', async () =>
				expect(systemComponent.versionCompatible('1.0.0-rc.0')).to.be.true);
		});
		describe('when version is less than system version', async () => {
			it('should return false', async () =>
				expect(systemComponent.versionCompatible('1.0.0-alpha.10')).to.be
					.false);
		});
	});

	describe('protocolVersionCompatible', async () => {
		describe('when protocol version is exactly equal to system protocol version', async () => {
			it('should return true', async () =>
				expect(systemComponent.protocolVersionCompatible('1.0')).to.be.true);
		});
		describe('when the hard part of protocol is not exactly equal than the one of the system protocol version', async () => {
			it("should return false if it's greater or lesser", async () =>
				expect(systemComponent.protocolVersionCompatible('2.0')).to.be.false);
			it("should return false if it's lesser", async () =>
				expect(systemComponent.protocolVersionCompatible('0.0')).to.be.false);
		});
		describe('when the hard part of protocol is equal to  the one of the system protocol version', async () => {
			it('should return true', async () =>
				expect(systemComponent.protocolVersionCompatible('1.5')).to.be.true);
		});
		describe('when the hard part of the protocol version is already compatible', async () => {
			beforeEach(done => {
				systemComponent.headers.protocolVersion = '1.1'; // So we can test smaller values for the soft part
				done();
			});

			afterEach(done => {
				systemComponent.headers.protocolVersion = '1.0';
				done();
			});

			it('should return true if the soft part is lesser, equal or greater than the soft part of the system protocol version', async () =>
				['1.0', '1.1', '1.2'].forEach(
					protocolVersion =>
						expect(systemComponent.protocolVersionCompatible(protocolVersion))
							.to.be.true
				));
		});
	});

	describe('nonceCompatible', async () => {
		describe('when there is no nonce', async () => {
			it('should return false', async () =>
				expect(systemComponent.nonceCompatible()).to.be.false);
		});
		describe('when nonce is null', async () => {
			it('should return false', async () =>
				expect(systemComponent.nonceCompatible(null)).to.be.false);
		});
		describe('when nonce is undefined', async () => {
			it('should return false', async () =>
				expect(systemComponent.nonceCompatible(undefined)).to.be.false);
		});
		describe('when nonce is empty string', async () => {
			it('should return false', async () =>
				expect(systemComponent.nonceCompatible('')).to.be.false);
		});
		describe('when nonce is equal to system nonce', async () => {
			it('should return false', async () =>
				expect(systemComponent.nonceCompatible(dummyConfig.nonce)).to.be.false);
		});
		describe('when nonce is different than system nonce', async () => {
			it('should return true', async () =>
				expect(systemComponent.nonceCompatible(`another${dummyConfig.nonce}`))
					.to.be.true);
		});
	});

	/* eslint-disable mocha/no-pending-tests */
	describe('getBroadhash', async () => {
		describe('when argument is a function', async () => {
			it('should call db.query with sql.getBroadhash');

			it('should call db.query with limit = 5');

			describe('when db.query fails', async () => {
				it('should return error');

				it('should call the logger.error with error stack');
			});

			describe('when db.query succeeds', async () => {
				describe('and returns no or one result', async () => {
					it('should return error = null');

					it('should return this.headers.nethash');
				});

				describe('and returns more then one results', async () => {
					it('should call crypto.createHash with sha256');

					it('should call crypto.update with concatenation of results ids');

					it('should call crypto.update with utf-8');

					it('should call crypto.digest');

					it('should return error = null');

					it('should return correct hash');
				});
			});
		});
	});

	describe('update', async () => {
		it('should call getBroadhash with function');

		it(
			'should update this.headers.broadhash when getBroadhash returns no error'
		);

		it(
			'should not update this.headesrs.broadhash when getBroadhash returns an error'
		);

		it('should call modules.blocks.lastBlock.get');

		it(
			'should update this.headeres.height height property of modules.blocks.lastBlock.get result'
		);

		it('should call the logger.debug system headers info');

		it('should call modules.transport.headers with this.headers');

		it('should return resolved promise');

		it('should never return error');
	});
	/* eslint-enable mocha/no-pending-tests */
});
