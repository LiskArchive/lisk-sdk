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

const expect = require('chai').expect;
const async = require('async');
const _ = require('lodash');
const PQ = require('pg-promise').ParameterizedQuery;
const {
	getPrivateAndPublicKeyBytesFromPassphrase,
} = require('@liskhq/lisk-cryptography');
const { Slots } = require('@liskhq/lisk-chain');
const { Rounds } = require('@liskhq/lisk-dpos');
const accountFixtures = require('../../../../fixtures/accounts');
const genesisDelegates = require('../../../data/genesis_delegates.json')
	.delegates;
const localCommon = require('./../../common');

const { ACTIVE_DELEGATES } = global.constants;

describe('integration test (blocks) - process receiveBlockFromNetwork()', () => {
	const slots = new Slots({
		epochTime: __testContext.config.constants.EPOCH_TIME,
		interval: __testContext.config.constants.BLOCK_TIME,
	});

	const rounds = new Rounds({
		blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
	});

	let library;
	let storage;

	localCommon.beforeBlock('blocks_process_on_receive_block', lib => {
		library = lib;
		storage = lib.components.storage;
	});

	afterEach(async () =>
		storage.entities.Block.begin(t => {
			return t.batch([
				storage.adapter.db.none('DELETE FROM blocks WHERE "height" > 1;'),
			]);
		})
			.then(() => {
				library.modules.chain.resetBlockHeaderCache();
				library.modules.chain._lastBlock = __testContext.config.genesisBlock;
			})
			.catch(err => {
				__testContext.debug(err.stack);
			}),
	);

	async function createBlock(
		transactions,
		timestamp,
		keypair,
		previousBlock,
		blockReward,
		maxPayloadLength,
	) {
		const blockProcessorV1 = library.modules.processor.processors[1];
		const block = await blockProcessorV1.create.run({
			keypair,
			timestamp,
			previousBlock,
			transactions,
			blockReward,
			maxPayloadLength,
			maxHeightPreviouslyForged: 1,
			maxHeightPrevoted: 1,
		});

		return block;
	}

	function getKeypair(passphrase) {
		const {
			publicKeyBytes: publicKey,
			privateKeyBytes: privateKey,
		} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);

		return {
			publicKey,
			privateKey,
		};
	}

	function forge(forgingSlot, cb) {
		let last_block = library.modules.chain.lastBlock;
		const slot = forgingSlot || slots.getSlotNumber(last_block.timestamp) + 1;
		let delegate;

		function getNextForger(offset, seriesCb) {
			offset = !offset ? 0 : offset;
			const round = rounds.calcRound(last_block.height + 1);
			library.modules.dpos
				.getForgerPublicKeysForRound(round)
				.then(delegateList => {
					const nextForger = delegateList[(slot + offset) % ACTIVE_DELEGATES];
					return seriesCb(nextForger);
				});
		}

		async.waterfall(
			[
				function(waterFallCb) {
					library.modules.transactionPool.fillPool().then(() => waterFallCb());
				},
				function(waterFallCb) {
					getNextForger(null, delegatePublicKey => {
						waterFallCb(null, delegatePublicKey);
					});
				},
				function(delegatePublicKey, waterFallCb) {
					delegate = _.find(genesisDelegates, foundDelegate => {
						return foundDelegate.publicKey === delegatePublicKey;
					});
					const keypair = getKeypair(delegate.passphrase);

					__testContext.debug(
						`Last block version: ${last_block.version}
						Last block height: ${last_block.height}
						Last block ID: ${last_block.id}
						Last block timestamp: ${last_block.timestamp}
						Next slot: ${slot}
						Next delegate public key: ${delegatePublicKey}
						Next block timestamp: ${slots.getSlotTime(slot)}`,
					);
					const transactions =
						library.modules.transactionPool.getUnconfirmedTransactionList(
							false,
							25,
						) || [];

					const blockProcessorV1 = library.modules.processor.processors[1];
					blockProcessorV1.create
						.run({
							keypair,
							timestamp: slots.getSlotTime(slot) + 5,
							transactions,
							previousBlock: library.modules.chain.lastBlock,
						})
						.then(block => library.modules.processor.process(block))
						.then(() => {
							last_block = library.modules.chain.lastBlock;
							__testContext.debug(
								`New last block height: ${last_block.height} New last block ID: ${last_block.id}`,
							);
							return waterFallCb();
						})
						.catch(err => waterFallCb(err));
				},
			],
			err => {
				cb(err, last_block);
			},
		);
	}

	function getValidKeypairForSlot(slot) {
		const lastBlock = library.modules.chain.lastBlock;
		const round = rounds.calcRound(lastBlock.height);

		return library.modules.dpos
			.getForgerPublicKeysForRound(round)
			.then(list => {
				const delegatePublicKey = list[slot % ACTIVE_DELEGATES];
				return getKeypair(
					_.find(genesisDelegates, delegate => {
						return delegate.publicKey === delegatePublicKey;
					}).passphrase,
				);
			})
			.catch(err => {
				throw err;
			});
	}

	function getBlocks(cb) {
		library.sequence
			.add(async () => {
				const rows = storage.adapter.db.query(
					new PQ('SELECT "id" FROM blocks ORDER BY "height" DESC LIMIT 10;'),
				);
				return rows.map(r => r.id);
			})
			.then(ids => cb(null, ids))
			.catch(err => {
				__testContext.debug(err.stack);
				cb(err);
			});
	}

	describe('receiveBlockFromNetwork (empty transactions)', () => {
		describe('for valid block', () => {
			let lastBlock;
			let block;

			before(async () => {
				lastBlock = library.modules.chain.lastBlock;
				const slot = slots.getSlotNumber();
				const keypair = await getValidKeypairForSlot(slot);
				block = await createBlock(
					[],
					slots.getSlotTime(slot),
					keypair,
					lastBlock,
					library.modules.chain.blockReward,
					library.modules.chain.constants.maxPayloadLength,
				);
			});

			it('should add block to blockchain', done => {
				library.modules.processor.process(block).then(() => {
					getBlocks((err, blockIds) => {
						expect(err).to.not.exist;
						expect(blockIds).to.have.length(2);
						expect(blockIds).to.include.members([block.id, lastBlock.id]);
						done();
					});
				});
			});
		});

		describe('forkThree', () => {
			describe('validate block slot', () => {
				describe('when generator is not a delegate', () => {
					let lastBlock;
					let block;

					beforeEach(async () => {
						lastBlock = library.modules.chain.lastBlock;
						const slot = slots.getSlotNumber();
						const nonDelegateKeypair = getKeypair(
							accountFixtures.genesis.passphrase,
						);
						block = await createBlock(
							[],
							slots.getSlotTime(slot),
							nonDelegateKeypair,
							lastBlock,
							library.modules.chain.blockReward,
							library.modules.chain.constants.maxPayloadLength,
						);
					});

					it('should not add block to blockchain', done => {
						library.modules.processor.process(block).catch(() => {
							getBlocks((err, blockIds) => {
								expect(err).to.not.exist;
								expect(blockIds).to.have.length(1);
								expect(blockIds).to.include.members([lastBlock.id]);
								done();
							});
						});
					});
				});

				describe('when block generator has incorrect slot', () => {
					let lastBlock;
					let block;

					beforeEach(async () => {
						lastBlock = library.modules.chain.lastBlock;
						// Using last block's slot
						const slot = slots.getSlotNumber() - 1;
						const keypair = await getValidKeypairForSlot(slot - 1);
						block = await createBlock(
							[],
							slots.getEpochTime(),
							keypair,
							lastBlock,
							library.modules.chain.blockReward,
							library.modules.chain.constants.maxPayloadLength,
						);
					});

					it('should not add block to blockchain', done => {
						library.modules.processor.process(block).catch(() => {
							getBlocks((err, blockIds) => {
								expect(err).to.not.exist;
								expect(blockIds).to.have.length(1);
								expect(blockIds).to.include.members([lastBlock.id]);
								done();
							});
						});
					});
				});
			});
		});

		describe('discard blocks', () => {
			describe('when block is already processed', () => {
				let lastBlock;
				let block;

				beforeEach(done => {
					lastBlock = library.modules.chain.lastBlock;
					forge(null, (err, forgedBlock) => {
						block = forgedBlock;
						done();
					});
				});

				it('should reject received block', done => {
					library.modules.processor.process(block).then(() => {
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(2);
							expect(blockIds).to.include.members([block.id, lastBlock.id]);
							done();
						});
					});
				});
			});

			describe('when block does not match blockchain', () => {
				let differentChainBlock;

				beforeEach(done => {
					const dummyLastBlock = {
						version: 1,
						height: 11,
						id: '14723131253653198332',
					};

					const keypair = getKeypair(genesisDelegates[0].passphrase);
					differentChainBlock = createBlock(
						[],
						slots.getSlotTime(10),
						keypair,
						dummyLastBlock,
						library.modules.chain.blockReward,
						library.modules.chain.constants.maxPayloadLength,
					);
					done();
				});

				it('should reject received block', done => {
					library.modules.processor.process(differentChainBlock).catch(() => {
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(1);
							expect(blockIds).to.not.include(differentChainBlock.id);
							expect(blockIds).to.include.members([
								__testContext.config.genesisBlock.id,
							]);
							done();
						});
					});
				});
			});
		});
	});
});
