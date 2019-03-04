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
const lisk = require('lisk-elements').default;
const typesRepresentatives = require('../../../fixtures/types_representatives');
const accountFixtures = require('../../../fixtures/accounts');
const apiHelpers = require('../../../common/helpers/api');
const randomUtil = require('../../../common/utils/random');
const apiCodes = require('../../../../../src/modules/http_api/api_codes');

function invalidAssets(option, badTransactions) {
	describe('using invalid asset values', () => {
		let transaction;

		beforeEach(done => {
			switch (option) {
				case 'signature':
					transaction = lisk.transaction.registerSecondPassphrase({
						passphrase: accountFixtures.genesis.passphrase,
						secondPassphrase: randomUtil.password(),
					});
					break;
				case 'delegate':
					transaction = lisk.transaction.registerDelegate({
						passphrase: accountFixtures.genesis.passphrase,
						username: randomUtil.delegateName(),
					});
					break;
				case 'votes':
					transaction = lisk.transaction.castVotes({
						passphrase: accountFixtures.genesis.passphrase,
						votes: [],
						unvotes: [],
					});
					break;
				case 'multisignature':
					transaction = lisk.transaction.registerMultisignature({
						passphrase: accountFixtures.genesis.passphrase,
						keysgroup: [`${accountFixtures.existingDelegate.publicKey}`],
						lifetime: 1,
						minimum: 2,
					});
					break;
				case 'dapp':
					transaction = lisk.transaction.createDapp({
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
