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

const {
	getPrivateAndPublicKeyBytesFromPassphrase,
} = require('@liskhq/lisk-cryptography');
const { transfer } = require('@liskhq/lisk-transactions');
const _ = require('lodash');
const async = require('async');
const BigNum = require('@liskhq/bignum');
const application = require('../../../common/application');
const { clearDatabaseTable } = require('../../../common/storage_sandbox');
const modulesLoader = require('../../../common/modules_loader');
const random = require('../../../common/utils/random');
const {
	registeredTransactions,
} = require('../../../common/registered_transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../src/modules/chain/interface_adapters');
const accountFixtures = require('../../../fixtures/accounts');
const genesisDelegates = require('../../../data/genesis_delegates.json')
	.delegates;
const { Slots } = require('../../../../../src/modules/chain/dpos');

const { ACTIVE_DELEGATES, BLOCK_SLOT_WINDOW } = global.constants;
const { NORMALIZER } = global.__testContext.config;
const genesisBlock = __testContext.config.genesisBlock;
const interfaceAdapters = {
	transactions: new TransactionInterfaceAdapter(registeredTransactions),
};

const slots = new Slots({
	epochTime: __testContext.config.constants.EPOCH_TIME,
	interval: __testContext.config.constants.BLOCK_TIME,
	blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
});

let block1;
let block2;

async function createBlock(
	library,
	passphrase,
	timestamp,
	transactions,
	previousBlockArgs,
) {
	const keypairBytes = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);
	const keypair = {
		publicKey: keypairBytes.publicKeyBytes,
		privateKey: keypairBytes.privateKeyBytes,
	};
	transactions = transactions.map(transaction =>
		interfaceAdapters.transactions.fromJson(transaction),
	);
	library.modules.blocks._lastBlock = previousBlockArgs;
	const newBlock = await library.modules.processor.create({
		keypair,
		timestamp,
		previousBlock: library.modules.blocks.lastBlock,
		transactions,
		maxHeightPreviouslyForged: 1,
		prevotedConfirmedUptoHeight: 1,
	});
	return newBlock;
}

