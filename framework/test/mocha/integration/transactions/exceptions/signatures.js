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

const { expect } = require('chai');
const Bignum = require('bignumber.js');
const { transfer } = require('@liskhq/lisk-transactions');
const localCommon = require('../../common');
const accountFixtures = require('../../../fixtures/accounts');

const exceptions = global.exceptions;

describe('exceptions for senderPublicKey transactions', () => {
	let library;
	let slotOffset = 10;
	// Using transactions and account which caused in exceptions on testnet
	const senderAccount = accountFixtures.genesis;
	const accountWithInvalidSignatureTransaction = {
		address: '499371933807011615L',
		publicKey:
			'd534e2d3a4584a1ed73382945411bc5a3ac6e99c79a89c38b7d341bebe17a510',
	};

	const transactionWithInvalidSignature = {
		id: '3274071402587084244',
		type: 0,
		timestamp: 9408211,
		senderPublicKey:
			'd534e2d3a4584a1ed73382945411bc5a3ac6e99c79a89c38b7d341bebe17a510',
		recipientPublicKey: '',
		senderId: '499371933807011615L',
		recipientId: '7607081009489509297L',
		amount: '500000000',
		fee: '10000000',
		signature:
			'562264be9a2e026a1a51ca93edff41863c49c4c9ba9db3a5e20e86a2e67a3d953e823ebe242508184517f7c0e6438d1e2f4d70157b5472c3b88f0f8960b9dd10',
		signatures: [],
		asset: {},
	};

	exceptions.signatures = ['3274071402587084244'];

	localCommon.beforeBlock('system_exceptions_signatures', lib => {
		library = lib;
	});

	describe('send funds to account', () => {
		before(done => {
			const transferTransaction = transfer({
				recipientId: accountWithInvalidSignatureTransaction.address,
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
					{ address: accountWithInvalidSignatureTransaction.address },
					(err, res) => {
						senderMemAccountBefore = res;
						done();
					}
				);
			});

			describe('when forging block with transaction with collision publicKey', () => {
				before(done => {
					localCommon.createValidBlockWithSlotOffset(
						library,
						[transactionWithInvalidSignature],
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
							{ address: accountWithInvalidSignatureTransaction.address },
							(err, res) => {
								senderMemAccountAfter = res;
								done();
							}
						);
					});

					it('should deduct balance from sender account', async () => {
						return expect(senderMemAccountAfter.balance).to.equal(
							new Bignum(senderMemAccountBefore.balance)
								.minus(transactionWithInvalidSignature.fee)
								.minus(transactionWithInvalidSignature.amount)
								.toString()
						);
					});
				});

				describe('transactions table', () => {
					let transactionsFromDatabase;

					before('get transaction from database', async () => {
						transactionsFromDatabase = await library.components.storage.entities.Transaction.get(
							{
								id_in: [transactionWithInvalidSignature.id],
							}
						);
					});

					it('should save transaction in the database', async () => {
						return expect(
							transactionsFromDatabase.map(transaction => transaction.id)
						).to.include(transactionWithInvalidSignature.id);
					});
				});

				describe('after deleting block', () => {
					let senderMemAccountAfterBlockDelete;

					before('deleting block', done => {
						localCommon.deleteLastBlock(library, done);
					});

					describe('details of the account', () => {
						before('get sender and recipient accounts', done => {
							library.logic.account.get(
								{ address: accountWithInvalidSignatureTransaction.address },
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
									id: transactionWithInvalidSignature.id,
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
