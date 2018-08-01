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
const accountsFixtures = require('../../../../fixtures/accounts');
const randomUtil = require('../../../../common/utils/random');
const localCommon = require('../../common');

describe('duplicate_signatures', () => {
	let library;
	let addTransactionsAndForgePromise;

	localCommon.beforeBlock('lisk_functional_duplicate_signatures', lib => {
		library = lib;

		addTransactionsAndForgePromise = Promise.promisify(
			localCommon.addTransactionsAndForge
		);
	});

	describe('process multiple signatures (including duplicated) for the same transaction', () => {
		let transactionPool;
		const accounts = {
			multisignatureMembers: [],
		};
		const transactions = {
			transfer: [],
			multisignature: [],
		};

		before(() => {
			transactionPool = library.rewiredModules.transactions.__get__(
				'__private.transactionPool'
			);

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
			transactions.transfer.push(transaction);

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

			// Create signatures (strings)
			const signature1 = elements.transaction.createSignatureObject(
				transaction,
				accounts.multisignatureMembers[0].passphrase
			);
			const signature2 = elements.transaction.createSignatureObject(
				transaction,
				accounts.multisignatureMembers[1].passphrase
			);

			// Mark transaction as ready, so it can get processed instantly
			transaction.ready = true;
			// Add signatures to transaction
			transaction.signatures = [signature1.signature, signature2.signature];
			transactions.multisignature.push(transaction);

			// Execute transfer transaction - credit new account
			return addTransactionsAndForgePromise(
				library,
				transactions.transfer,
				0
			).then(() => {
				// Execute multisignature creation on account credited above
				return addTransactionsAndForgePromise(
					library,
					transactions.multisignature,
					0
				);
			});
		});

		it('should accept all signatures when unique', done => {
			// Create random accounts that we will sent funds to
			accounts.random = randomUtil.account();

			// Create transfer transaction (fund new account)
			let transaction = elements.transaction.transfer({
				recipientId: accounts.random.address,
				amount: 100000000,
				passphrase: accounts.multisignature.passphrase,
			});

			// Create signatures (objects)
			const signature1 = elements.transaction.createSignatureObject(
				transaction,
				accounts.multisignatureMembers[0].passphrase
			);
			const signature2 = elements.transaction.createSignatureObject(
				transaction,
				accounts.multisignatureMembers[1].passphrase
			);

			localCommon.addTransaction(library, transaction, err => {
				// There should be no error when add transaction to transaction pool
				expect(err).to.be.null;
				// Transaction should be present in transaction pool
				expect(transactionPool.transactionInPool(transaction.id)).to.equal(
					true
				);
				// Transaction should exists in multisignature queue
				expect(
					transactionPool.getMultisignatureTransaction(transaction.id)
				).to.be.an('object');

				// Block balancesSequence for 5 seconds
				library.balancesSequence.add(cb => {
					setTimeout(cb, 5000);
				});

				// Make node receive 2 different signatures in parallel
				async.parallel(
					async.reflectAll([
						parallelCb => {
							library.modules.multisignatures.processSignature(
								signature1,
								parallelCb
							);
						},
						parallelCb => {
							library.modules.multisignatures.processSignature(
								signature2,
								parallelCb
							);
						},
					]),
					(err, results) => {
						// There should be no error from processing
						expect(results[0].value).to.be.undefined;
						expect(results[1].value).to.be.undefined;

						// Get multisignature transaction from pool
						transaction = transactionPool.getMultisignatureTransaction(
							transaction.id
						);

						// There should be 2 signatures
						expect(transaction.signatures).to.have.lengthOf(2);

						// Forge a block
						addTransactionsAndForgePromise(library, [], 0).then(() => {
							const lastBlock = library.modules.blocks.lastBlock.get();
							// Block should contain transaction sent from multisignature account
							expect(lastBlock.transactions[0].id).to.eql(transaction.id);
							// There should be 2 signatures
							expect(transaction.signatures).to.have.lengthOf(2);
							done();
						});
					}
				);
			});
		});

		it('should reject signature when there is a duplicate', done => {
			// Create random accounts that we will sent funds to
			accounts.random = randomUtil.account();

			// Create transfer transaction (fund new account)
			let transaction = elements.transaction.transfer({
				recipientId: accounts.random.address,
				amount: 100000000,
				passphrase: accounts.multisignature.passphrase,
			});

			// Create signatures (objects)
			const signature1 = elements.transaction.createSignatureObject(
				transaction,
				accounts.multisignatureMembers[0].passphrase
			);
			const signature2 = elements.transaction.createSignatureObject(
				transaction,
				accounts.multisignatureMembers[1].passphrase
			);

			localCommon.addTransaction(library, transaction, err => {
				// There should be no error when add transaction to transaction pool
				expect(err).to.be.null;
				// Transaction should be present in transaction pool
				expect(transactionPool.transactionInPool(transaction.id)).to.equal(
					true
				);
				// Transaction should exists in multisignature queue
				expect(
					transactionPool.getMultisignatureTransaction(transaction.id)
				).to.be.an('object');

				// Block balancesSequence for 5 seconds
				library.balancesSequence.add(cb => {
					setTimeout(cb, 5000);
				});

				// Make node receive 3 signatures in parallel (1 duplicated)
				async.parallel(
					async.reflectAll([
						parallelCb => {
							library.modules.multisignatures.processSignature(
								signature1,
								parallelCb
							);
						},
						parallelCb => {
							library.modules.multisignatures.processSignature(
								signature1,
								parallelCb
							);
						},
						parallelCb => {
							library.modules.multisignatures.processSignature(
								signature2,
								parallelCb
							);
						},
					]),
					(err, results) => {
						// There should be an error from processing only for duplicated signature
						expect(results[0].value).to.be.undefined;
						expect(results[1].error).to.eql('Signature already exists');
						expect(results[2].value).to.be.undefined;

						// Get multisignature transaction from pool
						transaction = transactionPool.getMultisignatureTransaction(
							transaction.id
						);

						// There should be 2 signatures
						expect(transaction.signatures).to.have.lengthOf(2);

						// Forge a block
						addTransactionsAndForgePromise(library, [], 0).then(() => {
							const lastBlock = library.modules.blocks.lastBlock.get();
							// Block should contain transaction sent from multisignature account
							expect(lastBlock.transactions[0].id).to.eql(transaction.id);
							// There should be 2 signatures
							expect(transaction.signatures).to.have.lengthOf(2);
							done();
						});
					}
				);
			});
		});
	});
});
