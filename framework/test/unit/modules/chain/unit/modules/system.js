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

const os = require('os');
const rewire = require('rewire');

const System = rewire('../../../../../../src/modules/chain/modules/system.js');

describe('system', async () => {
	let systemModule;
	let library;
	let __private;
	let self;
	let loggerStub;
	let storageStub;
	let dummyConfig;

	beforeEach(done => {
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
			version: '1.0.0-beta.3',
			wsPort: 1,
			httpPort: 1,
			nethash: 1,
			minVersion: '1.0.0-beta.0',
			protocolVersion: '1.0',
			nonce: 1,
		};

		systemModule = new System(
			(err, cbSelf) => {
				library = System.__get__('library');
				__private = System.__get__('__private');
				self = cbSelf;
				expect(err).to.be.null;
				done();
			},
			{
				logger: loggerStub,
				storage: storageStub,
				config: dummyConfig,
			}
		);
	});

	describe('constructor', async () => {
		it('should assign params to library', async () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.storage).to.eql(storageStub);
			return expect(library.config).to.deep.equal(dummyConfig);
		});

		it('should assign params to __private', async () => {
			expect(__private.os).to.eql(os.platform() + os.release());
			expect(__private.version).to.eql(dummyConfig.version);
			expect(__private.wsPort).to.eql(dummyConfig.wsPort);
			expect(__private.httpPort).to.eql(dummyConfig.httpPort);
			expect(__private.height).to.eql(1);
			expect(__private.nethash).to.eql(dummyConfig.nethash);
			expect(__private.broadhash).to.eql(dummyConfig.nethash);
			expect(__private.minVersion).to.eql(dummyConfig.minVersion);
			expect(__private.protocolVersion).to.eql(dummyConfig.protocolVersion);
			return expect(__private.nonce).to.eql(dummyConfig.nonce);
		});

		it('should return self', async () => {
			expect(self).to.be.an('object');
			expect(self.headers).to.be.an('object');
			expect(self.getBroadhash).to.be.a('function');
			expect(self.networkCompatible).to.be.a('function');
			expect(self.versionCompatible).to.be.a('function');
			expect(self.protocolVersionCompatible).to.be.a('function');
			expect(self.nonceCompatible).to.be.a('function');
			return expect(self.update).to.be.a('function');
		});
	});

	/* eslint-disable mocha/no-pending-tests */
	describe('getBroadhash', async () => {
		describe('when argument is not a function', async () => {
			it('should __private.broadhash');
		});

		describe('when argument is a function', async () => {
			it('should call db.query with sql.getBroadhash');

			it('should call db.query with limit = 5');

			describe('when db.query fails', async () => {
				it('should call callback with error');

				it('should call the logger.error with error stack');
			});

			describe('when db.query succeeds', async () => {
				describe('and returns no or one result', async () => {
					it('should call callback with error = null');

					it('should call callback with __private.nethash');
				});

				describe('and returns more then one results', async () => {
					it('should call crypto.createHash with sha256');

					it('should call crypto.update with concatenation of results ids');

					it('should call crypto.update with utf-8');

					it('should call crypto.digest');

					it('should call callback with error = null');

					it('should call callback with the hash');
				});
			});
		});
	});

	describe('networkCompatible', async () => {
		it('should return true if argument is equal to __private.nethash');

		it('should return false if argument is not equal to __private.nethash');
	});
	/* eslint-enable mocha/no-pending-tests */

	describe('versionCompatible', async () => {
		describe('when version is equal to system version', async () => {
			it('should return true', async () =>
				expect(systemModule.versionCompatible('1.0.0-beta.0')).to.be.true);
		});
		describe('when version is greather than system version', async () => {
			it('should return true', async () =>
				expect(systemModule.versionCompatible('1.0.0-rc.0')).to.be.true);
		});
		describe('when version is less than system version', async () => {
			it('should return false', async () =>
				expect(systemModule.versionCompatible('1.0.0-alpha.10')).to.be.false);
		});
	});

	describe('protocolVersionCompatible', async () => {
		describe('when protocol version is exactly equal to system protocol version', async () => {
			it('should return true', async () =>
				expect(systemModule.protocolVersionCompatible('1.0')).to.be.true);
		});
		describe('when the hard part of protocol is not exactly equal than the one of the system protocol version', async () => {
			it("should return false if it's greater or lesser", async () =>
				expect(systemModule.protocolVersionCompatible('2.0')).to.be.false);
			it("should return false if it's lesser", async () =>
				expect(systemModule.protocolVersionCompatible('0.0')).to.be.false);
		});
		describe('when the hard part of protocol is equal to  the one of the system protocol version', async () => {
			it('should return true', async () =>
				expect(systemModule.protocolVersionCompatible('1.5')).to.be.true);
		});
		describe('when the hard part of the protocol version is already compatible', async () => {
			beforeEach(done => {
				__private.protocolVersion = '1.1'; // So we can test smaller values for the soft part
				done();
			});

			afterEach(done => {
				__private.protocolVersion = '1.0';
				done();
			});

			it('should return true if the soft part is lesser, equal or greater than the soft part of the system protocol version', async () =>
				['1.0', '1.1', '1.2'].forEach(
					protocolVersion =>
						expect(systemModule.protocolVersionCompatible(protocolVersion)).to
							.be.true
				));
		});
	});

	/* eslint-disable mocha/no-pending-tests */
	describe('nonceCompatible', async () => {
		it('should return if nonce exists and is different than the system nonce');

		it('should return false if nonce does not exist');

		it('should return false if nonce exists and is equal to the system nonce');
	});

	describe('update', async () => {
		it('should call getBroadhash with function');

		it('should update __private.broadhash when getBroadhash returns no error');

		it(
			'should not update __private.broadhash when getBroadhash returns an error'
		);

		it('should call modules.blocks.lastBlock.get');

		it(
			'should update __private.height height property of modules.blocks.lastBlock.get result'
		);

		it('should call the logger.debug system headers info');

		it('should call modules.transport.headers with __private');

		it('should call callback');

		it('should never call callback with an error');
	});

	describe('onBind', async () => {
		describe('modules', async () => {
			it('should assign blocks');

			it('should assign transport');
		});
	});
	/* eslint-enable mocha/no-pending-tests */
});
