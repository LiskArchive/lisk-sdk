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

const rewire = require('rewire');

const { EPOCH_TIME } = global.constants;

const Blocks = rewire('../../../../../../src/modules/chain/submodules/blocks');

describe('blocks', () => {
	let blocksInstance;
	let self;
	let library;
	let components;
	let __private;
	let storageStub;
	let loggerStub;
	let logicBlockStub;
	let logicTransactionStub;
	let schemaStub;
	let dbSequenceStub;
	let sequenceStub;
	let peersStub;
	let dummyGenesisblock;
	let accountStub;
	let busStub;
	let balancesSequenceStub;
	let channelStub;
	let scope;

	beforeEach(done => {
		dummyGenesisblock = {
			block: {
				id: '6524861224470851795',
				height: 1,
			},
		};
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
					isPersisted: sinonSandbox.stub().resolves(true),
				},
			},
		};
		logicBlockStub = sinonSandbox.stub();
		logicTransactionStub = sinonSandbox.stub();
		schemaStub = sinonSandbox.stub();
		dbSequenceStub = sinonSandbox.stub();
		sequenceStub = sinonSandbox.stub();
		accountStub = sinonSandbox.stub();
		busStub = sinonSandbox.stub();
		balancesSequenceStub = sinonSandbox.stub();
		channelStub = {
			publish: sinonSandbox.stub(),
		};
		scope = {
			components: { logger: loggerStub, storage: storageStub },
			logic: {
				account: accountStub,
				block: logicBlockStub,
				transaction: logicTransactionStub,
				peers: peersStub,
			},
			channel: channelStub,
			schema: schemaStub,
			dbSequence: dbSequenceStub,
			sequence: sequenceStub,
			genesisBlock: dummyGenesisblock,
			bus: busStub,
			balancesSequence: balancesSequenceStub,
			config: {
				loading: {},
			},
		};

		blocksInstance = new Blocks((err, cbSelf) => {
			expect(err).to.be.undefined;
			self = cbSelf;
			library = Blocks.__get__('library');
			components = Blocks.__get__('components');
			__private = Blocks.__get__('__private');
			done();
		}, scope);
	});

	afterEach(done => {
		sinonSandbox.restore();
		done();
	});

	describe('constructor', () => {
		it('should assign params to library', async () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.channel).to.eql(channelStub);
		});

		it('should instantiate submodules', async () => {
			expect(self.submodules.chain).to.be.an('object');
			expect(self.submodules.process).to.be.an('object');
			expect(self.submodules.utils).to.be.an('object');
			return expect(self.submodules.verify).to.be.an('object');
		});

		it('should assign submodules to this', async () => {
			expect(self.submodules.chain).to.deep.equal(self.chain);
			expect(self.submodules.process).to.deep.equal(self.process);
			expect(self.submodules.utils).to.deep.equal(self.utils);
			return expect(self.submodules.verify).to.deep.equal(self.verify);
		});

		it('should call callback with result = self', async () =>
			expect(self).to.be.deep.equal(blocksInstance));

		describe('when this.submodules.chain.saveGenesisBlock fails', () => {
			it('should call callback with error', done => {
				storageStub.entities.Block.isPersisted.resolves(false);
				blocksInstance = new Blocks((err, cbSelf) => {
					self = cbSelf;
					library = Blocks.__get__('library');
					__private = Blocks.__get__('__private');
					expect(err).to.equal('Blocks#saveGenesisBlock error');
					expect(self.submodules.chain).to.be.an('object');
					expect(self.submodules.process).to.be.an('object');
					expect(self.submodules.utils).to.be.an('object');
					expect(self.submodules.verify).to.be.an('object');
					done();
				}, scope);
			});
		});
	});

	describe('lastBlock', () => {
		beforeEach(done => {
			__private.lastBlock = dummyGenesisblock;
			done();
		});
		describe('get', () => {
			it('should return __private.lastBlock', async () =>
				expect(blocksInstance.lastBlock.get()).to.deep.equal(
					dummyGenesisblock
				));
		});
		describe('set', () => {
			it('should assign input parameter block to __private.lastBlock and return input parameter', async () => {
				expect(blocksInstance.lastBlock.set({ id: 2 })).to.deep.equal({
					id: 2,
				});
				return expect(__private.lastBlock).to.deep.equal({ id: 2 });
			});
		});
		describe('isFresh', () => {
			describe('when __private.lastBlock = undefined', () => {
				beforeEach(done => {
					__private.lastBlock = undefined;
					done();
				});
				it('should return false', async () =>
					expect(blocksInstance.lastBlock.isFresh()).to.be.false);
			});
			describe('when __private.lastBlock exists', () => {
				describe('when secondsAgo < BLOCK_RECEIPT_TIMEOUT', () => {
					beforeEach(done => {
						const timestamp =
							10000 +
							Math.floor(Date.now() / 1000) -
							Math.floor(new Date(EPOCH_TIME) / 1000);
						__private.lastBlock = { timestamp };
						done();
					});
					it('should return true', async () =>
						expect(blocksInstance.lastBlock.isFresh()).to.be.true);
				});
				describe('when secondsAgo >= BLOCK_RECEIPT_TIMEOUT', () => {
					beforeEach(done => {
						__private.lastBlock = { timestamp: 555555 };
						done();
					});
					it('should return false', async () =>
						expect(blocksInstance.lastBlock.isFresh()).to.be.false);
				});
			});
		});
	});

	describe('lastReceipt', () => {
		const dummyLastReceipt = 1520593240;
		beforeEach(done => {
			__private.lastReceipt = dummyLastReceipt;
			done();
		});
		describe('get', () => {
			it('should return __private.lastReceipt', async () =>
				expect(blocksInstance.lastReceipt.get()).to.equal(dummyLastReceipt));
		});
		describe('update', () => {
			it('should assign update __private.lastReceipt with latest time and return new value', async () => {
				expect(blocksInstance.lastReceipt.update()).to.be.above(
					dummyLastReceipt
				);
				return expect(__private.lastReceipt).to.be.above(dummyLastReceipt);
			});
		});
		describe('isStale', () => {
			describe('when __private.lastReceipt is null', () => {
				beforeEach(done => {
					__private.lastBlock = null;
					done();
				});
				it('should return false', async () =>
					expect(blocksInstance.lastReceipt.isStale()).to.be.true);
			});
			describe('when __private.lastReceipt is set', () => {
				describe('when secondsAgo > BLOCK_RECEIPT_TIMEOUT', () => {
					beforeEach(done => {
						__private.lastReceipt = dummyLastReceipt;
						done();
					});
					it('should return true', async () =>
						expect(blocksInstance.lastReceipt.isStale()).to.be.true);
				});
				describe('when secondsAgo <= BLOCK_RECEIPT_TIMEOUT', () => {
					beforeEach(done => {
						__private.lastReceipt = Math.floor(Date.now() / 1000) + 10000;
						done();
					});
					it('should return false', async () =>
						expect(blocksInstance.lastReceipt.isStale()).to.be.false);
				});
			});
		});
	});

	describe('isActive', () => {
		beforeEach(done => {
			__private.isActive = false;
			done();
		});
		describe('get', () => {
			it('should return __private.isActive', async () =>
				expect(blocksInstance.isActive.get()).to.be.false);
		});
		describe('set', () => {
			it('should assign input parameter block to __private.isActive and return input parameter', async () => {
				expect(blocksInstance.isActive.set(true)).to.be.true;
				return expect(__private.isActive).to.be.true;
			});
		});
	});

	describe('isCleaning', () => {
		beforeEach(done => {
			__private.cleanup = false;
			done();
		});
		describe('get', () => {
			it('should return __private.cleanup', async () =>
				expect(blocksInstance.isCleaning.get()).to.be.false);
		});
	});

	describe('onBind', () => {
		it('should set __private.loaded = true', async () => {
			const onBindScope = {};
			blocksInstance.onBind(onBindScope);
			return expect(__private.loaded).to.be.true;
		});

		it('should assign component property', async () =>
			expect(components).to.have.property('cache'));
	});

	describe('onNewBlock', () => {
		const block = { id: 123 };

		describe('when cache is enabled', () => {
			beforeEach(done => {
				blocksInstance = new Blocks(async err => {
					expect(err).to.be.undefined;
					components = Blocks.__get__('components');
					components.cache = {
						removeByPattern: sinonSandbox.stub().resolves(),
						isReady: sinonSandbox.stub().returns(true),
					};
					await blocksInstance.onNewBlock(block);
					done();
				}, scope);
			});

			afterEach(done => {
				components.cache.removeByPattern.reset();
				done();
			});

			it('should call library.channel.publish with "chain:blocks:change" and block data', async () => {
				expect(library.channel.publish).to.be.calledWith(
					'chain:blocks:change',
					block
				);
			});
		});

		describe('when cache is not enabled', () => {
			beforeEach(done => {
				blocksInstance = new Blocks(err => {
					expect(err).to.be.undefined;
					components = Blocks.__get__('components');
					components.cache = undefined;
					blocksInstance.onNewBlock(block);
					done();
				}, scope);
			});

			it('should call library.channel.publish with "chain:blocks:change" and block data', async () => {
				expect(library.channel.publish).to.be.calledWith(
					'chain:blocks:change',
					block
				);
			});
		});
	});

	describe('cleanup', () => {
		afterEach(() => {
			expect(__private.loaded).to.be.false;
			return expect(__private.cleanup).to.be.true;
		});
		describe('when __private.isActive = false', () => {
			beforeEach(done => {
				__private.isActive = false;
				done();
			});
			it('should call callback', done => {
				blocksInstance.cleanup(cb => {
					expect(cb).to.be.undefined;
					done();
				});
			});
		});

		describe('when __private.isActive = true', () => {
			beforeEach(done => {
				__private.isActive = true;
				done();
			});
			describe('after 10 seconds', () => {
				afterEach(() => {
					expect(loggerStub.info.callCount).to.equal(1);
					return expect(loggerStub.info.args[0][0]).to.equal(
						'Waiting for block processing to finish...'
					);
				});
				it('should log info "Waiting for block processing to finish..."', done => {
					setTimeout(() => {
						__private.isActive = false;
					}, 5000);
					blocksInstance.cleanup(cb => {
						expect(cb).to.be.undefined;
						done();
					});
				});
			});

			describe('after 20 seconds', () => {
				afterEach(() => {
					expect(loggerStub.info.callCount).to.equal(2);
					expect(loggerStub.info.args[0][0]).to.equal(
						'Waiting for block processing to finish...'
					);
					return expect(loggerStub.info.args[1][0]).to.equal(
						'Waiting for block processing to finish...'
					);
				});
				it('should log info "Waiting for block processing to finish..." 2 times', done => {
					setTimeout(() => {
						__private.isActive = false;
					}, 15000);
					blocksInstance.cleanup(cb => {
						expect(cb).to.be.undefined;
						done();
					});
				});
			});
		});
	});

	describe('isLoaded', () => {
		beforeEach(done => {
			__private.loaded = true;
			done();
		});
		it('should return __private.loaded', async () => {
			const isLoadedScope = {};
			blocksInstance.onBind(isLoadedScope);
			return expect(__private.loaded).to.be.true;
		});
	});
});
