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

describe('exceptions for senderPublicKey transactions', () => {
	let library;
	let slotOffset = 10;
	// Using transactions and account which caused in exceptions on testnet
	const senderAccount = accountFixtures.genesis;
	const accountWithCollisionPublicKeys = {
		address: '13555181540209512417L',
		originalPublicKey:
			'ce33db918b059a6e99c402963b42cf51c695068007ef01d8c383bb8a41270263',
		secondPublicKeyGeneratingSameAddress:
			'b26dd40ba33e4785e49ddc4f106c0493ed00695817235c778f487aea5866400a',
	};

	const transactionToSecurePublicKeyForAccount = {
		id: '15893189537802292780',
		type: 0,
		timestamp: 7863001,
		senderPublicKey:
			'ce33db918b059a6e99c402963b42cf51c695068007ef01d8c383bb8a41270263',
		recipientPublicKey:
			'cbf4ed7dbc6054b70e3744ce0150be4151e2cd99955cbffa19e3158b91739652',
		senderId: '13555181540209512417L',
		recipientId: '11365448450154403172L',
		amount: '2000000000',
		fee: '10000000',
		signature:
			'ef026f7f48bd9e593b72e7718636142cca3343f12bbfbef41635add2c825d5df29d137c5410d20ab9f24da59a55f4926494bc575013ea5a51708d86a08232a0f',
		signatures: [],
		asset: {},
	};

	const transactionWithSenderPublicKeyException = {
		id: '5252526207733553499',
		height: 464289,
		blockId: '16930807752598505307',
		type: 0,
		timestamp: 7863112,
		senderPublicKey:
			'b26dd40ba33e4785e49ddc4f106c0493ed00695817235c778f487aea5866400a',
		recipientPublicKey:
			'cbf4ed7dbc6054b70e3744ce0150be4151e2cd99955cbffa19e3158b91739652',
		senderId: '13555181540209512417L',
		recipientId: '11365448450154403172L',
		amount: '1200000000',
		fee: '10000000',
		signature:
			'dbcf37b12203395d190ccd63352bd97b3899ecc6b33fc937199155ac98e5537a8841dde12775c3c011750b6dc517315eafcdeba194bd5dbc4ec6e94e3e9c660e',
		signatures: [],
		asset: {},
		confirmations: 7349561,
	};

	localCommon.beforeBlock('system_exceptions_sender_public_key', lib => {
		library = lib;
		library.modules.blocks.blocksProcess.exceptions = {
			...library.modules.blocks.exceptions,
			senderPublicKey: ['5252526207733553499'],
		};
	});

	describe('send funds to account', () => {
		before(async () => {
			const transferTransaction = transfer({
				recipientId: accountWithCollisionPublicKeys.address,
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

		describe('when forging block with transaction which initializes the account', () => {
			before(async () => {
				const newBlock = await new Promise((resolve, reject) => {
					localCommon.createValidBlockWithSlotOffset(
						library,
						[transactionToSecurePublicKeyForAccount],
						--slotOffset,
						{ senderPublicKey: ['5252526207733553499'] },
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
				let senderMemAccountBefore;

				before('get sender account', async () => {
					senderMemAccountBefore = await library.components.storage.entities.Account.getOne(
						{ address: accountWithCollisionPublicKeys.address }
					);
				});

				it('should assign publicKey to the sender account', async () => {
					return expect(senderMemAccountBefore.publicKey).to.equal(
						accountWithCollisionPublicKeys.originalPublicKey
					);
				});

				describe('when forging block with transaction with collision publicKey', () => {
					before(async () => {
						library.modules.blocks.blocksVerify.exceptions = {
							...library.modules.blocks.exceptions,
							senderPublicKey: ['5252526207733553499'],
						};
						library.modules.blocks.blocksChain.exceptions = {
							...library.modules.blocks.exceptions,
							senderPublicKey: ['5252526207733553499'],
						};
						const newBlock = await new Promise((resolve, reject) => {
							localCommon.createValidBlockWithSlotOffset(
								library,
								[transactionWithSenderPublicKeyException],
								--slotOffset,
								{ senderPublicKey: ['5252526207733553499'] },
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
						let senderMemAccountAfter;

						before('get sender account', async () => {
							senderMemAccountAfter = await library.components.storage.entities.Account.getOne(
								{ address: accountWithCollisionPublicKeys.address }
							);
						});

						it('should not update sender account with new public key', async () => {
							return expect(senderMemAccountAfter.publicKey).to.equal(
								accountWithCollisionPublicKeys.originalPublicKey
							);
						});
					});

					describe('transactions table', () => {
						let transactionsFromDatabase;

						before('get transaction from database', async () => {
							transactionsFromDatabase = await library.components.storage.entities.Transaction.get(
								{
									id_in: [
										transactionToSecurePublicKeyForAccount.id,
										transactionWithSenderPublicKeyException.id,
									],
								}
							);
						});

						it('should save both transactions in the database', async () => {
							return expect(
								transactionsFromDatabase.map(transaction => transaction.id)
							).to.include(
								transactionToSecurePublicKeyForAccount.id,
								transactionWithSenderPublicKeyException.id
							);
						});
					});

					describe('after deleting block', () => {
						let afterDeleteSenderMemAccount;

						before('deleting block', done => {
							localCommon.deleteLastBlock(library, done);
						});

						describe('details of the account', () => {
							before('get sender account', async () => {
								afterDeleteSenderMemAccount = await library.components.storage.entities.Account.getOne(
									{ address: accountWithCollisionPublicKeys.address }
								);
							});

							it('should revert balance field of sender account', async () => {
								return expect(afterDeleteSenderMemAccount.balance).to.equal(
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
										id: transactionWithSenderPublicKeyException.id,
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
});
