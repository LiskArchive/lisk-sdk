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

const async = require('async');
const lisk = require('lisk-elements').default;
const accountFixtures = require('../../fixtures/accounts');
const localCommon = require('../common');

const { NORMALIZER } = global.constants;

describe('system test (type 0) - address collision', async () => {
	let library;
	localCommon.beforeBlock('system_0_0_address_collision', lib => {
		library = lib;
	});

	const collision = {
		address: '13555181540209512417L',
		passphrases: [
			'merry field slogan sibling convince gold coffee town fold glad mix page',
			'annual youth lift quote off olive uncle town chief poverty extend series',
		],
	};

	const publicKeys = [
		lisk.cryptography.getPrivateAndPublicKeyFromPassphrase(
			collision.passphrases[0]
		).publicKey,
		lisk.cryptography.getPrivateAndPublicKeyFromPassphrase(
			collision.passphrases[1]
		).publicKey,
	];

	const firstTransaction = lisk.transaction.transfer({
		amount: 10 * NORMALIZER,
		passphrase: collision.passphrases[0],
		recipientId: accountFixtures.genesis.address,
	});

	const secondTransaction = lisk.transaction.transfer({
		amount: 10 * NORMALIZER,
		passphrase: collision.passphrases[1],
		recipientId: accountFixtures.genesis.address,
	});

	const firstTransactionWithData = lisk.transaction.transfer({
		amount: 10 * NORMALIZER,
		passphrase: collision.passphrases[0],
		recipientId: accountFixtures.genesis.address,
		data: 'addtional data from 1',
	});

	const secondTransactionWithData = lisk.transaction.transfer({
		amount: 10 * NORMALIZER,
		passphrase: collision.passphrases[1],
		recipientId: accountFixtures.genesis.address,
		data: 'addtional data from 2',
	});

	before(done => {
		const creditTransaction = lisk.transaction.transfer({
			amount: 1000 * NORMALIZER,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: collision.address,
			data: 'addtional data from 2',
		});

		localCommon.addTransactionsAndForge(
			library,
			[creditTransaction],
			async () => {
				done();
			}
		);
	});

	it('both passphrases should have the same address', done => {
		expect(lisk.cryptography.getAddressFromPublicKey(publicKeys[0])).to.equal(
			lisk.cryptography.getAddressFromPublicKey(publicKeys[1])
		);
		done();
	});

	describe('when two passphrases collide into the same address', async () => {
		it('adding to pool transfer should be ok for passphrase one', done => {
			localCommon.addTransaction(library, firstTransaction, (err, res) => {
				expect(err).to.be.null;
				expect(res).to.equal(firstTransaction.id);
				done();
			});
		});

		it('adding to pool transfer fail for passphrase two', done => {
			localCommon.addTransaction(library, secondTransaction, (err, res) => {
				expect(res).to.be.undefined;
				expect(err).to.be.not.null;
				expect(err).to.equal(
					`Invalid sender public key: ${publicKeys[1]} expected: ${
						publicKeys[0]
					}`
				);
				done();
			});
		});

		describe('after forging one block', async () => {
			before(done => {
				localCommon.forge(library, (err, res) => {
					expect(err).to.be.null;
					expect(res).to.be.undefined;
					done();
				});
			});

			it('first transaction to arrive should be included', done => {
				const filter = {
					id: firstTransaction.id,
				};

				localCommon.getTransactionFromModule(library, filter, (err, res) => {
					expect(err).to.be.null;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('Array');
					expect(res.transactions.length).to.equal(1);
					expect(res.transactions[0].id).to.equal(firstTransaction.id);
					done();
				});
			});

			it('last transaction to arrive should not be included', done => {
				const filter = {
					id: secondTransaction.id,
				};

				localCommon.getTransactionFromModule(library, filter, (err, res) => {
					expect(err).to.be.null;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('Array');
					expect(res.transactions.length).to.equal(0);
					done();
				});
			});

			it('publicKey from the first passphrase should be cemented and not the second one', done => {
				async.waterfall(
					[
						function(seriesCb) {
							localCommon.addTransaction(
								library,
								firstTransactionWithData,
								(err, res) => {
									expect(err).to.be.null;
									expect(res).to.equal(firstTransactionWithData.id);
									seriesCb();
								}
							);
						},
						function(seriesCb) {
							localCommon.addTransaction(
								library,
								secondTransactionWithData,
								(err, res) => {
									expect(res).to.be.undefined;
									expect(err).to.be.not.null;
									expect(err).to.equal(
										`Invalid sender public key: ${publicKeys[1]} expected: ${
											publicKeys[0]
										}`
									);
									seriesCb();
								}
							);
						},
					],
					err => {
						done(err);
					}
				);
			});
		});
	});
});
