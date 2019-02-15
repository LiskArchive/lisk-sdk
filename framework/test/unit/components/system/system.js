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
const crypto = require('crypto');

const { createSystemComponent } = require('../../../../src/components/system');

describe('components: system', () => {
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

		storageStub = {
			entities: {
				Block: {
					get: sinonSandbox.stub(),
				},
			},
		};

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

	describe('constructor', () => {
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
			expect(systemComponent.networkCompatible).to.be.a('function');
			expect(systemComponent.versionCompatible).to.be.a('function');
			expect(systemComponent.protocolVersionCompatible).to.be.a('function');
			expect(systemComponent.nonceCompatible).to.be.a('function');
			expect(systemComponent.update).to.be.a('function');
		});
	});

	describe('networkCompatible', () => {
		describe('when there is no nethash', () => {
			it('should return false', async () =>
				expect(systemComponent.networkCompatible()).to.be.false);
		});
		describe('when nethash is null', () => {
			it('should return false', async () =>
				expect(systemComponent.networkCompatible(null)).to.be.false);
		});
		describe('when nethash is undefined', () => {
			it('should return false', async () =>
				expect(systemComponent.networkCompatible(undefined)).to.be.false);
		});
		describe('when nethash is empty string', () => {
			it('should return false', async () =>
				expect(systemComponent.networkCompatible('')).to.be.false);
		});
		describe('when nethash is not equal to this.headers.nethash', () => {
			it('should return false', async () =>
				expect(systemComponent.networkCompatible('2')).to.be.false);
		});
		describe('when nethash is equal to this.headers.nethash', () => {
			it('should return true', async () =>
				expect(systemComponent.networkCompatible(dummyConfig.nethash)).to.be
					.true);
		});
	});

	describe('versionCompatible', () => {
		describe('when there is no version', () => {
			it('should return false', async () =>
				expect(systemComponent.versionCompatible()).to.be.false);
		});
		describe('when version is null', () => {
			it('should return false', async () =>
				expect(systemComponent.versionCompatible(null)).to.be.false);
		});
		describe('when version is undefined', () => {
			it('should return false', async () =>
				expect(systemComponent.versionCompatible(undefined)).to.be.false);
		});
		describe('when version is empty string', () => {
			it('should return false', async () =>
				expect(systemComponent.versionCompatible('')).to.be.false);
		});
		describe('when version is equal to system version', () => {
			it('should return true', async () =>
				expect(systemComponent.versionCompatible('1.0.0-beta.0')).to.be.true);
		});
		describe('when version is greather than system version', () => {
			it('should return true', async () =>
				expect(systemComponent.versionCompatible('1.0.0-rc.0')).to.be.true);
		});
		describe('when version is less than system version', () => {
			it('should return false', async () =>
				expect(systemComponent.versionCompatible('1.0.0-alpha.10')).to.be
					.false);
		});
	});

	describe('protocolVersionCompatible', () => {
		describe('when protocol version is exactly equal to system protocol version', () => {
			it('should return true', async () =>
				expect(systemComponent.protocolVersionCompatible('1.0')).to.be.true);
		});
		describe('when the hard part of protocol is not exactly equal than the one of the system protocol version', () => {
			it("should return false if it's greater or lesser", async () =>
				expect(systemComponent.protocolVersionCompatible('2.0')).to.be.false);
			it("should return false if it's lesser", async () =>
				expect(systemComponent.protocolVersionCompatible('0.0')).to.be.false);
		});
		describe('when the hard part of protocol is equal to  the one of the system protocol version', () => {
			it('should return true', async () =>
				expect(systemComponent.protocolVersionCompatible('1.5')).to.be.true);
		});
		describe('when the hard part of the protocol version is already compatible', () => {
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

	describe('nonceCompatible', () => {
		describe('when there is no nonce', () => {
			it('should return false', async () =>
				expect(systemComponent.nonceCompatible()).to.be.false);
		});
		describe('when nonce is null', () => {
			it('should return false', async () =>
				expect(systemComponent.nonceCompatible(null)).to.be.false);
		});
		describe('when nonce is undefined', () => {
			it('should return false', async () =>
				expect(systemComponent.nonceCompatible(undefined)).to.be.false);
		});
		describe('when nonce is empty string', () => {
			it('should return false', async () =>
				expect(systemComponent.nonceCompatible('')).to.be.false);
		});
		describe('when nonce is equal to system nonce', () => {
			it('should return false', async () =>
				expect(systemComponent.nonceCompatible(dummyConfig.nonce)).to.be.false);
		});
		describe('when nonce is different than system nonce', () => {
			it('should return true', async () =>
				expect(systemComponent.nonceCompatible(`another${dummyConfig.nonce}`))
					.to.be.true);
		});
	});

	describe('update', () => {
		afterEach(async () => {
			storageStub.entities.Block.get.reset();
		});

		it('should call storage.entities.Block.get with limit = 5 and sort height:asc', done => {
			const blocks = [
				{
					id: '00000002',
					height: 2,
				},
				{
					id: '00000001',
					height: 1,
				},
			];
			const args = {
				limit: 5,
				sort: 'height:desc',
			};
			storageStub.entities.Block.get.resolves(blocks);
			systemComponent.update(error => {
				expect(error).to.be.undefined;
				expect(storageStub.entities.Block.get.calledOnce).to.be.true;
				expect(storageStub.entities.Block.get.args[0][1]).to.eql(args);
				done();
			});
		});

		describe('when storage.entities.Block.get fails', () => {
			const err = {
				stack: 'my stack',
			};
			beforeEach(async () => {
				storageStub.entities.Block.get.rejects(err);
			});
			it('should return error', done => {
				systemComponent.update(error => {
					expect(error).to.have.property('stack');
					expect(error.stack).to.equal(err.stack);
					done();
				});
			});
			it('should not update this.headesrs.broadhash', done => {
				systemComponent.update(error => {
					expect(error).to.eql(err);
					expect(systemComponent.headers.broadhash).to.equal(
						dummyConfig.nethash
					);
					done();
				});
			});
			it('should not update this.headesrs.height', done => {
				systemComponent.update(error => {
					expect(error).to.eql(err);
					expect(systemComponent.headers.height).to.equal(dummyConfig.height);
					done();
				});
			});
			it('should call the logger.error with error stack', done => {
				systemComponent.update(error => {
					expect(error).to.eql(err);
					expect(loggerStub.error.called).to.be.true;
					expect(loggerStub.error.args[0][0]).to.eql(err.stack);
					done();
				});
			});
		});

		describe('when storage.entities.Block.get succeeds', () => {
			describe('when returns no result', () => {
				beforeEach(async () => {
					storageStub.entities.Block.get.resolves([]);
				});

				it('should not return error', done => {
					systemComponent.update(error => {
						expect(error).to.be.undefined;
						done();
					});
				});

				it('should update this.headers.broadhash property to this.headers.nethash', done => {
					systemComponent.update(() => {
						expect(systemComponent.headers.broadhash).to.equal(
							systemComponent.headers.nethash
						);
						done();
					});
				});
			});

			describe('when returns one result', () => {
				beforeEach(async () => {
					const blocks = [
						{
							id: '00000002',
							height: 2,
						},
						{
							id: '00000001',
							height: 1,
						},
					];
					storageStub.entities.Block.get.resolves(blocks.splice(-1, 1));
				});

				it('should not return error', done => {
					systemComponent.update(error => {
						expect(error).to.be.undefined;
						done();
					});
				});

				it('should update this.headers.broadhash property to this.headers.nethash', done => {
					systemComponent.update(() => {
						expect(systemComponent.headers.broadhash).to.equal(
							systemComponent.headers.nethash
						);
						done();
					});
				});
			});

			describe('when returns more than one results', () => {
				const blocks = [
					{
						id: '00000002',
						height: 2,
					},
					{
						id: '00000001',
						height: 1,
					},
				];

				beforeEach(async () => {
					storageStub.entities.Block.get.resolves(blocks);
				});

				it('should not return error', done => {
					systemComponent.update(error => {
						expect(error).to.be.undefined;
						done();
					});
				});

				it('should update this.headers.broadhash property to the just calculated broadhash', done => {
					systemComponent.update(error => {
						const seed = blocks.map(row => row.id).join('');
						const newBroadhash = crypto
							.createHash('sha256')
							.update(seed, 'utf8')
							.digest()
							.toString('hex');
						expect(error).to.be.undefined;
						expect(systemComponent.headers.broadhash).to.equal(newBroadhash);
						done();
					});
				});

				it('should update this.headers.height property to the best height', done => {
					systemComponent.update(error => {
						expect(error).to.be.undefined;
						expect(systemComponent.headers.height).to.equal(blocks[0].height);
						done();
					});
				});

				it('should call the logger.debug system headers info', done => {
					systemComponent.update(error => {
						expect(error).to.be.undefined;
						expect(loggerStub.debug.called).to.be.true;
						expect(loggerStub.debug.args[0][0]).to.equal('System headers');
						expect(loggerStub.debug.args[0][1]).to.eql(systemComponent.headers);
						done();
					});
				});
			});
		});
	});
});
