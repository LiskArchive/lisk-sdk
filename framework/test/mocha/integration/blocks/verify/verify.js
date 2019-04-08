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

const crypto = require('crypto');
const { transfer } = require('@liskhq/lisk-transactions');
const _ = require('lodash');
const rewire = require('rewire');
const async = require('async');
const Promise = require('bluebird');
const Bignum = require('../../../../../src/modules/chain/helpers/bignum');
const application = require('../../../common/application');
const { clearDatabaseTable } = require('../../../common/storage_sandbox');
const modulesLoader = require('../../../common/modules_loader');
const random = require('../../../common/utils/random');
const slots = require('../../../../../src/modules/chain/helpers/slots');
const accountFixtures = require('../../../fixtures/accounts');
const genesisDelegates = require('../../../data/genesis_delegates.json')
	.delegates;
const blockVersion = require('../../../../../src/modules/chain/logic/block_version');

const { ACTIVE_DELEGATES, BLOCK_SLOT_WINDOW, NORMALIZER } = global.constants;
const genesisBlock = __testContext.config.genesisBlock;

const previousBlock = {
	blockSignature:
		'696f78bed4d02faae05224db64e964195c39f715471ebf416b260bc01fa0148f3bddf559127b2725c222b01cededb37c7652293eb1a81affe2acdc570266b501',
	generatorPublicKey:
		'86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
	height: 488,
	id: '11850828211026019525',
	numberOfTransactions: 0,
	payloadHash:
		'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	payloadLength: 0,
	previousBlock: '8805727971083409014',
	relays: 1,
	reward: 0,
	timestamp: 32578360,
	totalAmount: 0,
	totalFee: 0,
	transactions: [],
	version: 0,
};

const validBlock = {
	blockSignature:
		'56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
	generatorPublicKey:
		'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
	numberOfTransactions: 2,
	payloadHash:
		'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
	payloadLength: 494,
	height: 489,
	previousBlock: '11850828211026019525',
	reward: 0,
	timestamp: 32578370,
	totalAmount: 10000000000000000,
	totalFee: 0,
	transactions: [
		{
			type: 0,
			amount: 10000000000000000,
			fee: 0,
			timestamp: 0,
			recipientId: '16313739661670634666L',
			senderId: '1085993630748340485L',
			senderPublicKey:
				'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			signature:
				'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
			id: '1465651642158264047',
		},
		{
			type: 3,
			amount: 0,
			fee: 0,
			timestamp: 0,
			recipientId: '16313739661670634666L',
			senderId: '16313739661670634666L',
			senderPublicKey:
				'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			asset: {
				votes: [
					'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					'-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					'-5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819',
				],
			},
			signature:
				'9f9446b527e93f81d3fb8840b02fcd1454e2b6276d3c19bd724033a01d3121dd2edb0aff61d48fad29091e222249754e8ec541132032aefaeebc312796f69e08',
			id: '9314232245035524467',
		},
	],
	version: 0,
	id: '884740302254229983',
};

const testAccount = {
	account: {
		username: 'test_verify',
		isDelegate: 1,
		address: '2737453412992791987L',
		publicKey:
			'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		balance: 5300000000000000000,
	},
	passphrase:
		'message crash glance horror pear opera hedgehog monitor connect vague chuckle advice',
};

let block1;

let block2;

function createBlock(
	blocksModule,
	blockLogic,
	passphrase,
	timestamp,
	transactions,
	previousBlockArgs
) {
	random.convertToBignum(transactions);
	const keypair = blockLogic.scope.ed.makeKeypair(
		crypto
			.createHash('sha256')
			.update(passphrase, 'utf8')
			.digest()
	);
	blocksModule.lastBlock.set(previousBlockArgs);
	const newBlock = blockLogic.create({
		keypair,
		timestamp,
		previousBlock: blocksModule.lastBlock.get(),
		transactions,
	});

	// newBlock.id = blockLogic.getId(newBlock);
	return newBlock;
}

