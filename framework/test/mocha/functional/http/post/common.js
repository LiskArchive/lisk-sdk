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

require('../../functional');
const {
	registerSecondPassphrase,
	registerDelegate,
	castVotes,
	createDapp,
	utils: transactionUtils,
} = require('@liskhq/lisk-transactions');
const BigNumber = require('bignumber.js');
const typesRepresentatives = require('../../../fixtures/types_representatives');
const accountFixtures = require('../../../fixtures/accounts');
const apiHelpers = require('../../../common/helpers/api');
const randomUtil = require('../../../common/utils/random');
const apiCodes = require('../../../../../src/modules/http_api/api_codes');

const { FEES } = global.constants;

function invalidAssets(option, badTransactions) {
	describe('using invalid asset values', () => {
		let transaction;

		beforeEach(done => {
			switch (option) {
				case 'signature':
					transaction = registerSecondPassphrase({
						passphrase: accountFixtures.genesis.passphrase,
						secondPassphrase: randomUtil.password(),
					});
					break;
				case 'delegate':
					transaction = registerDelegate({
						passphrase: accountFixtures.genesis.passphrase,
						username: randomUtil.delegateName(),
					});
					break;
				case 'votes':
					transaction = castVotes({
						passphrase: accountFixtures.genesis.passphrase,
						votes: [],
						unvotes: [],
					});
					break;
				case 'multisignature':
					// TODO: Remove signRawTransaction on lisk-transactions 3.0.0
					transaction = transactionUtils.signRawTransaction({
						transaction: {
							type: 4,
							amount: '0',
							fee: new BigNumber(FEES.MULTISIGNATURE).times(2).toString(),
							asset: {
								multisignature: {
									keysgroup: [`+${accountFixtures.existingDelegate.publicKey}`],
									lifetime: 1,
									min: 2,
								},
							},
						},
						passphrase: accountFixtures.genesis.passphrase,
					});
					break;
				case 'dapp':
					transaction = createDapp({
						passphrase: accountFixtures.genesis.passphrase,
						options: randomUtil.guestbookDapp,
					});
					break;
				// no default
			}
			done();
		});

		describe('without option', () => {
			typesRepresentatives.allTypes.forEach(test => {
				it(`using ${test.description} should fail`, async () => {
					transaction.asset = test.input;

					const expectedResponse =
						test.expectation === 'object' && test.description !== 'date'
							? apiCodes.PROCESSING_ERROR
							: apiCodes.BAD_REQUEST;

					return apiHelpers
						.sendTransactionPromise(transaction, expectedResponse)
						.then(res => {
							expect(res.body.message).to.not.be.empty;
							badTransactions.push(transaction);
						});
				});
			});

			it('deleting object should fail', async () => {
				delete transaction.asset;

				return apiHelpers
					.sendTransactionPromise(transaction, apiCodes.BAD_REQUEST)
					.then(res => {
						expect(res.body.message).to.not.be.empty;
						badTransactions.push(transaction);
					});
			});
		});
		describe(`with option: ${option}`, () => {
			typesRepresentatives.allTypes.forEach(test => {
				it(`using ${test.description} should fail`, async () => {
					transaction.asset[option] = test.input;

					return apiHelpers
						.sendTransactionPromise(transaction, apiCodes.PROCESSING_ERROR)
						.then(res => {
							expect(res.body.message).to.not.be.empty;
							badTransactions.push(transaction);
						});
				});
			});

			it('deleting object should fail', async () => {
				delete transaction.asset[option];

				return apiHelpers
					.sendTransactionPromise(transaction, apiCodes.PROCESSING_ERROR)
					.then(res => {
						expect(res.body.message).to.not.be.empty;
						badTransactions.push(transaction);
					});
			});
		});
	});
}

module.exports = {
	invalidAssets,
};
