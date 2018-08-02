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
		signatures.push(elements.transaction.createSignatureObject(
			transaction,
			accounts.multisignatureMembers[0].passphrase
		));
		signatures.push(elements.transaction.createSignatureObject(
			transaction,
			accounts.multisignatureMembers[1].passphrase
		));

		return [accounts, transactions, signatures];
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
		signatures.push(elements.transaction.createSignatureObject(
			transaction,
			accounts.multisignatureMembers[0].passphrase
		));
		signatures.push(elements.transaction.createSignatureObject(
			transaction,
			accounts.multisignatureMembers[1].passphrase
		));

		return [accounts, transactions, signatures];
	};

	describe('process multiple signatures for the same transaction', () => {
		describe('when signatures are unique', () => {
			describe('during multisignature account registration', () => {
				let accounts, transactions, signatures;

				before('credit new account', () => {
					[accounts, transactions, signatures] = prepareMultisignatureAccountRegistration();
					// Execute transfer transaction - credit new account
					return addTransactionsAndForgePromise(library, [transactions.transfer], 0);
				});

				it('should add transaction to transaction pool', () => {

				});

				it('should accept all signatures', () => {

				});

				it('should forge a block', () => {

				});
			});

			describe('during spend from multisignature account', () => {
				let accounts, transactions, signatures;

				before('create multisignature account', () => {
					[accounts, transactions, signatures] = prepareMultisignatureAccountRegistration();
					// Mark transaction as ready, so it can get processed instantly
					transactions.multisignature.ready = true;
					// Add signatures to transaction
					transactions.multisignature.signatures = [signatures[0].signature, signatures[1].signature];

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

				it('should add transaction to transaction pool', () => {

				});

				it('should accept all signatures', () => {

				});

				it('should forge a block', () => {

				});
			});
		});

		describe('when signatures contains duplicate', () => {
			describe('during multisignature account registration', () => {
				let accounts, transactions, signatures;

				before('credit new account', () => {
					[accounts, transactions, signatures] = prepareMultisignatureAccountRegistration();
					// Execute transfer transaction - credit new account
					return addTransactionsAndForgePromise(library, [transactions.transfer], 0);
				});

				it('should add transaction to transaction pool', () => {

				});

				it('should reject duplicated signature', () => {

				});

				it('should forge a block', () => {

				});
			});

			describe('during spend from multisignature account', () => {
				let accounts, transactions, signatures;

				before('create multisignature account', () => {
					[accounts, transactions, signatures] = prepareMultisignatureAccountRegistration();
					// Mark transaction as ready, so it can get processed instantly
					transactions.multisignature.ready = true;
					// Add signatures to transaction
					transactions.multisignature.signatures = [signatures[0].signature, signatures[1].signature];

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

				it('should add transaction to transaction pool', () => {

				});

				it('should reject duplicated signature', () => {

				});

				it('should forge a block', () => {

				});
			});
		});
	});
});
