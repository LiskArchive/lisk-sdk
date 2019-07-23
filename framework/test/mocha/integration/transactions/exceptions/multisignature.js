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
const BigNum = require('@liskhq/bignum');
const { transfer } = require('@liskhq/lisk-transactions');
const localCommon = require('../../common');
const accountFixtures = require('../../../fixtures/accounts');

describe('exceptions for multisignature transactions', () => {
	let library;
	let slotOffset = 10;
	// Using transactions and account which caused in exceptions on testnet
	const senderAccount = accountFixtures.genesis;
	const accountWithExceptionMultisig = {
		address: '15682180043073388494L',
	};

	const exceptionMultisingatureTransaction = {
		id: '8191213966308378713',
		type: 4,
		timestamp: 15869462,
		senderPublicKey:
			'0e88b1ca1414078f51a5f173356dfbf48a95b941764b894594c54f211c636941',
		recipientPublicKey: '',
		senderId: '15682180043073388494L',
		recipientId: '',
		amount: '0',
		fee: '1500000000',
		signature:
			'bdfae7698da7e6082bfdc170db811d1e787ae9b5fa4c39acb980b551b7acefef64a8ed0c635a17f0b42233cf871903bcb90e5148e0bfa8b9dea2a05a58f3200b',
		signatures: [
			'd67e178056f896ffd4c04a752fa68d5df6c00765ef2a427426d2aeb67fbc624237aa230b577ddbb8dfa7068b87c8849b00ae58b7f0b2464c5f9675256d392706',
			'db7fe4e0c58e458edd53ee1d61223f1da411a9e0cb3d15735219958fb9b3d646721584ea62716695bcf978b8210b9cf14645b672533182b8989f9577a0e18309',
		],
		asset: {
			multisignature: {
				min: 3,
				lifetime: 24,
				keysgroup: [
					'+02e229bc194aa90ef80cc8461eccc830b52d01678add6e0426252f3a0aa7f14f',
					'+1f2bc9022d0440254c33b5a9c09abfb864623ac9c9ea3285d79bc25d4de430f7',
				],
			},
		},
	};

	localCommon.beforeBlock('system_multisignature_transactions', lib => {
		library = lib;
	});

	describe('send funds to account', () => {
		before(async () => {
			const transferTransaction = transfer({
				recipientId: accountWithExceptionMultisig.address,
				amount: (5000000000 * 100).toString(),
				passphrase: senderAccount.passphrase,
			});
			const newBlock = await new Promise((resolve, reject) => {
				localCommon.createValidBlockWithSlotOffset(
					library,
					[transferTransaction],
					--slotOffset,
					(err, block) => {
						if (err) {
							return reject(err);
						}
						return resolve(block);
					}
				);
			});
			const newLastBlock = await library.modules.blocks.blocksProcess.processBlock(
				newBlock,
				library.modules.blocks.lastBlock
			);
			library.modules.blocks._lastBlock = newLastBlock;
		});

		describe('details of the accounts', () => {
			let senderMemAccountBefore;

			before('get sender account', async () => {
				senderMemAccountBefore = await library.components.storage.entities.Account.getOne(
					{ address: accountWithExceptionMultisig.address },
					{ extended: true }
				);
			});

			describe('when forging block with transaction with multisignature exception', () => {
				before(async () => {
					library.modules.blocks.blocksProcess.exceptions = {
						...library.modules.blocks.exceptions,
						multisignatures: ['8191213966308378713'],
					};
					const newBlock = await new Promise((resolve, reject) => {
						localCommon.createValidBlockWithSlotOffset(
							library,
							[exceptionMultisingatureTransaction],
							--slotOffset,
							{ multisignatures: ['8191213966308378713'] },
							(err, block) => {
								if (err) {
									return reject(err);
								}
								return resolve(block);
							}
						);
					});
					const newLastBlock = await library.modules.blocks.blocksProcess.processBlock(
						newBlock,
						library.modules.blocks.lastBlock
					);
					library.modules.blocks._lastBlock = newLastBlock;
				});

				describe('details of the accounts', () => {
					let senderMemAccountAfter;

					before('get sender account', async () => {
						senderMemAccountAfter = await library.components.storage.entities.Account.getOne(
							{ address: accountWithExceptionMultisig.address },
							{ extended: true }
						);
					});

					it('should update sender account with multisignature fields', async () => {
						return expect(senderMemAccountAfter.membersPublicKeys).to.eql([
							'02e229bc194aa90ef80cc8461eccc830b52d01678add6e0426252f3a0aa7f14f',
							'1f2bc9022d0440254c33b5a9c09abfb864623ac9c9ea3285d79bc25d4de430f7',
						]);
					});

					it('should deduct balance from sender account', async () => {
						return expect(senderMemAccountAfter.balance).to.equal(
							new BigNum(senderMemAccountBefore.balance)
								.minus(exceptionMultisingatureTransaction.fee)
								.toString()
						);
					});
				});

				describe('transactions table', () => {
					let transactionsFromDatabase;

					before('get transaction from database', async () => {
						transactionsFromDatabase = await library.components.storage.entities.Transaction.get(
							{
								id_in: [exceptionMultisingatureTransaction.id],
							}
						);
					});

					it('should save both transactions in the database', async () => {
						return expect(
							transactionsFromDatabase.map(transaction => transaction.id)
						).to.include(exceptionMultisingatureTransaction.id);
					});
				});

				describe('after deleting block', () => {
					let senderMemAccountAfterBlockDelete;

					before('deleting block', done => {
						localCommon.deleteLastBlock(library, done);
					});

					describe('details of the account', () => {
						before('get sender', async () => {
							senderMemAccountAfterBlockDelete = await library.components.storage.entities.Account.getOne(
								{ address: accountWithExceptionMultisig.address },
								{ extended: true }
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
									id: exceptionMultisingatureTransaction.id,
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
