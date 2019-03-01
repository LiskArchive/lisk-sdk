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

const liskTransactions = require('@liskhq/lisk-transactions');
const accountFixtures = require('../fixtures/accounts');
const application = require('../common/application');
const random = require('../common/utils/random');

const genesisBlock = __testContext.config.genesisBlock;
const { NORMALIZER } = global.constants;
const transactionStatus = liskTransactions.Status;

describe('blocks/verifyTransactions', () => {
	let library;
	const account = random.account();

	const verifiableTransactions = [
		liskTransactions.transfer({
			amount: (NORMALIZER * 1000).toString(),
			recipientId: account.address,
			passphrase: accountFixtures.genesis.passphrase,
		}),
		liskTransactions.registerDelegate({
			passphrase: accountFixtures.genesis.passphrase,
			username: account.username,
		}),
		liskTransactions.registerSecondPassphrase({
			passphrase: accountFixtures.genesis.passphrase,
			secondPassphrase: account.secondPassphrase,
		}),
		liskTransactions.castVotes({
			passphrase: accountFixtures.genesis.passphrase,
			votes: [`${accountFixtures.existingDelegate.publicKey}`],
		}),
		liskTransactions.createDapp({
			passphrase: accountFixtures.genesis.passphrase,
			options: random.application(),
		}),
	].map(transaction => ({
		...transaction,
		senderId: accountFixtures.genesis.address,
	}));

	// If we include second signature transaction, then the rest of the transactions in the set will be required to have second signature.
	// Therefore removing it from the appliable transactions
	const appliableTransactions = verifiableTransactions.filter(
		transaction => transaction.type !== 1
	);

	const nonVerifiableTransactions = [
		liskTransactions.transfer({
			amount: (NORMALIZER * 1000).toString(),
			recipientId: accountFixtures.genesis.address,
			passphrase: account.passphrase,
		}),
	].map(transaction => ({ ...transaction, senderId: account.address }));

	const keysgroup = new Array(4).fill(0).map(() => random.account().publicKey);

	const pendingTransactions = [
		liskTransactions.registerMultisignature({
			passphrase: accountFixtures.genesis.passphrase,
			keysgroup,
			lifetime: 10,
			minimum: 2,
		}),
	].map(transaction => ({
		...transaction,
		senderId: accountFixtures.genesis.address,
	}));

	before(done => {
		application.init(
			{
				sandbox: {
					name: 'lisk_test_blocks_verify_transactions',
				},
			},
			(err, scope) => {
				library = scope;
				library.modules.blocks.lastBlock.set(genesisBlock);
				done();
			}
		);
	});

	describe('verifyTransactions', () => {
		let verifyTransactions;

		beforeEach(async () => {
			verifyTransactions =
				library.modules.processTransactions.verifyTransactions;
		});

		it('should return transactionResponses with status OK for verified transactions', async () => {
			const transactionResponses = await verifyTransactions(
				verifiableTransactions
			);
			transactionResponses.forEach(transactionResponse => {
				expect(transactionResponse.status).to.equal(transactionStatus.OK);
			});
		});

		it('should return transactionResponse with status FAIL for unverifiable transaction', async () => {
			const transactionResponses = await verifyTransactions(
				nonVerifiableTransactions
			);
			transactionResponses.forEach(transactionResponse => {
				expect(transactionResponse.status).to.equal(transactionStatus.FAIL);
			});
		});

		it('should return transactionResponse with status PENDING for transactions waiting multi-signatures', async () => {
			const transactionResponses = await verifyTransactions(
				pendingTransactions
			);
			transactionResponses.forEach(transactionResponse => {
				expect(transactionResponse.status).to.equal(transactionStatus.PENDING);
			});
		});
	});

	describe('applyTransactions', () => {
		let applyTransactions;
		beforeEach(async () => {
			applyTransactions = library.modules.processTransactions.applyTransactions;
		});

		it('should return stateStore', async () => {
			const { stateStore } = await applyTransactions(appliableTransactions);

			expect(stateStore).to.exist;
		});

		it('should return transactionResponses with status OK for verified transactions', async () => {
			const { transactionResponses } = await applyTransactions(
				appliableTransactions
			);
			transactionResponses.forEach(transactionResponse => {
				expect(transactionResponse.status).to.equal(transactionStatus.OK);
			});
		});

		it('should return transactionResponse with status FAIL for unverifiable transaction', async () => {
			const { transactionResponses } = await applyTransactions(
				nonVerifiableTransactions
			);
			transactionResponses.forEach(transactionResponse => {
				expect(transactionResponse.status).to.equal(transactionStatus.FAIL);
			});
		});

		it('should return transactionResponse with status PENDING for transactions waiting multi-signatures', async () => {
			const { transactionResponses } = await applyTransactions(
				pendingTransactions
			);
			transactionResponses.forEach(transactionResponse => {
				expect(transactionResponse.status).to.equal(transactionStatus.PENDING);
			});
		});
	});
});
