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

const { transfer, registerDelegate } = require('@liskhq/lisk-transactions');
const expect = require('chai').expect;
const accountFixtures = require('../../../fixtures/accounts');
const localCommon = require('../../common');
const randomUtil = require('../../../common/utils/random');

const { NORMALIZER } = global.__testContext.config;
// eslint-disable-next-line
describe('delegate', () => {
	let library;
	let storage;

	localCommon.beforeBlock('2_2_delegates_5', lib => {
		library = lib;
		storage = lib.components.storage;
	});

	afterEach(done => {
		storage.entities.Block.begin(t => {
			return t.batch([
				storage.adapter.db.none('DELETE FROM blocks WHERE "height" > 1;'),
				storage.adapter.db.none('DELETE FROM forks_stat;'),
			]);
		}).then(async () => {
			library.modules.blocks._lastBlock = __testContext.config.genesisBlock;
			done();
		});
	});

	describe('with funds inside account', () => {
		let delegateAccount;

		beforeEach('send funds to delegate account', done => {
			delegateAccount = randomUtil.account();
			const sendTransaction = transfer({
				amount: (1000 * NORMALIZER).toString(),
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: delegateAccount.address,
			});
			localCommon.addTransactionsAndForge(library, [sendTransaction], done);
		});

		describe('with delegate transaction in unconfirmed state', () => {
			let delegateTransaction;
			let username;

			beforeEach(done => {
				username = randomUtil.username().toLowerCase();

				delegateTransaction = registerDelegate({
					passphrase: delegateAccount.passphrase,
					username,
				});
				localCommon.addTransactionToUnconfirmedQueue(
					library,
					delegateTransaction,
					async () => {
						done();
					}
				);
			});

			describe('when receiving block with same transaction', () => {
				beforeEach(done => {
					localCommon.createValidBlock(
						library,
						[delegateTransaction],
						(err, block) => {
							expect(err).to.not.exist;
							library.modules.blocks.receiveBlockFromNetwork(block);
							done();
						}
					);
				});

				describe('confirmed state', () => {
					it('should update confirmed columns related to delegate', async () => {
						const account = await library.sequence.add(async () => {
							return localCommon.getAccountFromDb(
								library,
								delegateAccount.address
							);
						});
						expect(account).to.exist;
						expect(account.mem_accounts.username).to.equal(username);
						expect(account.mem_accounts.isDelegate).to.equal(1);
					});
				});
			});

			describe('when receiving block with delegate transaction with different id', () => {
				let delegateTransaction2;
				let username2;

				beforeEach(done => {
					username2 = randomUtil.username().toLowerCase();
					delegateTransaction2 = registerDelegate({
						passphrase: delegateAccount.passphrase,
						username: username2,
					});
					localCommon.createValidBlock(
						library,
						[delegateTransaction2],
						(err, block) => {
							expect(err).to.not.exist;
							library.modules.blocks.receiveBlockFromNetwork(block);
							done();
						}
					);
				});

				describe('confirmed state', () => {
					it('should update confirmed columns related to delegate', async () => {
						const account = await library.sequence.add(async () => {
							return localCommon.getAccountFromDb(
								library,
								delegateAccount.address
							);
						});
						expect(account).to.exist;
						expect(account.mem_accounts.username).to.equal(username2);
						expect(account.mem_accounts.isDelegate).to.equal(1);
					});
				});
			});
		});
	});
});
