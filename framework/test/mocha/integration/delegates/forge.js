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

const util = require('util');
const { transfer } = require('@liskhq/lisk-transactions');
const application = require('../../common/application');
const Bignum = require('../../../../src/modules/chain/helpers/bignum');
const random = require('../../common/utils/random');
const accountFixtures = require('../../fixtures/accounts');

const genesisBlock = __testContext.config.genesisBlock;
const { NORMALIZER } = global.__testContext.config;

const localCommon = require('../common');

const addTransactionsAndForge = util.promisify(
	localCommon.addTransactionsAndForge
);
const transactionInPool = localCommon.transactionInPool;
const addTransaction = util.promisify(localCommon.addTransaction);
const forge = util.promisify(localCommon.forge);

let library;

describe('delegates (forge)', () => {
	before(done => {
		application.init(
			{
				sandbox: {
					name: 'lisk_test_delegates_forge',
				},
			},
			(err, scope) => {
				library = scope;
				library.modules.blocks.lastBlock.set(genesisBlock);
				done();
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('forge', () => {
		describe('total spending', () => {
			it('should not include transactions which exceed total spending per account balance', async () => {
				// Transfer 1LSK to account
				const account = random.account();
				const transaction = transfer({
					amount: new Bignum(NORMALIZER).multipliedBy(1).toString(),
					recipientId: account.address,
					passphrase: accountFixtures.genesis.passphrase,
				});
				await addTransactionsAndForge(library, [transaction], 0);

				// Transfer 0.5 LSK to a random account - The account balance would be 0.4
				const spend_06 = transfer({
					amount: new Bignum(NORMALIZER).multipliedBy(0.6).toString(),
					recipientId: random.account().address,
					passphrase: account.passphrase,
				});

				// Transfer 0.5 LSK to a random account - The account balance would be -0.2
				const spend_04 = transfer({
					amount: new Bignum(NORMALIZER).multipliedBy(0.4).toString(),
					recipientId: random.account().address,
					passphrase: account.passphrase,
				});

				// Transfer 0.3 LSK to that account - The account balance would be 0.1
				const credit_03 = transfer({
					amount: new Bignum(NORMALIZER).multipliedBy(0.3).toString(),
					recipientId: account.address,
					passphrase: accountFixtures.genesis.passphrase,
				});

				// Add the transactions to pool and forge
				await addTransaction(library, credit_03);
				await addTransaction(library, spend_06);
				await addTransaction(library, spend_04);
				// await fillPool(library);
				await forge(library);

				// Get the last forged block
				const transactionsInLastBlock = library.modules.blocks.lastBlock
					.get()
					.transactions.map(t => t.id);

				// Last block should contain only 2 transactions
				// The smallest first as we sort transactions by amount while forging
				expect(transactionsInLastBlock).to.be.eql([credit_03.id, spend_04.id]);

				// Un-applied transaction must be deleted from the pool
				expect(transactionInPool(library, spend_06.id)).to.be.false;

				// To verify that transaction was removed from the pool
				await forge(library);
				const lastBlock = library.modules.blocks.lastBlock.get();
				expect(lastBlock.transactions).to.lengthOf(0);
			});
		});
	});
});
