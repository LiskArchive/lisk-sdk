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
const { transfer } = require('@liskhq/lisk-transactions');
const localCommon = require('../../common');
const accountFixtures = require('../../../fixtures/accounts');

const exceptions = global.exceptions;

describe('exceptions for senderPublicKey transactions', () => {
	let library;
	let slotOffset = 10;
	// Using transactions and account which caused in exceptions on testnet
	const senderAccount = accountFixtures.genesis;
	const accountWhichCreatesTransactionWithLeadingZeroRecipient = {
		address: '12530546017554603584L',
		publicKey:
			'99f1d6d200ce1d45783e1e5d01f3c392d9e7cb6750226bbf3ec2956745f86543',
	};

	const accountWithLeadingZero = {
		address: '000123L',
	};

	const transactionWithLeadingZeroRecipientId = {
		id: '12710869213547423905',
		type: 0,
		timestamp: 64945683,
		senderPublicKey:
			'99f1d6d200ce1d45783e1e5d01f3c392d9e7cb6750226bbf3ec2956745f86543',
		recipientPublicKey: '',
		senderId: '12530546017554603584L',
		recipientId: '000123L',
		amount: '312200000',
		fee: '10000000',
		signature:
			'37e06997d11a8ee98d36edc154fd1e9cca963fecedf87d6cbeee678f0bbd16f8992a3c4f0277e9c041b9fc04bb572f7188aa35670afa6ced4831ca1f561b0c09',
		signatures: [],
		asset: {},
	};

	exceptions.recipientLeadingZero = {
		'12710869213547423905': '000123L',
	};

	localCommon.beforeBlock('system_exceptions_recipientId_leading_zero', lib => {
		library = lib;
	});

	describe('send funds to account', () => {
		before(done => {
			const transferTransaction = transfer({
				recipientId:
					accountWhichCreatesTransactionWithLeadingZeroRecipient.address,
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

		describe('when forging block with transaction with leading zero recipientId', () => {
			before(done => {
				localCommon.createValidBlockWithSlotOffset(
					library,
					[transactionWithLeadingZeroRecipientId],
					--slotOffset,
					(err, block) => {
						expect(err).to.not.exist;
						library.modules.blocks.verify.processBlock(block, true, true, done);
					}
				);
			});

			describe('details of the accounts', () => {
				let recipientMemAccountAfter;

				before('get recipient account', done => {
					library.logic.account.get(
						{ address: accountWithLeadingZero.address },
						(err, res) => {
							recipientMemAccountAfter = res;
							done();
						}
					);
				});

				it('should add balance to the recipient account', async () => {
					return expect(recipientMemAccountAfter.balance).to.equal(
						transactionWithLeadingZeroRecipientId.amount.toString()
					);
				});
			});

			describe('transactions table', () => {
				let transactionsFromDatabase;

				before('get transaction from database', async () => {
					transactionsFromDatabase = await library.components.storage.entities.Transaction.get(
						{
							id_in: [transactionWithLeadingZeroRecipientId.id],
						}
					);
				});

				it('should save transaction in the database', async () => {
					return expect(
						transactionsFromDatabase.map(transaction => transaction.id)
					).to.include(transactionWithLeadingZeroRecipientId.id);
				});
			});

			describe('after deleting block', () => {
				let recipientMemAccountAfterBlockDelete;

				before('deleting block', done => {
					localCommon.deleteLastBlock(library, done);
				});

				describe('details of the account', () => {
					before('get recipient account', done => {
						library.logic.account.get(
							{ address: accountWithLeadingZero.address },
							(err, res) => {
								recipientMemAccountAfterBlockDelete = res;
								done();
							}
						);
					});

					it('should update balance field of sender account', async () => {
						return expect(recipientMemAccountAfterBlockDelete.balance).to.equal(
							'0'
						);
					});
				});

				describe('transactions table', () => {
					let transactionsFilteredById;

					before('get transaction from database', done => {
						localCommon.getTransactionFromModule(
							library,
							{
								id: transactionWithLeadingZeroRecipientId.id,
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
