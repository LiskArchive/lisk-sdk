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
const { registeredTransactions } = require('../common/registered_transactions');
const transactionsModule = require('../../../src/modules/chain/transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../src/modules/chain/interface_adapters');
const votes = require('../../../src/modules/chain/transactions/votes');

const interfaceAdapters = {
	transactions: new TransactionInterfaceAdapter(registeredTransactions),
};
const genesisBlock = __testContext.config.genesisBlock;
const exceptions = __testContext.config.modules.chain.exceptions;
const { NORMALIZER } = global.__testContext.config;
const transactionStatus = liskTransactions.Status;
const { BlockSlots } = require('../../../src/modules/chain/blocks');

describe('processTransactions', () => {
	const slots = new BlockSlots({
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
				amount: (NORMALIZER * 1000000).toString(),
				recipientId: account.address,
				passphrase: accountFixtures.genesis.passphrase,
			});

			localCommon.addTransactionsAndForge(library, [transaction], 0, done);
		});

		describe('process transactions', () => {
			beforeEach(async () => {
				const allowedTransactionTransfer = liskTransactions.transfer({
					amount: (NORMALIZER * 1000).toString(),
					recipientId: account.address,
					passphrase: account.passphrase,
				});
				allowedTransactionTransfer.matcher = () => true;

				const nonAllowedTransactionTransfer = liskTransactions.transfer({
					amount: (NORMALIZER * 1000).toString(),
					recipientId: account.address,
					passphrase: account.passphrase,
				});
				nonAllowedTransactionTransfer.matcher = () => false;

				allowAbleTransactions = [allowedTransactionTransfer];

				nonAllowableTransactions = [nonAllowedTransactionTransfer];

				transactionsWithNoMatcherImpl = [
					liskTransactions.transfer({
						amount: (NORMALIZER * 1000).toString(),
						recipientId: account.address,
						passphrase: account.passphrase,
					}),
				];

				verifiableTransactions = [
					liskTransactions.transfer({
						amount: (NORMALIZER * 1000).toString(),
						recipientId: account.address,
						passphrase: account.passphrase,
					}),
					liskTransactions.registerDelegate({
						passphrase: account.passphrase,
						username: account.username,
					}),
					liskTransactions.registerSecondPassphrase({
						passphrase: account.passphrase,
						secondPassphrase: account.secondPassphrase,
					}),
					liskTransactions.castVotes({
						passphrase: account.passphrase,
						votes: [`${accountFixtures.existingDelegate.publicKey}`],
					}),
					// liskTransactions.createDapp({
					// 	passphrase: account.passphrase,
					// 	options: random.application(),
					// }),
				].map(transaction =>
					interfaceAdapters.transactions.fromJson(transaction),
				);

				// If we include second signature transaction, then the rest of the transactions in the set will be required to have second signature.
				// Therefore removing it from the appliable transactions
				appliableTransactions = verifiableTransactions.filter(
					transaction => transaction.type !== 1,
				);

				nonVerifiableTransactions = [
					liskTransactions.transfer({
						amount: (NORMALIZER * 1000).toString(),
						recipientId: accountFixtures.genesis.address,
						passphrase: random.account().passphrase,
					}),
				].map(transaction =>
					interfaceAdapters.transactions.fromJson(transaction),
				);

				keysgroup = new Array(4).fill(0).map(() => random.account().publicKey);

				pendingTransactions = [
					liskTransactions.registerMultisignature({
						passphrase: account.passphrase,
						keysgroup,
						lifetime: 10,
						minimum: 2,
					}),
				].map(transaction =>
					interfaceAdapters.transactions.fromJson(transaction),
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

				beforeEach(async () => {
					verifyTransactions = transactionsModule.verifyTransactions(
						library.components.storage,
						slots,
						exceptions,
					);
				});

				it('should return transactionsResponses with status OK for verified transactions', async () => {
					const { transactionsResponses } = await verifyTransactions(
						verifiableTransactions,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.OK);
					});
				});

				it('should return transactionsResponses with status FAIL for unverifiable transaction', async () => {
					const { transactionsResponses } = await verifyTransactions(
						nonVerifiableTransactions,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.FAIL);
					});
				});

				it('should return transactionsResponses with status PENDING for transactions waiting multi-signatures', async () => {
					const { transactionsResponses } = await verifyTransactions(
						pendingTransactions,
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
				beforeEach(done => {
					undoTransactions = transactionsModule.undoTransactions(
						library.components.storage,
						exceptions,
					);
					localCommon.addTransactionsAndForge(
						library,
						appliableTransactions.map(appliableTransaction =>
							appliableTransaction.toJSON(),
						),
						0,
						done,
					);
				});

				it('should return stateStore', async () => {
					const { stateStore } = await undoTransactions(appliableTransactions);
					expect(stateStore).to.exist;
				});

				it('should return transactionsResponses with status OK for verified transactions', async () => {
					const { transactionsResponses } = await undoTransactions(
						appliableTransactions,
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

					const { transactionsResponses } = await undoTransactions([
						interfaceAdapters.transactions.fromJson(
							liskTransactions.transfer({
								amount: (NORMALIZER * 1000).toString(),
								recipientId: recipient.address,
								passphrase: sender.passphrase,
							}),
						),
					]);

					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.FAIL);
					});
				});
			});

			describe('applyTransactions', () => {
				let applyTransactions;
				beforeEach(async () => {
					applyTransactions = transactionsModule.applyTransactions(
						library.components.storage,
						exceptions,
					);
				});

				it('should return stateStore', async () => {
					const { stateStore } = await applyTransactions(appliableTransactions);

					expect(stateStore).to.exist;
				});

				it('should return transactionsResponses with status OK for verified transactions', async () => {
					const { transactionsResponses } = await applyTransactions(
						appliableTransactions,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.OK);
					});
				});

				it('should return transactionsResponses with status FAIL for unverifiable transaction', async () => {
					const { transactionsResponses } = await applyTransactions(
						nonVerifiableTransactions,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(transactionStatus.FAIL);
					});
				});

				it('should return transactionsResponses with status PENDING for transactions waiting multi-signatures', async () => {
					const { transactionsResponses } = await applyTransactions(
						pendingTransactions,
					);
					transactionsResponses.forEach(transactionResponse => {
						expect(transactionResponse.status).to.equal(
							transactionStatus.PENDING,
						);
					});
				});

				it('should call votes.apply with correct params', async () => {
					sinonSandbox.spy(votes, 'apply');
					const { stateStore } = await applyTransactions(appliableTransactions);
					expect(votes.apply.firstCall.args).to.be.eql([
						stateStore,
						appliableTransactions[0],
						exceptions,
					]);
				});
			});
		});
	});
});
