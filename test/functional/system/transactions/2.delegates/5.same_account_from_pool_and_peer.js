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

const lisk = require('lisk-js').default;
const expect = require('chai').expect;
const accountFixtures = require('../../../../fixtures/accounts');
const localCommon = require('../../common.js');
const genesisBlock = require('../../../../data/genesis_block.json');
const randomUtil = require('../../../../common/utils/random');
const normalizer = require('../../../../common/utils/normalizer');

describe('delegate', () => {
	let library;
	let db;

	localCommon.beforeBlock('system_2_2_delegates_5', lib => {
		library = lib;
		db = lib.db;
	});

	afterEach(done => {
		db
			.task(t => {
				return t.batch([
					db.none('DELETE FROM blocks WHERE "height" > 1;'),
					db.none('DELETE FROM forks_stat;'),
				]);
			})
			.then(() => {
				library.modules.blocks.lastBlock.set(genesisBlock);
				done();
			});
	});

	describe('with funds inside account', () => {
		let delegateAccount;

		beforeEach('send funds to delegate account', done => {
			delegateAccount = randomUtil.account();
			const sendTransaction = lisk.transaction.transfer({
				amount: 1000 * normalizer,
				passphrase: accountFixtures.genesis.password,
				recipientId: delegateAccount.address,
			});
			localCommon.addTransactionsAndForge(library, [sendTransaction], done);
		});

		describe('with delegate transaction in unconfirmed state', () => {
			let delegateTransaction;
			let username;

			beforeEach(done => {
				username = randomUtil.username().toLowerCase();

				delegateTransaction = lisk.transaction.registerDelegate({
					passphrase: delegateAccount.password,
					username,
				});
				delegateTransaction.amount = parseInt(delegateTransaction.amount);
				delegateTransaction.fee = parseInt(delegateTransaction.fee);
				localCommon.addTransactionToUnconfirmedQueue(
					library,
					delegateTransaction,
					done
				);
			});

			describe('when receiving block with same transaction', () => {
				beforeEach(done => {
					localCommon.createValidBlock(
						library,
						[delegateTransaction],
						(err, block) => {
							expect(err).to.not.exist;
							library.modules.blocks.process.onReceiveBlock(block);
							done();
						}
					);
				});

				describe('unconfirmed state', () => {
					it('should update unconfirmed columns related to delegate', done => {
						library.sequence.add(seqCb => {
							localCommon
								.getAccountFromDb(library, delegateAccount.address)
								.then(account => {
									expect(account).to.exist;
									expect(account.mem_accounts.u_username).to.equal(username);
									expect(account.mem_accounts.u_isDelegate).to.equal(1);
									seqCb();
									done();
								});
						});
					});
				});

				describe('confirmed state', () => {
					it('should update confirmed columns related to delegate', done => {
						library.sequence.add(seqCb => {
							localCommon
								.getAccountFromDb(library, delegateAccount.address)
								.then(account => {
									expect(account).to.exist;
									expect(account.mem_accounts.username).to.equal(username);
									expect(account.mem_accounts.isDelegate).to.equal(1);
									seqCb();
									done();
								});
						});
					});
				});
			});

			describe('when receiving block with delegate transaction with different id', () => {
				let delegateTransaction2;
				let username2;

				beforeEach(done => {
					username2 = randomUtil.username().toLowerCase();
					delegateTransaction2 = lisk.transaction.registerDelegate({
						passphrase: delegateAccount.password,
						username: username2,
					});
					delegateTransaction2.senderId = delegateAccount.address;
					delegateTransaction2.amount = parseInt(delegateTransaction2.amount);
					delegateTransaction2.fee = parseInt(delegateTransaction2.fee);
					localCommon.createValidBlock(
						library,
						[delegateTransaction2],
						(err, block) => {
							expect(err).to.not.exist;
							library.modules.blocks.process.onReceiveBlock(block);
							done();
						}
					);
				});

				describe('unconfirmed state', () => {
					it('should update unconfirmed columns related to delegate', done => {
						library.sequence.add(seqCb => {
							localCommon
								.getAccountFromDb(library, delegateAccount.address)
								.then(account => {
									expect(account).to.exist;
									expect(account.mem_accounts.u_username).to.equal(username2);
									expect(account.mem_accounts.u_isDelegate).to.equal(1);
									seqCb();
									done();
								});
						});
					});
				});

				describe('confirmed state', () => {
					it('should update confirmed columns related to delegate', done => {
						library.sequence.add(seqCb => {
							localCommon
								.getAccountFromDb(library, delegateAccount.address)
								.then(account => {
									expect(account).to.exist;
									expect(account.mem_accounts.username).to.equal(username2);
									expect(account.mem_accounts.isDelegate).to.equal(1);
									seqCb();
									done();
								});
						});
					});
				});
			});
		});
	});
});