function getValidKeypairForSlot(library, slot) {
	const generateDelegateListPromisified = Promise.promisify(
		library.modules.delegates.generateDelegateList
	);
	const lastBlock = genesisBlock;
	const round = slots.calcRound(lastBlock.height);

	return generateDelegateListPromisified(round, null)
		.then(list => {
			const delegatePublicKey = list[slot % ACTIVE_DELEGATES];
			const passphrase = _.find(genesisDelegates, delegate => {
				return delegate.publicKey === delegatePublicKey;
			}).passphrase;
			return passphrase;
		})
		.catch(err => {
			throw err;
		});
}

describe('blocks/verify', () => {
	let library;
	let accounts;
	let blocksVerify;
	let blocks;
	let blockLogic;
	let delegates;
	let storage;
	let results;

	before(done => {
		application.init(
			{
				sandbox: {
					name: 'blocks_verify',
				},
			},
			(err, scope) => {
				accounts = scope.modules.accounts;
				blocksVerify = scope.modules.blocks.verify;
				blockLogic = scope.logic.block;
				blocks = scope.modules.blocks;
				delegates = scope.modules.delegates;
				storage = scope.components.storage;

				// Set current block version to 0
				blockVersion.currentBlockVersion = 0;

				library = scope;
				library.modules.blocks.lastBlock.set(genesisBlock);
				// Bus gets overwritten - waiting for mem_accounts has to be done manually
				setTimeout(done, 5000);
			}
		);
	});

	afterEach(() => {
		library.modules.blocks.lastBlock.set(genesisBlock);
		return storage.adapter.db.none('DELETE FROM blocks WHERE height > 1');
	});

	beforeEach(done => {
		results = {
			verified: true,
			errors: [],
		};
		done();
	});

	after(done => {
		application.cleanup(done);
	});

	describe('__private', () => {
		let privateFunctions;
		let RewiredVerify;

		before(done => {
			RewiredVerify = rewire(
				'../../../../../src/modules/chain/submodules/blocks/verify'
			);
			const verify = new RewiredVerify(
				library.components.logger,
				library.logic.block,
				library.logic.transaction,
				library.components.storage,
				library.config
			);
			verify.onBind({
				components: library.components,
				modules: library.modules,
			});
			privateFunctions = RewiredVerify.__get__('__private');
			done();
		});

		beforeEach(done => {
			results = {
				verified: true,
				errors: [],
			};
			done();
		});

		describe('verifySignature', () => {
			it('should fail when blockSignature property is not a hex string', done => {
				const blockSignature = validBlock.blockSignature;
				validBlock.blockSignature = 'invalidBlockSignature';

				const result = privateFunctions.verifySignature(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(2);

				expect(result.errors[0]).to.equal(
					'TypeError: Argument must be a valid hex string.'
				);
				expect(result.errors[1]).to.equal('Failed to verify block signature');

				validBlock.blockSignature = blockSignature;
				done();
			});

			it('should fail when blockSignature property is an invalid hex string', done => {
				const blockSignature = validBlock.blockSignature;
				validBlock.blockSignature =
					'bfaaabdc8612e177f1337d225a8a5af18cf2534f9e41b66c114850aa50ca2ea2621c4b2d34c4a8b62ea7d043e854c8ae3891113543f84f437e9d3c9cb24c0e05';

				const result = privateFunctions.verifySignature(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal('Failed to verify block signature');

				validBlock.blockSignature = blockSignature;
				done();
			});

			it('should fail when generatorPublicKey property is not a hex string', done => {
				const generatorPublicKey = validBlock.generatorPublicKey;
				validBlock.generatorPublicKey = 'invalidBlockSignature';

				const result = privateFunctions.verifySignature(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(2);
				expect(result.errors[0]).to.equal(
					'TypeError: Argument must be a valid hex string.'
				);
				expect(result.errors[1]).to.equal('Failed to verify block signature');

				validBlock.generatorPublicKey = generatorPublicKey;
				done();
			});

			it('should fail when generatorPublicKey property is an invalid hex string', done => {
				const generatorPublicKey = validBlock.generatorPublicKey;
				validBlock.generatorPublicKey =
					'948b8b509579306694c00db2206ddb1517bfeca2b0dc833ec1c0f81e9644871b';

				const result = privateFunctions.verifySignature(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal('Failed to verify block signature');

				validBlock.generatorPublicKey = generatorPublicKey;
				done();
			});
		});

		describe('verifyPreviousBlock', () => {
			it('should fail when previousBlock property is missing', done => {
				const auxPreviousBlock = validBlock.previousBlock;
				delete validBlock.previousBlock;

				const result = privateFunctions.verifyPreviousBlock(
					validBlock,
					results
				);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid previous block');

				validBlock.previousBlock = auxPreviousBlock;
				done();
			});
		});

		describe('verifyVersion', () => {
			it('should fail when block version != 0', done => {
				const version = validBlock.version;
				validBlock.version = 1;

				const result = privateFunctions.verifyVersion(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid block version');

				validBlock.version = version;
				done();
			});
		});

		describe('verifyReward', () => {
			it('should fail when block reward = 99 instead of 0', done => {
				validBlock.reward = 99;

				const result = privateFunctions.verifyReward(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal(
					['Invalid block reward:', 99, 'expected:', 0].join(' ')
				);

				validBlock.reward = 0;
				done();
			});
		});

		/* eslint-disable mocha/no-skipped-tests */
		describe.skip('verifyId', () => {
			it('should reset block id when block id is an invalid alpha-numeric string value', async () => {
				const blockId = '884740302254229983';
				validBlock.id = 'invalid-block-id';

				expect(validBlock.id).to.equal(blockId);
				return expect(validBlock.id).to.not.equal('invalid-block-id');
			});

			it('should reset block id when block id is an invalid numeric string value', async () => {
				const blockId = '884740302254229983';
				validBlock.id = '11850828211026019526';

				expect(validBlock.id).to.equal(blockId);
				return expect(validBlock.id).to.not.equal('11850828211026019526');
			});

			it('should reset block id when block id is an invalid integer value', async () => {
				const blockId = '884740302254229983';
				validBlock.id = 11850828211026019526;

				expect(validBlock.id).to.equal(blockId);
				return expect(validBlock.id).to.not.equal(11850828211026019526);
			});

			it('should reset block id when block id is a valid integer value', async () => {
				const blockId = '884740302254229983';
				validBlock.id = 11850828211026019525;
				expect(validBlock.id).to.equal(blockId);
				return expect(validBlock.id).to.not.equal(11850828211026019525);
			});
		});
		/* eslint-enable mocha/no-skipped-tests */

		describe('verifyPayload', () => {
			it('should fail when payload length greater than MAX_PAYLOAD_LENGTH constant value', done => {
				const payloadLength = validBlock.payloadLength;
				validBlock.payloadLength = 1024 * 1024 * 2;

				const result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal('Payload length is too long');

				validBlock.payloadLength = payloadLength;
				done();
			});

			it('should fail when transactions length != numberOfTransactions property', done => {
				validBlock.numberOfTransactions = validBlock.transactions.length + 1;

				const result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal(
					'Included transactions do not match block transactions count'
				);

				validBlock.numberOfTransactions = validBlock.transactions.length;
				done();
			});

			it('should fail when transactions length > maxTransactionsPerBlock constant value', done => {
				const transactions = validBlock.transactions;
				validBlock.transactions = new Array(26);
				validBlock.numberOfTransactions = validBlock.transactions.length;

				const result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(3);
				expect(result.errors[0]).to.equal(
					'Number of transactions exceeds maximum per block'
				);
				expect(result.errors[1]).to.equal('Invalid payload hash');
				expect(result.errors[2]).to.equal('Invalid total amount');

				validBlock.transactions = transactions;
				validBlock.numberOfTransactions = transactions.length;
				done();
			});

			it('should fail when a transaction is of an unknown type', done => {
				const transactionType = validBlock.transactions[0].type;
				validBlock.transactions[0].type = 555;

				const result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(2);
				expect(result.errors[0]).to.equal(
					`Unknown transaction type ${validBlock.transactions[0].type}`
				);
				expect(result.errors[1]).to.equal('Invalid payload hash');

				validBlock.transactions[0].type = transactionType;
				done();
			});

			it('should fail when a transaction is duplicated', done => {
				const secondTransaction = validBlock.transactions[1];
				validBlock.transactions[1] = validBlock.transactions[0];

				const result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(3);
				expect(result.errors[0]).to.equal(
					`Encountered duplicate transaction: ${validBlock.transactions[1].id}`
				);
				expect(result.errors[1]).to.equal('Invalid payload hash');
				expect(result.errors[2]).to.equal('Invalid total amount');

				validBlock.transactions[1] = secondTransaction;
				done();
			});

			it('should fail when payload hash is invalid', done => {
				const payloadHash = validBlock.payloadHash;
				validBlock.payloadHash = 'invalidPayloadHash';

				const result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid payload hash');

				validBlock.payloadHash = payloadHash;
				done();
			});

			it('should fail when summed transaction amounts do not match totalAmount property', done => {
				const totalAmount = validBlock.totalAmount;
				validBlock.totalAmount = 99;

				const result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid total amount');

				validBlock.totalAmount = totalAmount;
				done();
			});

			it('should fail when summed transaction fees do not match totalFee property', done => {
				const totalFee = validBlock.totalFee;
				validBlock.totalFee = 99;

				const result = privateFunctions.verifyPayload(validBlock, results);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid total fee');

				validBlock.totalFee = totalFee;
				done();
			});
		});

		describe('verifyForkOne', () => {
			it('should fail when previousBlock value is invalid', done => {
				validBlock.previousBlock = '10937893559311260102';

				const result = privateFunctions.verifyForkOne(
					validBlock,
					previousBlock,
					results
				);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal(
					[
						'Invalid previous block:',
						validBlock.previousBlock,
						'expected:',
						previousBlock.id,
					].join(' ')
				);

				validBlock.previousBlock = previousBlock;
				done();
			});
		});

		describe('verifyBlockSlot', () => {
			it('should fail when block timestamp < than previousBlock timestamp', done => {
				const timestamp = validBlock.timestamp;
				validBlock.timestamp = 32578350;

				const result = privateFunctions.verifyBlockSlot(
					validBlock,
					previousBlock,
					results
				);

				expect(result.errors)
					.to.be.an('array')
					.with.lengthOf(1);
				expect(result.errors[0]).to.equal('Invalid block timestamp');

				validBlock.timestamp = timestamp;
				done();
			});
		});

		describe('verifyBlockSlotWindow', () => {
			let verifyBlockSlotWindow;
			let result;

			before(done => {
				verifyBlockSlotWindow = RewiredVerify.__get__(
					'__private.verifyBlockSlotWindow'
				);
				done();
			});

			beforeEach(done => {
				result = {
					errors: [],
				};
				done();
			});

			describe('for current slot number', () => {
				let dummyBlock;

				before(done => {
					dummyBlock = {
						timestamp: slots.getSlotTime(slots.getSlotNumber()),
					};
					done();
				});

				it('should return empty result.errors array', async () => {
					return expect(
						verifyBlockSlotWindow(dummyBlock, result).errors
					).to.have.length(0);
				});
			});

			describe(`for slot number ${BLOCK_SLOT_WINDOW} slots in the past`, () => {
				let dummyBlock;

				before(done => {
					dummyBlock = {
						timestamp: slots.getSlotTime(
							slots.getSlotNumber() - BLOCK_SLOT_WINDOW
						),
					};
					done();
				});

				it('should return empty result.errors array', async () => {
					return expect(
						verifyBlockSlotWindow(dummyBlock, result).errors
					).to.have.length(0);
				});
			});

			describe('for slot number in the future', () => {
				let dummyBlock;

				before(done => {
					dummyBlock = {
						timestamp: slots.getSlotTime(slots.getSlotNumber() + 1),
					};
					done();
				});

				it('should call callback with error = Block slot is in the future ', async () => {
					return expect(
						verifyBlockSlotWindow(dummyBlock, result).errors
					).to.include.members(['Block slot is in the future']);
				});
			});

			describe(`for slot number ${BLOCK_SLOT_WINDOW +
				1} slots in the past`, () => {
				let dummyBlock;

				before(done => {
					dummyBlock = {
						timestamp: slots.getSlotTime(
							slots.getSlotNumber() - (BLOCK_SLOT_WINDOW + 1)
						),
					};
					done();
				});

				it('should call callback with error = Block slot is too old', async () => {
					return expect(
						verifyBlockSlotWindow(dummyBlock, result).errors
					).to.include.members(['Block slot is too old']);
				});
			});
		});

		describe('onBlockchainReady', () => {
			let onBlockchainReady;

			before(done => {
				RewiredVerify.__set__('library', {
					storage,
					logger: library.components.logger,
				});
				onBlockchainReady = RewiredVerify.prototype.onBlockchainReady;
				done();
			});

			it('should set the __private.lastNBlockIds variable', async () => {
				return onBlockchainReady().then(() => {
					const lastNBlockIds = RewiredVerify.__get__(
						'__private.lastNBlockIds'
					);
					expect(lastNBlockIds)
						.to.be.an('array')
						.and.to.have.length.below(BLOCK_SLOT_WINDOW + 1);
					_.each(lastNBlockIds, value => {
						expect(value).to.be.a('string');
					});
				});
			});
		});

		describe('onNewBlock', () => {
			describe('with lastNBlockIds', () => {
				let lastNBlockIds;

				before(done => {
					lastNBlockIds = RewiredVerify.__get__('__private.lastNBlockIds');
					done();
				});

				describe('when onNewBlock function is called once', () => {
					let dummyBlock;

					before(() => {
						dummyBlock = {
							id: '123123123',
						};

						return RewiredVerify.prototype.onNewBlock(dummyBlock);
					});

					it('should include block in lastNBlockIds queue', async () => {
						return expect(lastNBlockIds).to.include.members([dummyBlock.id]);
					});
				});

				describe(`when onNewBlock function is called ${BLOCK_SLOT_WINDOW}times`, () => {
					const blockIds = [];

					before(() => {
						return _.map(_.range(0, BLOCK_SLOT_WINDOW), async () => {
							const randomId = Math.floor(
								Math.random() * 100000000000
							).toString();
							blockIds.push(randomId);
							const dummyBlock = {
								id: randomId,
							};

							RewiredVerify.prototype.onNewBlock(dummyBlock);
						});
					});

					it('should include blockId in lastNBlockIds queue', async () => {
						return expect(lastNBlockIds).to.include.members(blockIds);
					});
				});

				describe(`when onNewBlock function is called ${BLOCK_SLOT_WINDOW *
					2} times`, () => {
					let recentNBlockIds;
					let olderThanNBlockIds;

					before(done => {
						const blockIds = [];
						_.map(_.range(0, BLOCK_SLOT_WINDOW * 2), async () => {
							const randomId = Math.floor(
								Math.random() * 100000000000
							).toString();
							blockIds.push(randomId);
							const dummyBlock = {
								id: randomId,
							};

							RewiredVerify.prototype.onNewBlock(dummyBlock);
						});

						recentNBlockIds = blockIds.filter((value, index) => {
							return blockIds.length - 1 - index < BLOCK_SLOT_WINDOW;
						});

						olderThanNBlockIds = blockIds.filter((value, index) => {
							return blockIds.length - 1 - index >= BLOCK_SLOT_WINDOW;
						});
						done();
					});

					it(`should maintain last ${BLOCK_SLOT_WINDOW} blockIds in lastNBlockIds queue`, async () => {
						expect(lastNBlockIds).to.include.members(recentNBlockIds);
						return expect(lastNBlockIds).to.not.include.members(
							olderThanNBlockIds
						);
					});
				});
			});
		});

		describe('verifyAgainstLastNBlockIds', () => {
			let verifyAgainstLastNBlockIds;
			let result = {
				verified: true,
				errors: [],
			};

			before(done => {
				verifyAgainstLastNBlockIds = RewiredVerify.__get__(
					'__private.verifyAgainstLastNBlockIds'
				);
				done();
			});

			afterEach(done => {
				result = {
					verified: true,
					errors: [],
				};
				done();
			});

			describe('when __private.lastNBlockIds', () => {
				let lastNBlockIds;

				before(done => {
					lastNBlockIds = RewiredVerify.__get__('__private.lastNBlockIds');
					done();
				});

				describe('contains block id', () => {
					const dummyBlockId = '123123123123';

					before(() => {
						return lastNBlockIds.push(dummyBlockId);
					});

					it('should return result with error = Block already exists in chain', async () => {
						return expect(
							verifyAgainstLastNBlockIds({ id: dummyBlockId }, result).errors
						).to.include.members(['Block already exists in chain']);
					});
				});

				describe('does not contain block id', () => {
					it('should return result with no errors', async () => {
						return expect(
							verifyAgainstLastNBlockIds({ id: '1231231234' }, result).errors
						).to.have.length(0);
					});
				});
			});
		});
	});

	// TODO: Refactor this test, dataset being used is no longer valid because of BLOCK_SLOT_WINDOW check
	describe('verifyReceipt', () => {});

	describe('verifyBlock', () => {});

	describe('addBlockProperties', () => {});

	describe('deleteBlockProperties', () => {});

	// Sends a block to network, save it locally
	describe('processBlock for valid block {broadcast: true, saveBlock: true}', () => {
		it('should clear database', done => {
			async.every(
				[
					'blocks WHERE height > 1',
					'trs WHERE "blockId" != \'6524861224470851795\'',
					"mem_accounts WHERE address IN ('2737453412992791987L', '2896019180726908125L')",
					'forks_stat',
				],
				(table, seriesCb) => {
					clearDatabaseTable(
						storage,
						modulesLoader.scope.components.logger,
						table
					)
						.then(res => {
							seriesCb(null, res);
						})
						.catch(err => {
							seriesCb(err, null);
						});
				},
				err => {
					if (err) {
						return done(err);
					}
					return delegates.generateDelegateList(1, null, done);
				}
			);
		});

		it('should generate account', done => {
			accounts.setAccountAndGet(testAccount.account, (err, newaccount) => {
				if (err) {
					return done(err);
				}
				expect(newaccount.address).to.equal(testAccount.account.address);
				return done();
			});
		});

		it('should generate block 1', done => {
			const slot = slots.getSlotNumber();
			const time = slots.getSlotTime(slots.getSlotNumber());

			getValidKeypairForSlot(library, slot)
				.then(passphrase => {
					block1 = createBlock(
						blocks,
						blockLogic,
						passphrase,
						time,
						[],
						genesisBlock
					);
					expect(block1.version).to.equal(0);
					expect(block1.timestamp).to.equal(time);
					expect(block1.numberOfTransactions).to.equal(0);
					expect(block1.reward.isEqualTo('0')).to.be.true;
					expect(block1.totalFee.isEqualTo('0')).to.be.true;
					expect(block1.totalAmount.isEqualTo('0')).to.be.true;
					expect(block1.payloadLength).to.equal(0);
					expect(block1.transactions).to.deep.equal([]);
					expect(block1.previousBlock).to.equal(genesisBlock.id);
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should be ok when processing block 1', done => {
			blocksVerify.processBlock(block1, true, true, (err, result) => {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				return done();
			});
		});
	});

	describe('processBlock for invalid block {broadcast: true, saveBlock: true}', () => {
		beforeEach(done => {
			blocksVerify.processBlock(block1, true, true, done);
		});

		it('should fail when processing block 1 multiple times', done => {
			blocksVerify.processBlock(block1, true, true, err => {
				expect(err).to.equal('Invalid block timestamp');
				done();
			});
		});
	});

	// Receives a block from network, save it locally
	describe('processBlock for invalid block {broadcast: false, saveBlock: true}', () => {
		let invalidBlock2;

		it('should generate block 2 with invalid generator slot', done => {
			const passphrase =
				'latin swamp simple bridge pilot become topic summer budget dentist hollow seed';

			invalidBlock2 = createBlock(
				blocks,
				blockLogic,
				passphrase,
				33772882,
				[],
				genesisBlock
			);
			expect(invalidBlock2.version).to.equal(0);
			expect(invalidBlock2.timestamp).to.equal(33772882);
			expect(invalidBlock2.numberOfTransactions).to.equal(0);
			expect(invalidBlock2.reward.isEqualTo('0')).to.be.true;
			expect(invalidBlock2.totalFee.isEqualTo('0')).to.be.true;
			expect(invalidBlock2.totalAmount.isEqualTo('0')).to.be.true;
			expect(invalidBlock2.payloadLength).to.equal(0);
			expect(invalidBlock2.transactions).to.deep.equal([]);
			expect(invalidBlock2.previousBlock).to.equal(genesisBlock.id);
			done();
		});

		describe('normalizeBlock validations', () => {
			beforeEach(done => {
				block2 = createBlock(
					blocks,
					blockLogic,
					random.password(),
					33772882,
					[genesisBlock.transactions[0]],
					genesisBlock
				);
				done();
			});

			it('should fail when timestamp property is missing', done => {
				block2 = blocksVerify.deleteBlockProperties(block2);
				delete block2.timestamp;

				blocksVerify.processBlock(block2, false, true, err => {
					if (err) {
						expect(err).equal(
							'Failed to validate block schema: Missing required property: timestamp'
						);
						done();
					}
				});
			});

			it('should fail when transactions property is missing', done => {
				delete block2.transactions;

				blocksVerify.processBlock(block2, false, true, err => {
					if (err) {
						expect(err).equal('Invalid total amount');
						done();
					}
				});
			});

			it('should fail when transaction type property is missing', done => {
				const transactionType = block2.transactions[0].type;
				delete block2.transactions[0].type;
				blocksVerify.processBlock(block2, false, true, err => {
					if (err) {
						expect(err).equal('Unknown transaction type undefined');
						block2.transactions[0].type = transactionType;
						done();
					}
				});
			});

			it('should fail when transaction timestamp property is missing', done => {
				const transactionTimestamp = block2.transactions[0].timestamp;
				delete block2.transactions[0].timestamp;
				blocksVerify.processBlock(block2, false, true, err => {
					if (err) {
						expect(err).equal(
							'Failed to validate transaction schema: Missing required property: timestamp'
						);
						block2.transactions[0].timestamp = transactionTimestamp;
						done();
					}
				});
			});

			it('should fail when block generator is invalid (fork:3)', done => {
				blocksVerify.processBlock(block2, false, true, err => {
					if (err) {
						expect(err).equal('Failed to verify slot: 3377288');
						done();
					}
				});
			});

			describe('block with processed transaction', () => {
				let auxBlock;

				it('should generate block 1 with valid generator slot and processed transaction', done => {
					const slot = slots.getSlotNumber();
					const time = slots.getSlotTime(slots.getSlotNumber());

					getValidKeypairForSlot(library, slot)
						.then(passphrase => {
							auxBlock = createBlock(
								blocks,
								blockLogic,
								passphrase,
								time,
								[genesisBlock.transactions[0]],
								genesisBlock
							);

							expect(auxBlock.version).to.equal(0);
							expect(auxBlock.timestamp).to.equal(time);
							expect(auxBlock.numberOfTransactions).to.equal(1);
							expect(auxBlock.reward.isEqualTo('0')).to.be.true;
							expect(auxBlock.totalFee.isEqualTo('0')).to.be.true;
							expect(auxBlock.totalAmount.isEqualTo('10000000000000000')).to.be
								.true;
							expect(auxBlock.payloadLength).to.equal(117);
							expect(auxBlock.transactions).to.deep.equal([
								genesisBlock.transactions[0],
							]);
							expect(auxBlock.previousBlock).to.equal(genesisBlock.id);
							done();
						})
						.catch(err => {
							done(err);
						});
				});

				it('should fail when transaction is already confirmed (fork:2)', done => {
					const account = random.account();
					const transaction = transfer({
						amount: new Bignum(NORMALIZER).multipliedBy(1000).toString(),
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: account.address,
					});
					transaction.senderId = '16313739661670634666L';

					const createBlockPayload = (
						passPhrase,
						transactions,
						previousBlockArgs
					) => {
						const time = slots.getSlotTime(slots.getSlotNumber());
						const firstBlock = createBlock(
							blocks,
							blockLogic,
							passPhrase,
							time,
							transactions,
							previousBlockArgs
						);

						return blocksVerify.deleteBlockProperties(firstBlock);
					};

					getValidKeypairForSlot(library, slots.getSlotNumber())
						.then(passPhrase => {
							const transactions = [transaction];
							const firstBlock = createBlockPayload(
								passPhrase,
								transactions,
								genesisBlock
							);
							blocksVerify.processBlock(firstBlock, false, true, err => {
								expect(err).to.equal(null);
								// Wait for next slot
								setTimeout(() => {
									getValidKeypairForSlot(library, slots.getSlotNumber())
										.then(resultedPassPhrase => {
											const secondBlock = createBlockPayload(
												resultedPassPhrase,
												transactions,
												firstBlock
											);
											blocksVerify.processBlock(
												secondBlock,
												false,
												true,
												processBlockErr => {
													expect(processBlockErr).to.equal(
														[
															'Transaction is already confirmed:',
															transaction.id,
														].join(' ')
													);
													done();
												}
											);
										})
										.catch(getValidKeypairForSlotErr2 => {
											done(getValidKeypairForSlotErr2);
										});
								}, 10000);
							});
						})
						.catch(getValidKeypairForSlotErr1 => {
							done(getValidKeypairForSlotErr1);
						});
				});
			});
		});
	});

	describe('processBlock for valid block {broadcast: false, saveBlock: true}', () => {
		it('should generate block 2 with valid generator slot', done => {
			const slot = slots.getSlotNumber();
			const time = slots.getSlotTime(slots.getSlotNumber());

			getValidKeypairForSlot(library, slot)
				.then(passphrase => {
					block2 = createBlock(
						blocks,
						blockLogic,
						passphrase,
						time,
						[],
						genesisBlock
					);
					expect(block2.version).to.equal(0);
					expect(block2.timestamp).to.equal(time);
					expect(block2.numberOfTransactions).to.equal(0);
					expect(block2.reward.isEqualTo('0')).to.be.true;
					expect(block2.totalFee.isEqualTo('0')).to.be.true;
					expect(block2.totalAmount.isEqualTo('0')).to.be.true;
					expect(block2.payloadLength).to.equal(0);
					expect(block2.transactions).to.deep.equal([]);
					expect(block2.previousBlock).to.equal(genesisBlock.id);
					done();
				})
				.catch(err => {
					done(err);
				});
		});

		it('should be ok when processing block 2', done => {
			blocksVerify.processBlock(block2, false, true, (err, result) => {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				return done();
			});
		});
	});
});
