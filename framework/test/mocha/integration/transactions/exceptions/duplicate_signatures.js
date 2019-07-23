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

describe('exceptions for duplicatedSignatures transactions', () => {
	let library;
	let slotOffset = 10;
	// Using transactions and account which caused in exceptions on testnet
	const senderAccount = accountFixtures.genesis;
	const accountWithTransactionWithSignaturesFromSamePublicKey = {
		address: '4368107197830030479L',
		publicKey:
			'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
	};

	const transactionToRegisterMultisignature = {
		id: '11586202714999788175',
		type: 4,
		timestamp: 77606894,
		senderPublicKey:
			'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
		recipientPublicKey: '',
		senderId: '4368107197830030479L',
		recipientId: '',
		amount: '0',
		fee: '3000000000',
		signature:
			'00fe12b4dbb4780880bbaa13becba1b62bfe00aded10761a7e85091de7edba78c47ba112ec53fc9c3ae9fba62594c3b83a84efb27905d997041aa3f487416c0e',
		signatures: [
			'237cfc710ae8e5f01491ba35ba8ccc0ac6c543ae6a85edc77fe54aa5bffb7638bd64f9df886d9bc0edc9bc94b3d692355b7c4858c6ab5a788c387b8f1f7fbf0c',
			'e8b62c2c62c8586faf74ccf81f290647bb370f1909edd4d70e2767529bdc4d2a7b7fa5918b7a315683861681a812c7342b70d23b6a344b982ca068221caceb0e',
			'00b8fd4e49baa07bc4749e1af4b3a58ee7e916c6a40d52dcbdd99b0e6aa9631179308d9751cc72a46ea27798afd59ef24432420d3786248eff10047cbcb48603',
			'67ba1e04d9c80e5776924e659d00c920ad6e38e5a22acce6e20ca00e7d4d85339329393e78ba5c4bd7d3ec90a93a0c3a31eb14b95ad21aac46c3ba4544ced906',
			'87651af240b5b06750714f349ec6b5cf40276557e20e39d8931d3c7a759436883ed9eb00c22c4bcdeafe58ffbfcce64d7a593f4dbb4516cb6a03cb72015c0e09',
		],
		asset: {
			multisignature: {
				min: 3,
				lifetime: 72,
				keysgroup: [
					'+c44a88e68196e4d2f608873467c7350fb92b954eb7c3b31a989b1afd8d55ebdb',
					'+2eca11a4786f35f367299e1defd6a22ac4eb25d2552325d6c5126583a3bdd0fb',
					'+a17e03f21bfa187d2a30fe389aa78431c587bf850e9fa851b3841274fc9f100f',
					'+758fc45791faf5796e8201e49950a9ee1ee788192714b935be982f315b1af8cd',
					'+9af12d260cf5fcc49bf8e8fce2880b34268c7a4ac8915e549c07429a01f2e4a5',
				],
			},
		},
	};

	const transactionWithSignaturesFromSamePublicKey = {
		id: '15181013796707110990',
		height: 6673979,
		blockId: '6573085857530521327',
		type: 0,
		timestamp: 77612766,
		senderPublicKey:
			'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
		recipientPublicKey:
			'24193236b7cbeaf5e6feafbbf7a791095ea64ec73abde8f0470001fee5d39d9d',
		senderId: '4368107197830030479L',
		recipientId: '4368107197830030479L',
		amount: '100000000',
		fee: '10000000',
		signature:
			'dc8fe25f817c81572585b3769f3c6df13d3dc93ff470b2abe807f43a3359ed94e9406d2539013971431f2d540e42dc7d3d71c7442da28572c827d59adc5dfa08',
		signatures: [
			'2df1fae6865ec72783dcb5f87a7d906fe20b71e66ad9613c01a89505ebd77279e67efa2c10b5ad880abd09efd27ea350dd8a094f44efa3b4b2c8785fbe0f7e00',
			'2ec5bbc4ff552f991262867cd8f1c30a417e4596e8343d882b7c4fc86288b9e53592031f3de75ffe8cf4d431a7291b76c758999bb52f46a4da62a27c8901b60a',
			'36d5c7da5f54007e22609105570fad04597f4f2b00d46baba603c213eaed8de55e9f3e5d0f39789dbc396330b2d9d4da46b7d67187075e86220bc0341c3f7802',
		],
		asset: {
			data: 'the real test',
		},
	};

	exceptions.duplicatedSignatures = {
		'15181013796707110990': [
			'2ec5bbc4ff552f991262867cd8f1c30a417e4596e8343d882b7c4fc86288b9e53592031f3de75ffe8cf4d431a7291b76c758999bb52f46a4da62a27c8901b60a',
			'36d5c7da5f54007e22609105570fad04597f4f2b00d46baba603c213eaed8de55e9f3e5d0f39789dbc396330b2d9d4da46b7d67187075e86220bc0341c3f7802',
		],
	};

	localCommon.beforeBlock('system_duplicate_signatures', lib => {
		library = lib;
	});

	describe('send funds to account', () => {
		before(done => {
			const transferTransaction = transfer({
				recipientId:
					accountWithTransactionWithSignaturesFromSamePublicKey.address,
				amount: (5000000000 * 100).toString(),
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

		describe('when forging block with transaction which initializes the account', () => {
			before(done => {
				localCommon.createValidBlockWithSlotOffset(
					library,
					[transactionToRegisterMultisignature],
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
						{
							address:
								accountWithTransactionWithSignaturesFromSamePublicKey.address,
						},
						(err, res) => {
							senderMemAccountBefore = res;
							done();
						}
					);
				});

				it('should make sender account multisignature', async () => {
					expect(senderMemAccountBefore.multiMin).to.equal(
						transactionToRegisterMultisignature.asset.multisignature.min
					);

					expect(senderMemAccountBefore.multiLifetime).to.equal(
						transactionToRegisterMultisignature.asset.multisignature.lifetime
					);
				});

				describe('when forging block with transaction with duplicate signatures', () => {
					before(done => {
						localCommon.createValidBlockWithSlotOffset(
							library,
							[transactionWithSignaturesFromSamePublicKey],
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
								{
									address:
										accountWithTransactionWithSignaturesFromSamePublicKey.address,
								},
								(err, res) => {
									senderMemAccountAfter = res;
									done();
								}
							);
						});

						it('should deduct balance from sender account', async () => {
							return expect(senderMemAccountAfter.balance).to.equal(
								new Bignum(senderMemAccountBefore.balance)
									.minus(transactionWithSignaturesFromSamePublicKey.fee)
									.toString()
							);
						});
					});

					describe('transactions table', () => {
						let transactionsFromDatabase;

						before('get transaction from database', async () => {
							transactionsFromDatabase = await library.components.storage.entities.Transaction.get(
								{
									id_in: [
										transactionToRegisterMultisignature.id,
										transactionWithSignaturesFromSamePublicKey.id,
									],
								}
							);
						});

						it('should save both transactions in the database', async () => {
							return expect(
								transactionsFromDatabase.map(transaction => transaction.id)
							).to.include(
								transactionToRegisterMultisignature.id,
								transactionWithSignaturesFromSamePublicKey.id
							);
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
									{
										address:
											accountWithTransactionWithSignaturesFromSamePublicKey.address,
									},
									(err, res) => {
										senderMemAccountAfterBlockDelete = res;
										done();
									}
								);
							});

							it('should update balance field of sender account', async () => {
								return expect(
									senderMemAccountAfterBlockDelete.balance
								).to.equal(senderMemAccountBefore.balance);
							});
						});

						describe('transactions table', () => {
							let transactionsFilteredById;

							before('get transaction from database', done => {
								localCommon.getTransactionFromModule(
									library,
									{
										id: transactionWithSignaturesFromSamePublicKey.id,
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
