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

const util = require('util');
const liskTransactions = require('@liskhq/lisk-transactions');
const accountFixtures = require('../fixtures/accounts');
const application = require('../common/application');
const random = require('../common/utils/random');
const localCommon = require('./common');
const { StateStore } = require('../../../src/modules/chain/blocks');
const { getNetworkIdentifier } = require('../common/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

const genesisBlock = __testContext.config.genesisBlock;
const exceptions = __testContext.config.modules.chain.exceptions;
const { NORMALIZER } = global.__testContext.config;
const transactionStatus = liskTransactions.Status;
const { Slots } = require('../../../src/modules/chain/dpos');

// This is covered by the blocks module unit tests
// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('processTransactions', () => {
	const slots = new Slots({
		epochTime: __testContext.config.constants.EPOCH_TIME,
		interval: __testContext.config.constants.BLOCK_TIME,
		blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
	});

	let library;
	let account;
	let verifiableTransactions;
	let allowAbleTransactions;
	let nonAllowableTransactions;
	let transactionsWithNoMatcherImpl;
	let appliableTransactions;
	let pendingTransactions;
	let keysgroup;
	let nonVerifiableTransactions;

	before(done => {
		application.init(
			{
				sandbox: {
					name: 'lisk_test_blocks_process_transactions',
				},
			},
			(err, scope) => {
				library = scope;
				library.modules.blocks._lastBlock = genesisBlock;
				done(err);
			},
		);
	});

	describe('credit account', () => {
		beforeEach(done => {
			account = random.account();
			const transaction = liskTransactions.transfer({
				networkIdentifier,
				amount: (NORMALIZER * 1000000).toString(),
				recipientId: account.address,
				passphrase: accountFixtures.genesis.passphrase,
			});

			localCommon.addTransactionsAndForge(library, [transaction], 0, done);
		});

		describe('process transactions', () => {
			beforeEach(async () => {
				const allowedTransactionTransfer = liskTransactions.transfer({
					networkIdentifier,
					amount: (NORMALIZER * 1000).toString(),
					recipientId: account.address,
					passphrase: account.passphrase,
				});
				allowedTransactionTransfer.matcher = () => true;

				const nonAllowedTransactionTransfer = liskTransactions.transfer({
					networkIdentifier,
					amount: (NORMALIZER * 1000).toString(),
					recipientId: account.address,
					passphrase: account.passphrase,
				});
				nonAllowedTransactionTransfer.matcher = () => false;

				allowAbleTransactions = [allowedTransactionTransfer];

				nonAllowableTransactions = [nonAllowedTransactionTransfer];

				transactionsWithNoMatcherImpl = [
					liskTransactions.transfer({
						networkIdentifier,
						amount: (NORMALIZER * 1000).toString(),
						recipientId: account.address,
						passphrase: account.passphrase,
					}),
				];

				verifiableTransactions = [
					liskTransactions.transfer({
						networkIdentifier,
						amount: (NORMALIZER * 1000).toString(),
						recipientId: account.address,
						passphrase: account.passphrase,
					}),
					liskTransactions.registerDelegate({
						networkIdentifier,
						passphrase: account.passphrase,
						username: account.username,
					}),
					liskTransactions.registerSecondPassphrase({
						networkIdentifier,
						passphrase: account.passphrase,
						secondPassphrase: account.secondPassphrase,
					}),
					liskTransactions.castVotes({
						networkIdentifier,
						passphrase: account.passphrase,
						votes: [`${accountFixtures.existingDelegate.publicKey}`],
					}),
					// liskTransactions.createDapp({
					// 	passphrase: account.passphrase,
					// 	options: random.application(),
					// }),
				].map(transaction =>
					library.modules.blocks.deserializeTransaction(transaction),
				);

				// If we include second signature transaction, then the rest of the transactions in the set will be required to have second signature.
				// Therefore removing it from the appliable transactions
				appliableTransactions = verifiableTransactions.filter(
					transaction => transaction.type !== 9,
				);

				nonVerifiableTransactions = [
					liskTransactions.transfer({
						networkIdentifier,
						amount: (NORMALIZER * 1000).toString(),
						recipientId: accountFixtures.genesis.address,
						passphrase: random.account().passphrase,
					}),
				].map(transaction =>
					library.modules.blocks.deserializeTransaction(transaction),
				);

				keysgroup = new Array(4).fill(0).map(() => random.account().publicKey);

				pendingTransactions = [
					liskTransactions.registerMultisignature({
						networkIdentifier,
						passphrase: account.passphrase,
						keysgroup,
						lifetime: 10,
						minimum: 2,
					}),
				].map(transaction =>
					library.modules.blocks.deserializeTransaction(transaction),
				);
			});

			describe('checkAllowedTransactions', () => {
				let checkAllowedTransactions;

				beforeEach(async () => {
					checkAllowedTransactions = transactionsModule.checkAllowedTransactions(
						library.modules.blocks.lastBlock,
					);
				});

				it('should return transactionsResponses with status OK for allowed transactions', async () => {
					const { transactionsResponses } = await checkAllowedTransactions(
						allowAbleTransactions,
					);

					transactionsResponses.forEach(transactionsResponse => {
						expect(transactionsResponse.status).to.equal(transactionStatus.OK);
					});
				});

				it("should return transactionsResponses with status OK for transactions that don't implement matcher", async () => {
					const { transactionsResponses } = await checkAllowedTransactions(
						transactionsWithNoMatcherImpl,
					);

					transactionsResponses.forEach(transactionsResponse => {
						expect(transactionsResponse.status).to.equal(transactionStatus.OK);
					});
				});

				it('should return transactionsResponses with status FAIL for not allowed transactions', async () => {
					const { transactionsResponses } = await checkAllowedTransactions(
						nonAllowableTransactions,
					);

					transactionsResponses.forEach(transactionsResponse => {
						expect(transactionsResponse.status).to.equal(
							transactionStatus.FAIL,
						);
					});
				});
			});

			describe('verifyTransactions', () => {
				let verifyTransactions;
				let stateStore;

				beforeEach(async () => {
					stateStore = new StateStore(library.components.storage);
					verifyTransactions = transactionsModule.verifyTransactions(
						slots,
						exceptions,
					);
				});

				it('should return transactionsResponses with status OK for verified transactions', async () => {
					const { transactionsResponses } = await verifyTransactions(
						verifiableTransactions,
						stateStore,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.OK);
					});
				});

				it('should return transactionsResponses with status FAIL for unverifiable transaction', async () => {
					const { transactionsResponses } = await verifyTransactions(
						nonVerifiableTransactions,
						stateStore,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.FAIL);
					});
				});

				it('should return transactionsResponses with status PENDING for transactions waiting multi-signatures', async () => {
					const { transactionsResponses } = await verifyTransactions(
						pendingTransactions,
						stateStore,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(
							transactionStatus.PENDING,
						);
					});
				});
			});

			describe('undoTransactions', () => {
				let undoTransactions;
				let stateStore;

				beforeEach(done => {
					stateStore = new StateStore(library.components.storage);
					undoTransactions = transactionsModule.undoTransactions(exceptions);
					localCommon.addTransactionsAndForge(
						library,
						appliableTransactions.map(appliableTransaction =>
							appliableTransaction.toJSON(),
						),
						0,
						done,
					);
				});

				it('should return transactionsResponses with status OK for verified transactions', async () => {
					const { transactionsResponses } = await undoTransactions(
						appliableTransactions,
						stateStore,
					);

					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.OK);
					});
				});

				it('should return transactionsResponses with status FAIL for unverifiable transaction', async () => {
					const forge = util.promisify(localCommon.forge);
					await forge(library);

					const sender = random.account();
					const recipient = random.account();

					const { transactionsResponses } = await undoTransactions(
						[
							library.modules.blocks.deserializeTransaction(
								liskTransactions.transfer({
									networkIdentifier,
									amount: (NORMALIZER * 1000).toString(),
									recipientId: recipient.address,
									passphrase: sender.passphrase,
								}),
							),
						],
						stateStore,
					);

					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.FAIL);
					});
				});
			});

			describe('applyTransactions', () => {
				let applyTransactions;
				let stateStore;

				beforeEach(async () => {
					stateStore = new StateStore(library.components.storage);
					applyTransactions = transactionsModule.applyTransactions(
						library.components.storage,
						exceptions,
					);
				});

				it('should return transactionsResponses with status OK for verified transactions', async () => {
					const { transactionsResponses } = await applyTransactions(
						appliableTransactions,
						stateStore,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.OK);
					});
				});

				it('should return transactionsResponses with status FAIL for unverifiable transaction', async () => {
					const { transactionsResponses } = await applyTransactions(
						nonVerifiableTransactions,
						stateStore,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.FAIL);
					});
				});

				it('should return transactionsResponses with status PENDING for transactions waiting multi-signatures', async () => {
					const { transactionsResponses } = await applyTransactions(
						pendingTransactions,
						stateStore,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(
							transactionStatus.PENDING,
						);
					});
				});
			});
		});
	});
});
