/* eslint-disable mocha/no-pending-tests */
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

const System = rewire('../../../modules/system.js');

describe('system', () => {
	let systemModule;
	let library;
	let __private;
	let self;
	let loggerStub;
	let dbStub;
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

		dbStub = sinonSandbox.stub();

		dummyConfig = {
			version: '1.0.0-beta.3',
			wsPort: 1,
			httpPort: 1,
			nethash: 1,
			minVersion: '1.0.0-beta.0',
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
				db: dbStub,
				config: dummyConfig,
			}
		);
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.db).to.eql(dbStub);
			return expect(library.config).to.deep.equal(dummyConfig);
		});

		it('should assign params to __private', () => {
			expect(__private.os).to.eql(os.platform() + os.release());
			expect(__private.version).to.eql(dummyConfig.version);
			expect(__private.wsPort).to.eql(dummyConfig.wsPort);
			expect(__private.httpPort).to.eql(dummyConfig.httpPort);
			expect(__private.height).to.eql(1);
			expect(__private.nethash).to.eql(dummyConfig.nethash);
			expect(__private.broadhash).to.eql(dummyConfig.nethash);
			expect(__private.minVersion).to.eql(dummyConfig.minVersion);
			return expect(__private.nonce).to.eql(dummyConfig.nonce);
		});

		it('should return self', () => {
			expect(self).to.be.an('object');
			expect(self.headers).to.be.a('function');
			expect(self.getOS).to.be.a('function');
			expect(self.getVersion).to.be.a('function');
			expect(self.getPort).to.be.a('function');
			expect(self.getHeight).to.be.a('function');
			expect(self.getNethash).to.be.a('function');
			expect(self.getNonce).to.be.a('function');
			expect(self.getBroadhash).to.be.a('function');
			expect(self.getMinVersion).to.be.a('function');
			expect(self.networkCompatible).to.be.a('function');
			expect(self.versionCompatible).to.be.a('function');
			expect(self.nonceCompatible).to.be.a('function');
			expect(self.update).to.be.a('function');
			return expect(self.onBind).to.be.a('function');
		});
	});

	describe('static', () => {
		describe('setHeaders', () => {
			it('should assign the argument to __private');
		});

		describe('getHeaders', () => {
			it('should return __private');
		});
	});

	describe('getOS', () => {
		it('should __private.os');
	});

	describe('getVersion', () => {
		it('should __private.version');
	});

	describe('getPort', () => {
		it('should __private.wsPort');
	});

	describe('getHeight', () => {
		it('should __private.height');
	});

	describe('getNethash', () => {
		it('should __private.nethash');
	});

	describe('getNonce', () => {
		it('should __private.nonce');
	});

	describe('getBroadhash', () => {
		describe('when argument is not a function', () => {
			it('should __private.broadhash');
		});

		describe('when argument is a function', () => {
			it('should call db.query with sql.getBroadhash');

			it('should call db.query with limit = 5');

			describe('when db.query fails', () => {
				it('should call callback with error');

				it('should call the logger.error with error stack');
			});

			describe('when db.query succeeds', () => {
				describe('and returns no or one result', () => {
					it('should call callback with error = null');

					it('should call callback with __private.nethash');
				});

				describe('and returns more then one results', () => {
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

	describe('getMinVersion', () => {
		it('should __private.minVersion');
	});

	describe('networkCompatible', () => {
		it('should return true if argument is equal to __private.nethash');

		it('should return false if argument is not equal to __private.nethash');
	});

	describe('versionCompatible', () => {
		describe('when version is equal to system version', () => {
			it('should return true', () => {
				return expect(systemModule.versionCompatible('1.0.0-beta.0')).to.be
					.true;
			});
		});
		describe('when version is greather than system version', () => {
			it('should return true', () => {
				return expect(systemModule.versionCompatible('1.0.0-rc.0')).to.be.true;
			});
		});
		describe('when version is less than system version', () => {
			it('should return false', () => {
				return expect(systemModule.versionCompatible('1.0.0-alpha.10')).to.be
					.false;
			});
		});
	});

	describe('nonceCompatible', () => {
		it('should return if nonce exists and is different than the system nonce');

		it('should return false if nonce does not exist');

		it('should return false if nonce exists and is equal to the system nonce');
	});

	describe('update', () => {
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

	describe('onBind', () => {
		describe('modules', () => {
			it('should assign blocks');

			it('should assign transport');
		});
	});
});
