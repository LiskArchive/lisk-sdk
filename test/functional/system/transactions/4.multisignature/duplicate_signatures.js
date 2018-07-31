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
			const signature1 = elements.transaction.utils.multiSignTransaction(
				transaction,
				accounts.multisignatureMembers[0].passphrase
			);
			const signature2 = elements.transaction.utils.multiSignTransaction(
				transaction,
				accounts.multisignatureMembers[1].passphrase
			);

			// Mark transaction as ready, so it can get processed instantly
			transaction.ready = true;
			// Add signatures to transaction
			transaction.signatures = [signature1, signature2];
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
	});
});
