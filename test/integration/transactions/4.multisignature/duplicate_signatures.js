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

const Promise = require('bluebird');
const async = require('async');
const elements = require('lisk-elements').default;
const accountsFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');

describe('duplicate_signatures', () => {
	let library;
	let addTransactionsAndForgePromise;
	let transactionPool;

	localCommon.beforeBlock('lisk_functional_duplicate_signatures', lib => {
		library = lib;

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge
		);

		transactionPool = library.rewiredModules.transactions.__get__(
			'__private.transactionPool'
		);
	});

	const prepareMultisignatureAccountRegistration = () => {
		const accounts = {
			multisignatureMembers: [],
		};
		const transactions = {
			transfer: [],
			multisignature: [],
		};
		const signatures = [];

		// Create random account to use as multisignature owner
		accounts.multisignature = randomUtil.account();
		// Create 2 random accounts to use as multisignature members
		accounts.multisignatureMembers.push(
			randomUtil.account(),
			randomUtil.account()
		);

		// Create transfer transaction (fund new account)
		let transaction = elements.transaction.transfer({
			recipientId: accounts.multisignature.address,
			amount: 5000000000,
			passphrase: accountsFixtures.genesis.passphrase,
		});
		transactions.transfer = transaction;

		// Create multisignature registration transaction
		transaction = elements.transaction.registerMultisignature({
			passphrase: accounts.multisignature.passphrase,
			keysgroup: [
				accounts.multisignatureMembers[0].publicKey,
				accounts.multisignatureMembers[1].publicKey,
			],
			lifetime: 4,
			minimum: 2,
		});
		transactions.multisignature = transaction;

		// Create signatures (object)
		signatures.push(
			elements.transaction.createSignatureObject(
				transaction,
				accounts.multisignatureMembers[0].passphrase
			)
		);
		signatures.push(
			elements.transaction.createSignatureObject(
				transaction,
				accounts.multisignatureMembers[1].passphrase
			)
		);

		return [transactions, signatures, accounts];
	};

	const prepareSendFromMultisignatureAccount = accounts => {
		const signatures = [];
		const transactions = {};

		// Create random accounts that we will sent funds to
		accounts.random = randomUtil.account();

		// Create transfer transaction (fund new account)
		const transaction = elements.transaction.transfer({
			recipientId: accounts.random.address,
			amount: 100000000,
			passphrase: accounts.multisignature.passphrase,
		});
		transactions.transfer = transaction;

		// Create signatures (object)
		signatures.push(
			elements.transaction.createSignatureObject(
				transaction,
				accounts.multisignatureMembers[0].passphrase
			)
		);
		signatures.push(
			elements.transaction.createSignatureObject(
				transaction,
				accounts.multisignatureMembers[1].passphrase
			)
		);

		return [transactions, signatures];
	};

	describe('process multiple signatures for the same transaction', () => {
		describe('when signatures are unique', () => {
			describe('during multisignature account registration', () => {
				let transactions;
				let signatures;

				before('credit new account', () => {
					[
						transactions,
						signatures,
					] = prepareMultisignatureAccountRegistration();
					// Execute transfer transaction - credit new account
					return addTransactionsAndForgePromise(
						library,
						[transactions.transfer],
						0
					);
				});

				it('should add transaction to transaction pool', done => {
					// Add transaction to transaction pool
					localCommon.addTransaction(
						library,
						transactions.multisignature,
						err => {
							// There should be no error when add transaction to transaction pool
							expect(err).to.be.null;
							// Transaction should be present in transaction pool
							expect(
								transactionPool.transactionInPool(
									transactions.multisignature.id
								)
							).to.equal(true);
							// Transaction should exists in multisignature queue
							expect(
								transactionPool.getMultisignatureTransaction(
									transactions.multisignature.id
								)
							).to.be.an('object');
							done();
						}
					);
				});

				it('should accept all signatures', done => {
					// Block balancesSequence for 2 seconds
					library.balancesSequence.add(cb => {
						setTimeout(cb, 2000);
					});

					// Make node receive 2 different signatures in parallel
					async.parallel(
						async.reflectAll([
							parallelCb => {
								library.modules.multisignatures.processSignature(
									signatures[0],
									parallelCb
								);
							},
							parallelCb => {
								library.modules.multisignatures.processSignature(
									signatures[1],
									parallelCb
								);
							},
						]),
						(err, results) => {
							// There should be no error from processing
							expect(results[0].value).to.be.undefined;
							expect(results[1].value).to.be.undefined;

							// Get transaction from pool
							const transaction = transactionPool.getMultisignatureTransaction(
								transactions.multisignature.id
							);

							// There should be 2 signatures
							expect(transaction.signatures).to.have.lengthOf(2);
							done();
						}
					);
				});

				it('should forge a block', () => {
					// Forge a block
					return addTransactionsAndForgePromise(library, [], 0).then(() => {
						const lastBlock = library.modules.blocks.lastBlock.get();
						// Block should contain multisignature registration transaction
						expect(lastBlock.transactions[0].id).to.eql(
							transactions.multisignature.id
						);
						// There should be 2 signatures
						expect(lastBlock.transactions[0].signatures).to.have.lengthOf(2);
					});
				});
			});

			describe('during spend from multisignature account', () => {
				let accounts;
				let transactions;
				let signatures;

				before('create multisignature account', () => {
					[
						transactions,
						signatures,
						accounts,
					] = prepareMultisignatureAccountRegistration();
					// Mark transaction as ready, so it can get processed instantly
					transactions.multisignature.ready = true;
					// Add signatures to transaction
					transactions.multisignature.signatures = [
						signatures[0].signature,
						signatures[1].signature,
					];

					// Execute transfer transaction - credit new account
					return addTransactionsAndForgePromise(
						library,
						[transactions.transfer],
						0
					).then(() => {
						// Execute multisignature creation on account credited above
						return addTransactionsAndForgePromise(
							library,
							[transactions.multisignature],
							0
						);
					});
				});

				it('should add transaction to transaction pool', done => {
					[transactions, signatures] = prepareSendFromMultisignatureAccount(
						accounts
					);

					// Add multisignature transaction to transaction pool
					localCommon.addTransaction(library, transactions.transfer, err => {
						// There should be no error when add transaction to transaction pool
						expect(err).to.be.null;
						// Transaction should be present in transaction pool
						expect(
							transactionPool.transactionInPool(transactions.transfer.id)
						).to.equal(true);
						// Transaction should exists in multisignature queue
						expect(
							transactionPool.getMultisignatureTransaction(
								transactions.transfer.id
							)
						).to.be.an('object');
						done();
					});
				});

				it('should accept all signatures', done => {
					// Block balancesSequence for 2 seconds
					library.balancesSequence.add(cb => {
						setTimeout(cb, 2000);
					});

					// Make node receive 2 different signatures in parallel
					async.parallel(
						async.reflectAll([
							parallelCb => {
								library.modules.multisignatures.processSignature(
									signatures[0],
									parallelCb
								);
							},
							parallelCb => {
								library.modules.multisignatures.processSignature(
									signatures[1],
									parallelCb
								);
							},
						]),
						(err, results) => {
							// There should be no error from processing
							expect(results[0].value).to.be.undefined;
							expect(results[1].value).to.be.undefined;

							// Get transaction from pool
							const transaction = transactionPool.getMultisignatureTransaction(
								transactions.transfer.id
							);

							// There should be 2 signatures
							expect(transaction.signatures).to.have.lengthOf(2);
							done();
						}
					);
				});

				it('should forge a block', () => {
					// Forge a block
					return addTransactionsAndForgePromise(library, [], 0).then(() => {
						const lastBlock = library.modules.blocks.lastBlock.get();
						// Block should contain transaction sent from multisignature account
						expect(lastBlock.transactions[0].id).to.eql(
							transactions.transfer.id
						);
						// There should be 2 signatures
						expect(lastBlock.transactions[0].signatures).to.have.lengthOf(2);
					});
				});
			});
		});

		describe('when signatures contains duplicate', () => {
			describe('during multisignature account registration', () => {
				let transactions;
				let signatures;

				before('credit new account', () => {
					[
						transactions,
						signatures,
					] = prepareMultisignatureAccountRegistration();
					// Execute transfer transaction - credit new account
					return addTransactionsAndForgePromise(
						library,
						[transactions.transfer],
						0
					);
				});

				it('should add transaction to transaction pool', done => {
					// Add multisignature transaction to transaction pool
					localCommon.addTransaction(
						library,
						transactions.multisignature,
						err => {
							// There should be no error when add transaction to transaction pool
							expect(err).to.be.null;
							// Transaction should be present in transaction pool
							expect(
								transactionPool.transactionInPool(
									transactions.multisignature.id
								)
							).to.equal(true);
							// Transaction should exists in multisignature queue
							expect(
								transactionPool.getMultisignatureTransaction(
									transactions.multisignature.id
								)
							).to.be.an('object');
							done();
						}
					);
				});

				it('should reject duplicated signature', done => {
					// Block balancesSequence for 2 seconds
					library.balancesSequence.add(cb => {
						setTimeout(cb, 2000);
					});

					// Make node receive 3 signatures in parallel (1 duplicated)
					async.parallel(
						async.reflectAll([
							parallelCb => {
								library.modules.multisignatures.processSignature(
									signatures[0],
									parallelCb
								);
							},
							parallelCb => {
								library.modules.multisignatures.processSignature(
									signatures[0],
									parallelCb
								);
							},
							parallelCb => {
								library.modules.multisignatures.processSignature(
									signatures[1],
									parallelCb
								);
							},
						]),
						(err, results) => {
							// There should be an error from processing only for duplicated signature
							expect(results[0].value).to.be.undefined;
							expect(results[1].error.message).to.eql(
								'Unable to process signature, signature already exists'
							);
							expect(results[2].value).to.be.undefined;

							// Get transaction from pool
							const transaction = transactionPool.getMultisignatureTransaction(
								transactions.multisignature.id
							);

							// There should be 2 signatures
							expect(transaction.signatures).to.have.lengthOf(2);
							done();
						}
					);
				});

				it('should forge a block', () => {
					// Forge a block
					return addTransactionsAndForgePromise(library, [], 0).then(() => {
						const lastBlock = library.modules.blocks.lastBlock.get();
						// Block should contain multisignature registration transaction
						expect(lastBlock.transactions[0].id).to.eql(
							transactions.multisignature.id
						);
						// There should be 2 signatures
						expect(lastBlock.transactions[0].signatures).to.have.lengthOf(2);
					});
				});
			});

			describe('during spend from multisignature account', () => {
				let accounts;
				let transactions;
				let signatures;

				before('create multisignature account', () => {
					[
						transactions,
						signatures,
						accounts,
					] = prepareMultisignatureAccountRegistration();
					// Mark transaction as ready, so it can get processed instantly
					transactions.multisignature.ready = true;
					// Add signatures to transaction
					transactions.multisignature.signatures = [
						signatures[0].signature,
						signatures[1].signature,
					];

					// Execute transfer transaction - credit new account
					return addTransactionsAndForgePromise(
						library,
						[transactions.transfer],
						0
					).then(() => {
						// Execute multisignature creation on account credited above
						return addTransactionsAndForgePromise(
							library,
							[transactions.multisignature],
							0
						);
					});
				});

				it('should add transaction to transaction pool', done => {
					[transactions, signatures] = prepareSendFromMultisignatureAccount(
						accounts
					);

					// Add multisignature transaction to transaction pool
					localCommon.addTransaction(library, transactions.transfer, err => {
						// There should be no error when add transaction to transaction pool
						expect(err).to.be.null;
						// Transaction should be present in transaction pool
						expect(
							transactionPool.transactionInPool(transactions.transfer.id)
						).to.equal(true);
						// Transaction should exists in multisignature queue
						expect(
							transactionPool.getMultisignatureTransaction(
								transactions.transfer.id
							)
						).to.be.an('object');
						done();
					});
				});

				it('should reject duplicated signature', done => {
					// Block balancesSequence for 2 seconds
					library.balancesSequence.add(cb => {
						setTimeout(cb, 2000);
					});

					// Make node receive 3 signatures in parallel (1 duplicated)
					async.parallel(
						async.reflectAll([
							parallelCb => {
								library.modules.multisignatures.processSignature(
									signatures[0],
									parallelCb
								);
							},
							parallelCb => {
								library.modules.multisignatures.processSignature(
									signatures[0],
									parallelCb
								);
							},
							parallelCb => {
								library.modules.multisignatures.processSignature(
									signatures[1],
									parallelCb
								);
							},
						]),
						(err, results) => {
							// There should be an error from processing only for duplicated signature
							expect(results[0].value).to.be.undefined;
							expect(results[1].error.message).to.eql(
								'Unable to process signature, signature already exists'
							);
							expect(results[2].value).to.be.undefined;

							// Get transaction from pool
							const transaction = transactionPool.getMultisignatureTransaction(
								transactions.transfer.id
							);

							// There should be 2 signatures
							expect(transaction.signatures).to.have.lengthOf(2);
							done();
						}
					);
				});

				it('should forge a block', () => {
					// Forge a block
					return addTransactionsAndForgePromise(library, [], 0).then(() => {
						const lastBlock = library.modules.blocks.lastBlock.get();
						// Block should contain transaction sent from multisignature account
						expect(lastBlock.transactions[0].id).to.eql(
							transactions.transfer.id
						);
						// There should be 2 signatures
						expect(lastBlock.transactions[0].signatures).to.have.lengthOf(2);
					});
				});
			});
		});
	});
});