function getValidKeypairForSlot(library, slot) {
	const lastBlock = genesisBlock;
	const round = slots.calcRound(lastBlock.height);

	return library.modules.dpos
		.getRoundDelegates(round)
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
	let dpos;
	let storage;

	before(done => {
		application.init(
			{
				sandbox: {
					name: 'blocks_verify',
				},
			},
			(err, scope) => {
				dpos = scope.modules.dpos;
				storage = scope.components.storage;

				// Set current block version to 0
				scope.modules.blocks.blocksVerify.exceptions = {
					...scope.modules.blocks.exceptions,
					blockVersions: {
						0: {
							start: 1,
							end: 150,
						},
					},
				};

				library = scope;
				library.modules.blocks._lastBlock = genesisBlock;
				// Bus gets overwritten - waiting for mem_accounts has to be done manually
				setTimeout(done, 5000);
			},
		);
	});

	afterEach(() => {
		library.modules.blocks._lastBlock = genesisBlock;
		return storage.adapter.db.none('DELETE FROM blocks WHERE height > 1');
	});

	after(done => {
		application.cleanup(done);
	});

	// Move to unit tests (already covered)
	// eslint-disable-next-line mocha/no-skipped-tests
	describe.skip('__private', () => {
		describe('verifySignature', () => {
			it('should fail when blockSignature property is not a hex string', async () => {});

			it('should fail when blockSignature property is an invalid hex string', async () => {});

			it('should fail when generatorPublicKey property is not a hex string', async () => {});

			it('should fail when generatorPublicKey property is an invalid hex string', async () => {});
		});

		describe('verifyPreviousBlock', () => {
			it('should fail when previousBlock property is missing', async () => {});
		});

		describe('verifyVersion', () => {
			it('should fail when block version != 0', async () => {});
		});

		describe('verifyReward', () => {
			it('should fail when block reward = 99 instead of 0', async () => {});
		});

		describe('verifyId', () => {
			it('should reset block id when block id is an invalid alpha-numeric string value', async () => {});

			it('should reset block id when block id is an invalid numeric string value', async () => {});

			it('should reset block id when block id is an invalid integer value', async () => {});

			it('should reset block id when block id is a valid integer value', async () => {});
		});
		/* eslint-enable mocha/no-skipped-tests */

		describe('verifyPayload', () => {
			it('should fail when payload length greater than MAX_PAYLOAD_LENGTH constant value', async () => {});

			it('should fail when transactions length != numberOfTransactions property', async () => {});

			it('should fail when transactions length > maxTransactionsPerBlock constant value', async () => {});

			it('should fail when a transaction is of an unknown type', async () => {});

			it('should fail when a transaction is duplicated', async () => {});

			it('should fail when payload hash is invalid', async () => {});

			it('should fail when summed transaction amounts do not match totalAmount property', async () => {});

			it('should fail when summed transaction fees do not match totalFee property', async () => {});
		});

		describe('verifyForkOne', () => {
			it('should fail when previousBlock value is invalid', async () => {});
		});

		describe('verifyBlockSlot', () => {
			it('should fail when block timestamp < than previousBlock timestamp', async () => {});
		});

		describe('verifyBlockSlotWindow', () => {
			describe('for current slot number', () => {
				it('should return empty result.errors array', async () => {});
			});

			describe(`for slot number ${BLOCK_SLOT_WINDOW} slots in the past`, () => {
				it('should return empty result.errors array', async () => {});
			});

			describe('for slot number in the future', () => {
				it('should call callback with error = Block slot is in the future ', async () => {});
			});

			describe(`for slot number ${BLOCK_SLOT_WINDOW +
				1} slots in the past`, () => {
				it('should call callback with error = Block slot is too old', async () => {});
			});
		});

		describe('onNewBlock', () => {
			describe('with lastNBlockIds', () => {
				describe('when onNewBlock function is called once', () => {
					it('should include block in lastNBlockIds queue', async () => {});
				});

				describe(`when onNewBlock function is called ${BLOCK_SLOT_WINDOW}times`, () => {
					it('should include blockId in lastNBlockIds queue', async () => {});
				});

				describe(`when onNewBlock function is called ${BLOCK_SLOT_WINDOW *
					2} times`, () => {
					it(`should maintain last ${BLOCK_SLOT_WINDOW} blockIds in lastNBlockIds queue`, async () => {});
				});
			});
		});

		describe('verifyAgainstLastNBlockIds', () => {
			describe('when __private.lastNBlockIds', () => {
				describe('contains block id', () => {
					it('should return result with error = Block already exists in chain', async () => {});
				});

				describe('does not contain block id', () => {
					it('should return result with no errors', async () => {});
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
				],
				(table, seriesCb) => {
					clearDatabaseTable(
						storage,
						modulesLoader.scope.components.logger,
						table,
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
					return dpos.getRoundDelegates(1).then(() => done());
				},
			);
		});

		it('should generate block 1', async () => {
			const slot = slots.getSlotNumber();
			const time = slots.getSlotTime(slots.getSlotNumber());

			const passphrase = await getValidKeypairForSlot(library, slot);
			block1 = await createBlock(library, passphrase, time, [], genesisBlock);
			expect(block1.version).to.equal(1);
			expect(block1.timestamp).to.equal(time);
			expect(block1.numberOfTransactions).to.equal(0);
			expect(block1.reward.equals('0')).to.be.true;
			expect(block1.totalFee.equals('0')).to.be.true;
			expect(block1.totalAmount.equals('0')).to.be.true;
			expect(block1.payloadLength).to.equal(0);
			expect(block1.transactions).to.deep.equal([]);
			expect(block1.previousBlock).to.equal(genesisBlock.id);
		});

		it('should be ok when processing block 1', async () => {
			await library.modules.processor.process(block1);
		});
	});

	describe('processBlock for invalid block {broadcast: true, saveBlock: true}', () => {
		beforeEach(async () => {
			await library.modules.processor.process(block1);
		});

		afterEach(async () => {
			sinonSandbox.restore();
		});

		it('should fail when processing block 1 multiple times', async () => {
			try {
				await library.modules.processor.process(block1);
			} catch (error) {
				expect(error.message).to.equal(`Block ${block1.id} already exists`);
			}
		});
	});

	// Receives a block from network, save it locally
	describe('processBlock for invalid block {broadcast: false, saveBlock: true}', () => {
		let invalidBlock2;

		it('should generate block 2 with invalid generator slot', async () => {
			const passphrase =
				'latin swamp simple bridge pilot become topic summer budget dentist hollow seed';

			invalidBlock2 = await createBlock(
				library,
				passphrase,
				33772882,
				[],
				genesisBlock,
			);
			expect(invalidBlock2.version).to.equal(1);
			expect(invalidBlock2.timestamp).to.equal(33772882);
			expect(invalidBlock2.numberOfTransactions).to.equal(0);
			expect(invalidBlock2.reward.equals('0')).to.be.true;
			expect(invalidBlock2.totalFee.equals('0')).to.be.true;
			expect(invalidBlock2.totalAmount.equals('0')).to.be.true;
			expect(invalidBlock2.payloadLength).to.equal(0);
			expect(invalidBlock2.transactions).to.deep.equal([]);
			expect(invalidBlock2.previousBlock).to.equal(genesisBlock.id);
		});

		describe('normalizeBlock validations', () => {
			beforeEach(async () => {
				const account = random.account();
				const transaction = transfer({
					amount: new BigNum(NORMALIZER).times(1000).toString(),
					recipientId: accountFixtures.genesis.address,
					passphrase: account.passphrase,
				});

				block2 = await createBlock(
					library,
					random.password(),
					33772882,
					[transaction],
					genesisBlock,
				);
			});

			it('should fail when timestamp property is missing', async () => {
				delete block2.timestamp;

				try {
					await library.modules.processor.process(block2);
				} catch (errors) {
					expect(errors[0].message).equal(
						"should have required property 'timestamp'",
					);
				}
			});

			it('should fail when transactions property is missing', async () => {
				delete block2.transactions;
				try {
					await library.modules.processor.process(block2);
				} catch (errors) {
					expect(errors[0].message).equal(
						"should have required property 'transactions'",
					);
				}
			});

			it('should fail when transaction type property is missing', async () => {
				const transactionType = block2.transactions[0].type;
				delete block2.transactions[0].type;
				try {
					await library.modules.processor.process(block2);
				} catch (err) {
					expect(err[0].message).equal(
						"'' should have required property 'type'",
					);
					block2.transactions[0].type = transactionType;
				}
			});

			it('should fail when transaction timestamp property is missing', async () => {
				const transactionTimestamp = block2.transactions[0].timestamp;
				delete block2.transactions[0].timestamp;
				try {
					await library.modules.processor.process(block2);
				} catch (err) {
					expect(err.message).equal('Invalid payload hash');
					block2.transactions[0].timestamp = transactionTimestamp;
				}
			});

			it('should fail when block generator is invalid (fork:3)', async () => {
				try {
					await library.modules.processor.process(block2);
				} catch (err) {
					expect(err.message).equal('Failed to verify slot: 3377288');
				}
			});

			describe('block with processed transaction', () => {
				let auxBlock;

				it('should generate block 1 with valid generator slot and processed transaction', async () => {
					const slot = slots.getSlotNumber();
					const time = slots.getSlotTime(slots.getSlotNumber());

					const account = random.account();
					const transferTransaction = transfer({
						amount: new BigNum(NORMALIZER).times(1000).toString(),
						recipientId: accountFixtures.genesis.address,
						passphrase: account.passphrase,
					});

					const passphrase = await getValidKeypairForSlot(library, slot);
					auxBlock = await createBlock(
						library,
						passphrase,
						time,
						[transferTransaction],
						genesisBlock,
					);

					expect(auxBlock.version).to.equal(1);
					expect(auxBlock.timestamp).to.equal(time);
					expect(auxBlock.numberOfTransactions).to.equal(1);
					expect(auxBlock.reward.equals('0')).to.be.true;
					expect(auxBlock.totalFee.equals('10000000')).to.be.true;
					expect(auxBlock.totalAmount.equals('100000000000')).to.be.true;
					expect(auxBlock.payloadLength).to.equal(117);
					expect(
						auxBlock.transactions.map(transaction => transaction.id),
					).to.deep.equal(
						[transferTransaction].map(transaction => transaction.id),
					);
					expect(auxBlock.previousBlock).to.equal(genesisBlock.id);
				});

				it('should fail when transaction is invalid', async () => {
					const account = random.account();
					const transaction = transfer({
						amount: new BigNum(NORMALIZER).times(1000).toString(),
						recipientId: accountFixtures.genesis.address,
						passphrase: account.passphrase,
					});
					transaction.senderId = account.address;

					const createBlockPayload = async (
						passPhrase,
						transactions,
						previousBlockArgs,
					) => {
						const time = slots.getSlotTime(slots.getSlotNumber());
						const firstBlock = await createBlock(
							library,
							passPhrase,
							time,
							transactions,
							previousBlockArgs,
						);

						return firstBlock;
					};

					const passPhrase = await getValidKeypairForSlot(
						library,
						slots.getSlotNumber(),
					);
					const transactions = [transaction];
					const firstBlock = await createBlockPayload(
						passPhrase,
						transactions,
						genesisBlock,
					);
					try {
						await library.modules.processor.process(firstBlock);
					} catch (err) {
						expect(err[0].message).to.equal(
							`Account does not have enough LSK: ${
								account.address
							}, balance: 0`,
						);
					}
				});

				it('should fail when transaction is already confirmed (fork:2)', async () => {
					const account = random.account();
					const transaction = transfer({
						amount: new BigNum(NORMALIZER).times(1000).toString(),
						passphrase: accountFixtures.genesis.passphrase,
						recipientId: account.address,
					});
					transaction.senderId = '16313739661670634666L';

					const createBlockPayload = async (
						passPhrase,
						transactions,
						previousBlockArgs,
					) => {
						const time = slots.getSlotTime(slots.getSlotNumber());
						const firstBlock = await createBlock(
							library,
							passPhrase,
							time,
							transactions,
							previousBlockArgs,
						);

						return firstBlock;
					};

					const passPhrase = await getValidKeypairForSlot(
						library,
						slots.getSlotNumber(),
					);
					const transactions = [transaction];
					const firstBlock = await createBlockPayload(
						passPhrase,
						transactions,
						genesisBlock,
					);
					await library.modules.processor.process(firstBlock);
					const resultedPassPhrase = await getValidKeypairForSlot(
						library,
						slots.getSlotNumber(),
					);
					const secondBlock = await createBlockPayload(
						resultedPassPhrase,
						transactions,
						firstBlock,
					);
					try {
						await library.modules.processor.processValidated(secondBlock);
					} catch (processBlockErr) {
						expect(processBlockErr[0]).to.be.instanceOf(Error);
						expect(processBlockErr[0].message).to.equal(
							['Transaction is already confirmed:', transaction.id].join(' '),
						);
					}
				});
			});
		});
	});

	describe('processBlock for valid block {broadcast: false, saveBlock: true}', () => {
		it('should generate block 2 with valid generator slot', async () => {
			const slot = slots.getSlotNumber();
			const time = slots.getSlotTime(slots.getSlotNumber());

			const passphrase = await getValidKeypairForSlot(library, slot);
			block2 = await createBlock(library, passphrase, time, [], genesisBlock);
			expect(block2.version).to.equal(1);
			expect(block2.timestamp).to.equal(time);
			expect(block2.numberOfTransactions).to.equal(0);
			expect(block2.reward.equals('0')).to.be.true;
			expect(block2.totalFee.equals('0')).to.be.true;
			expect(block2.totalAmount.equals('0')).to.be.true;
			expect(block2.payloadLength).to.equal(0);
			expect(block2.transactions).to.deep.equal([]);
			expect(block2.previousBlock).to.equal(genesisBlock.id);
		});

		it('should be ok when processing block 2', async () => {
			await library.modules.processor.process(block2);
		});
	});
});
