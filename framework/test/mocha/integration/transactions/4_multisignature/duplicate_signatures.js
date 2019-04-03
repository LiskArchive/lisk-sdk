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
const {
	transfer,
	registerMultisignature,
	createSignatureObject,
} = require('@liskhq/lisk-transactions');
const accountsFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');
const Bignum = require('../../../../../src/modules/chain/helpers/bignum');

const exceptions = global.exceptions;

describe('duplicate_signatures', () => {
	let library;
	let addTransactionsAndForgePromise;
	let transactionPool;

	localCommon.beforeBlock('duplicate_signatures', lib => {
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
		let transaction = transfer({
			recipientId: accounts.multisignature.address,
			amount: '5000000000',
			passphrase: accountsFixtures.genesis.passphrase,
		});
		transactions.transfer = transaction;

		// Create multisignature registration transaction
		transaction = registerMultisignature({
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
			createSignatureObject(
				transaction,
				accounts.multisignatureMembers[0].passphrase
			)
		);
		signatures.push(
			createSignatureObject(
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
		const transaction = transfer({
			recipientId: accounts.random.address,
			amount: '100000000',
			passphrase: accounts.multisignature.passphrase,
		});
		transactions.transfer = transaction;

		// Create signatures (object)
		signatures.push(
			createSignatureObject(
				transaction,
				accounts.multisignatureMembers[0].passphrase
			)
		);
		signatures.push(
			createSignatureObject(
				transaction,
				accounts.multisignatureMembers[1].passphrase
			)
		);

		return [transactions, signatures];
	};

	describe('process multiple signatures from the same public key', () => {
		const transaction = {
			type: 0,
			id: '15181013796707110990',
			timestamp: 77612766,
			senderPublicKey:
				'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
			senderId: '4368107197830030479L',
			recipientId: '4368107197830030479L',
			recipientPublicKey:
				'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
			amount: new Bignum('100000000'),
			fee: new Bignum('10000000'),
			signature:
				'dc8fe25f817c81572585b3769f3c6df13d3dc93ff470b2abe807f43a3359ed94e9406d2539013971431f2d540e42dc7d3d71c7442da28572c827d59adc5dfa08',
			signatures: [
				'2df1fae6865ec72783dcb5f87a7d906fe20b71e66ad9613c01a89505ebd77279e67efa2c10b5ad880abd09efd27ea350dd8a094f44efa3b4b2c8785fbe0f7e00',
				'2ec5bbc4ff552f991262867cd8f1c30a417e4596e8343d882b7c4fc86288b9e53592031f3de75ffe8cf4d431a7291b76c758999bb52f46a4da62a27c8901b60a',
				'36d5c7da5f54007e22609105570fad04597f4f2b00d46baba603c213eaed8de55e9f3e5d0f39789dbc396330b2d9d4da46b7d67187075e86220bc0341c3f7802',
			],
			asset: {
				data: 'the real test',
			},
		};

		const sender = {
			address: '4368107197830030479L',
			publicKey:
				'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
			membersPublicKeys: [
				'c44a88e68196e4d2f608873467c7350fb92b954eb7c3b31a989b1afd8d55ebdb',
				'2eca11a4786f35f367299e1defd6a22ac4eb25d2552325d6c5126583a3bdd0fb',
				'a17e03f21bfa187d2a30fe389aa78431c587bf850e9fa851b3841274fc9f100f',
				'758fc45791faf5796e8201e49950a9ee1ee788192714b935be982f315b1af8cd',
				'9af12d260cf5fcc49bf8e8fce2880b34268c7a4ac8915e549c07429a01f2e4a5',
			],
			balance: new Bignum('10000000000'),
			u_balance: new Bignum('10000000000'),
		};

		it('should call a callback with error when there are multiple signatures', done => {
			const requester = null;
			const lib = library.rewiredModules.transactions.__get__('library');
			lib.logic.transaction.verify(
				transaction,
				sender,
				requester,
				false,
				err => {
					expect(err).to.equal(
						`Failed to verify multisignature: ${transaction.signatures[1]}`
					);
					done();
				},
				null
			);
		});

		it('should call a callback with no error when exception is in place', done => {
			const requester = null;
			const lib = library.rewiredModules.transactions.__get__('library');
			exceptions.duplicatedSignatures = {
				'15181013796707110990': [
					'2ec5bbc4ff552f991262867cd8f1c30a417e4596e8343d882b7c4fc86288b9e53592031f3de75ffe8cf4d431a7291b76c758999bb52f46a4da62a27c8901b60a',
					'36d5c7da5f54007e22609105570fad04597f4f2b00d46baba603c213eaed8de55e9f3e5d0f39789dbc396330b2d9d4da46b7d67187075e86220bc0341c3f7802',
				],
			};
			lib.logic.transaction.verify(
				transaction,
				sender,
				requester,
				false,
				err => {
					expect(err).not.exist;
					done();
				},
				null
			);
		});
	});

	describe('process multiple signatures for the same transaction', () => {
		describe('when signatures are unique', () => {
			describe('during multisignature account registration', () => {
				let transactions;
				let signatures;

				before('credit new account', async () => {
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

				it('should forge a block', async () => {
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

				before('create multisignature account', async () => {
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

				it('should forge a block', async () => {
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

				before('credit new account', async () => {
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

				it('should forge a block', async () => {
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

				before('create multisignature account', async () => {
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

				it('should forge a block', async () => {
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
