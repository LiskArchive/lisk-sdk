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

require('../../functional.js');
var lisk = require('lisk-js');

var typesRepresentatives = require('../../../fixtures/types_representatives');
var accountFixtures = require('../../../fixtures/accounts');

var apiHelpers = require('../../../common/helpers/api');
var randomUtil = require('../../../common/utils/random');
var errorCodes = require('../../../../helpers/api_codes');

function invalidAssets(option, badTransactions) {
	var transaction;

	beforeEach(() => {
		switch (option) {
			case 'signature':
				transaction = lisk.signature.createSignature(
					accountFixtures.genesis.password,
					randomUtil.password()
				);
				break;
			case 'delegate':
				transaction = lisk.delegate.createDelegate(
					accountFixtures.genesis.password,
					randomUtil.delegateName()
				);
				break;
			case 'votes':
				transaction = lisk.vote.createVote(
					accountFixtures.genesis.password,
					[]
				);
				break;
			case 'multisignature':
				transaction = lisk.multisignature.createMultisignature(
					accountFixtures.genesis.password,
					null,
					[`+${accountFixtures.existingDelegate.publicKey}`],
					1,
					2
				);
				break;
			case 'dapp':
				transaction = lisk.dapp.createDapp(
					accountFixtures.genesis.password,
					null,
					randomUtil.guestbookDapp
				);
				break;
			case 'inTransfer':
				transaction = lisk.transfer.createInTransfer(
					randomUtil.guestbookDapp.id,
					Date.now(),
					accountFixtures.genesis.password
				);
				break;
			case 'outTransfer':
				transaction = lisk.transfer.createOutTransfer(
					randomUtil.guestbookDapp.id,
					randomUtil.transaction().id,
					accountFixtures.genesis.address,
					Date.now(),
					accountFixtures.genesis.password
				);
				break;
		}
	});

	describe('using invalid asset values', () => {
		typesRepresentatives.allTypes.forEach(test => {
			it(`using ${test.description} should fail`, () => {
				transaction.asset = test.input;

				var expectedResponse =
					test.expectation === 'object' && test.description !== 'date'
						? errorCodes.PROCESSING_ERROR
						: errorCodes.BAD_REQUEST;

				return apiHelpers
					.sendTransactionPromise(transaction, expectedResponse)
					.then(res => {
						expect(res.body.message).to.not.be.empty;
						badTransactions.push(transaction);
					});
			});
		});

		it('deleting object should fail', () => {
			delete transaction.asset;

			return apiHelpers
				.sendTransactionPromise(transaction, errorCodes.BAD_REQUEST)
				.then(res => {
					expect(res.body.message).to.not.be.empty;
					badTransactions.push(transaction);
				});
		});
	});

	describe(`using invalid asset.${option} values`, () => {
		typesRepresentatives.allTypes.forEach(test => {
			it(`using ${test.description} should fail`, () => {
				transaction.asset[option] = test.input;

				return apiHelpers
					.sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR)
					.then(res => {
						expect(res.body.message).to.not.be.empty;
						badTransactions.push(transaction);
					});
			});
		});

		it('deleting object should fail', () => {
			delete transaction.asset[option];

			return apiHelpers
				.sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR)
				.then(res => {
					expect(res.body.message).to.not.be.empty;
					badTransactions.push(transaction);
				});
		});
	});
}

module.exports = {
	invalidAssets: invalidAssets,
};
