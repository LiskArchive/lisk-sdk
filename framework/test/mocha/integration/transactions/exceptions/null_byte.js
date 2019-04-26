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

const { expect } = require('chai');
const Bignum = require('bignumber.js');
const { transfer } = require('@liskhq/lisk-transactions');
const localCommon = require('../../common');
const accountFixtures = require('../../../fixtures/accounts');

const exceptions = global.exceptions;

describe('exceptions for null byte transaction', () => {
	let library;
	let slotOffset = 10;
	// Using transactions and account which caused in exceptions on testnet
	const senderAccount = accountFixtures.genesis;
	const accountWhichCreatesTransactionNullByte = {
		address: '8273455169423958419L',
	};

	const transactionWithNullByte = {
		id: '10589655532517440995',
		type: 0,
		timestamp: 71702219,
		senderPublicKey:
			'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
		recipientPublicKey: '',
		senderId: '8273455169423958419L',
		recipientId: '1L',
		amount: '1',
		fee: '10000000',
		signature:
			'0d44bf74a5f55d0316dfbf3a9cf5359ce3c34c783022f0ca4f26958f80267b485e6fffccc4c46130e001458616e34a5ac2b0d700216549ad3b293a7f201c0f07',
		signatures: [],
		asset: {
			data: '\u0000hey:)',
		},
	};

	exceptions.transactionWithNullByte = ['10589655532517440995'];

	localCommon.beforeBlock('system_exceptions_null_byte', lib => {
		library = lib;
	});

	describe('send funds to account', () => {
		before(done => {
			const transferTransaction = transfer({
				recipientId: accountWhichCreatesTransactionNullByte.address,
				amount: (6000000000 * 100).toString(),
				passphrase: senderAccount.passphrase,
			});
			localCommon.createValidBlockWithSlotOffset(
				library,
				[transferTransaction],
				--slotOffset,
				(err, block) => {
					expect(err).to.not.exist;
					library.modules.blocks.verify.processBlock(block, true, true, done);
				}
			);
		});

		describe('details of the accounts', () => {
			let senderMemAccountBefore;

			before('get sender account', done => {
				library.logic.account.get(
					{ address: accountWhichCreatesTransactionNullByte.address },
					(err, res) => {
						senderMemAccountBefore = res;
						done();
					}
				);
			});

			describe('when forging block with transaction with leading zero recipientId', () => {
				before(done => {
					localCommon.createValidBlockWithSlotOffset(
						library,
						[transactionWithNullByte],
						--slotOffset,
						(err, block) => {
							expect(err).to.not.exist;
							library.modules.blocks.verify.processBlock(
								block,
								true,
								true,
								done
							);
						}
					);
				});

				describe('details of the accounts', () => {
					let senderMemAccountAfter;

					before('get sender account', done => {
						library.logic.account.get(
							{ address: accountWhichCreatesTransactionNullByte.address },
							(err, res) => {
								senderMemAccountAfter = res;
								done();
							}
						);
					});

					it('should deduct balance from the sender account', async () => {
						return expect(senderMemAccountAfter.balance).to.equal(
							new Bignum(senderMemAccountBefore.balance)
								.minus(transactionWithNullByte.amount)
								.minus(transactionWithNullByte.fee)
								.toString()
						);
					});
				});

				describe('transactions table', () => {
					let transactionsFromDatabase;

					before('get transaction from database', async () => {
						transactionsFromDatabase = await library.components.storage.entities.Transaction.get(
							{
								id_in: [transactionWithNullByte.id],
							}
						);
					});

					it('should save transaction in the database', async () => {
						return expect(
							transactionsFromDatabase.map(transaction => transaction.id)
						).to.include(transactionWithNullByte.id);
					});
				});

				describe('after deleting block', () => {
					let senderMemAccountAfterBlockDelete;

					before('deleting block', done => {
						localCommon.deleteLastBlock(library, done);
					});

					describe('details of the account', () => {
						before('get sender account', done => {
							library.logic.account.get(
								{ address: accountWhichCreatesTransactionNullByte.address },
								(err, res) => {
									senderMemAccountAfterBlockDelete = res;
									done();
								}
							);
						});

						it('should update balance field of sender account', async () => {
							return expect(senderMemAccountAfterBlockDelete.balance).to.equal(
								senderMemAccountBefore.balance
							);
						});
					});

					describe('transactions table', () => {
						let transactionsFilteredById;

						before('get transaction from database', done => {
							localCommon.getTransactionFromModule(
								library,
								{
									id: transactionWithNullByte.id,
								},
								(err, res) => {
									expect(err).to.not.exist;
									transactionsFilteredById = res.transactions;
									done();
								}
							);
						});

						it('should delete transaction from the database', async () => {
							expect(transactionsFilteredById).to.be.an('Array');
							return expect(transactionsFilteredById).to.have.length(0);
						});
					});
				});
			});
		});
	});
});
