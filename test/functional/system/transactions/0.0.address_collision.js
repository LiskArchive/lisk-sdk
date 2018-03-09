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

var async = require('async');
var lisk = require('lisk-js');
var accountFixtures = require('../../../fixtures/accounts');
var normalizer = require('../../../common/utils/normalizer');
var localCommon = require('../common');

describe('system test (type 0) - address collision', () => {
	var library;
	localCommon.beforeBlock('system_0_0_address_collision', lib => {
		library = lib;
	});

	var collision = {
		address: '13555181540209512417L',
		passphrases: [
			'merry field slogan sibling convince gold coffee town fold glad mix page',
			'annual youth lift quote off olive uncle town chief poverty extend series',
		],
	};

	var publicKeys = [
		lisk.crypto.getPrivateAndPublicKeyFromSecret(collision.passphrases[0])
			.publicKey,
		lisk.crypto.getPrivateAndPublicKeyFromSecret(collision.passphrases[1])
			.publicKey,
	];

	var firstTransaction = lisk.transaction.createTransaction(
		accountFixtures.genesis.address,
		10 * normalizer,
		collision.passphrases[0]
	);

	var secondTransaction = lisk.transaction.createTransaction(
		accountFixtures.genesis.address,
		10 * normalizer,
		collision.passphrases[1]
	);

	var firstTransactionWithData = lisk.transaction.createTransaction(
		accountFixtures.genesis.address,
		10 * normalizer,
		collision.passphrases[0],
		null,
		'addtional data from 1'
	);

	var secondTransactionWithData = lisk.transaction.createTransaction(
		accountFixtures.genesis.address,
		10 * normalizer,
		collision.passphrases[1],
		null,
		'addtional data from 2'
	);

	before(done => {
		var creditTransaction = lisk.transaction.createTransaction(
			collision.address,
			1000 * normalizer,
			accountFixtures.genesis.password
		);

		localCommon.addTransactionsAndForge(library, [creditTransaction], () => {
			done();
		});
	});

	it('both passphrases should have the same address', done => {
		expect(lisk.crypto.getAddressFromPublicKey(publicKeys[0])).to.equal(
			lisk.crypto.getAddressFromPublicKey(publicKeys[1])
		);
		done();
	});

	describe('when two passphrases collide into the same address', () => {
		it('adding to pool transfer should be ok for passphrase one', done => {
			localCommon.addTransaction(library, firstTransaction, (err, res) => {
				expect(err).to.be.null;
				expect(res).to.equal(firstTransaction.id);
				done();
			});
		});

		it('adding to pool transfer should be ok for passphrase two', done => {
			localCommon.addTransaction(library, secondTransaction, (err, res) => {
				expect(err).to.be.null;
				expect(res).to.equal(secondTransaction.id);
				done();
			});
		});

		describe('after forging one block', () => {
			before(done => {
				localCommon.forge(library, (err, res) => {
					expect(err).to.be.null;
					expect(res).to.be.undefined;
					done();
				});
			});

			it('first transaction to arrive should not be included', done => {
				var filter = {
					id: firstTransaction.id,
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

			it('last transaction to arrive should be included', done => {
				var filter = {
					id: secondTransaction.id,
				};

				localCommon.getTransactionFromModule(library, filter, (err, res) => {
					expect(err).to.be.null;
					expect(res)
						.to.have.property('transactions')
						.which.is.an('Array');
					expect(res.transactions.length).to.equal(1);
					expect(res.transactions[0].id).to.equal(secondTransaction.id);
					done();
				});
			});

			it('publicKey from the second passphrase should be cemented and not the first one', done => {
				async.waterfall(
					[
						function(seriesCb) {
							localCommon.addTransaction(
								library,
								secondTransactionWithData,
								(err, res) => {
									expect(err).to.be.null;
									expect(res).to.equal(secondTransactionWithData.id);
									seriesCb();
								}
							);
						},
						function(seriesCb) {
							localCommon.addTransaction(
								library,
								firstTransactionWithData,
								(err, res) => {
									expect(res).to.be.undefined;
									expect(err).to.be.not.null;
									expect(err).to.equal(
										`Invalid sender public key: ${publicKeys[0]} expected: ${
											publicKeys[1]
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
