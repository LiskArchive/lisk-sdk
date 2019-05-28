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
const { transfer } = require('@liskhq/lisk-transactions');
const localCommon = require('../../common');
const accountFixtures = require('../../../fixtures/accounts');

describe('exceptions for recipient transactions exceeding uint64', () => {
	let library;
	let slotOffset = 10;
	// Using transactions and account which caused in exceptions on testnet
	const senderAccount = accountFixtures.genesis;
	const accountWhichCreatesTransactionWithExceedingUint64Recipient = {
		address: '9961131544040416558L',
		publicKey:
			'fe8f1a47180e7f318cb162b06470fbe259bc1d9d5359a8792cda3f087e49f72b',
	};

	const accountWithExceedingUint64Recipient = {
		address: '19961131544040416558L',
	};

	const transactionWithExceedingUint64Recipient = {
		id: '393955899193580559',
		type: 0,
		timestamp: 33817764,
		senderPublicKey:
			'fe8f1a47180e7f318cb162b06470fbe259bc1d9d5359a8792cda3f087e49f72b',
		recipientPublicKey: '',
		senderId: '9961131544040416558L',
		recipientId: '19961131544040416558L',
		amount: '100000000',
		fee: '10000000',
		signature:
			'02a806771711ecb9ffa676d8f6c85c5ffb87398cddbd0d55ae6c1e83f0e8e74c50490979e85633715b66d42090e9b37af918b1f823d706e900f5e2b72f876408',
		signatures: [],
		asset: {},
	};

	localCommon.beforeBlock('system_exceptions_recipientId_uint_64', lib => {
		library = lib;
		library.modules.blocks.blocksProcess.exceptions = {
			...library.modules.blocks.exceptions,
			recipientExceedingUint64: {
				'393955899193580559': '19961131544040416558L',
			},
		};
	});

	describe('send funds to account', () => {
		before(async () => {
			const transferTransaction = transfer({
				recipientId:
					accountWhichCreatesTransactionWithExceedingUint64Recipient.address,
				amount: (6000000000 * 100).toString(),
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
			await library.modules.blocks.blocksProcess.processBlock(
				newBlock,
				library.modules.blocks.lastBlock
			);
			library.modules.blocks._lastBlock = newBlock;
		});

		describe('when forging block with transaction with exceeding uint_64 recipientId', () => {
			before(async () => {
				const newBlock = await new Promise((resolve, reject) => {
					localCommon.createValidBlockWithSlotOffset(
						library,
						[transactionWithExceedingUint64Recipient],
						--slotOffset,
						{
							recipientExceedingUint64: {
								'393955899193580559': '19961131544040416558L',
							},
						},
						(err, block) => {
							if (err) {
								return reject(err);
							}
							return resolve(block);
						}
					);
				});
				await library.modules.blocks.blocksProcess.processBlock(
					newBlock,
					library.modules.blocks.lastBlock
				);
				library.modules.blocks._lastBlock = newBlock;
			});

			describe('details of the accounts', () => {
				let recipientMemAccountAfter;

				before('get recipient account', async () => {
					recipientMemAccountAfter = await library.components.storage.entities.Account.getOne(
						{ address: accountWithExceedingUint64Recipient.address },
						{ extended: true }
					);
				});

				it('should add balance to the recipient account', async () => {
					return expect(recipientMemAccountAfter.balance).to.equal(
						transactionWithExceedingUint64Recipient.amount.toString()
					);
				});
			});

			describe('transactions table', () => {
				let transactionsFromDatabase;

				before('get transaction from database', async () => {
					transactionsFromDatabase = await library.components.storage.entities.Transaction.get(
						{
							id_in: [transactionWithExceedingUint64Recipient.id],
						}
					);
				});

				it('should save transaction in the database', async () => {
					return expect(
						transactionsFromDatabase.map(transaction => transaction.id)
					).to.include(transactionWithExceedingUint64Recipient.id);
				});
			});

			describe('after deleting block', () => {
				let recipientMemAccountAfterBlockDelete;

				before('deleting block', done => {
					localCommon.deleteLastBlock(library, done);
				});

				describe('details of the account', () => {
					before('get recipient account', async () => {
						recipientMemAccountAfterBlockDelete = await library.components.storage.entities.Account.getOne(
							{ address: accountWithExceedingUint64Recipient.address },
							{ extended: true }
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
								id: transactionWithExceedingUint64Recipient.id,
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
