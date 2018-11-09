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
var lisk = require('lisk-elements').default;
var swaggerSpec = require('../../../common/swagger_spec');
var randomUtil = require('../../../common/utils/random');
var accountFixtures = require('../../../fixtures/accounts');
var sendTransactionPromise = require('../../../common/helpers/api')
	.sendTransactionPromise;
var errorCodes = require('../../../../helpers/api_codes');
var phases = require('../../../common/phases');

describe('POST /api/transactions (general)', () => {
	var transactionsEndpoint = new swaggerSpec('POST /transactions');
	const account = randomUtil.account();
	const transaction = lisk.transaction.transfer({
		amount: 1,
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: account.address,
		timeOffset: -10000,
	});

	it('should fail if null transaction posted', () => {
		return transactionsEndpoint
			.makeRequest({ transaction: null }, 400)
			.then(res => {
				expect(res.body.message).to.eql('Parse errors');
				expect(res.body.errors[0].code).to.be.equal('INVALID_REQUEST_PAYLOAD');
			});
	});

	it('should fail on more than one transactions at a time', () => {
		return transactionsEndpoint
			.makeRequest(
				{ transactions: [randomUtil.transaction(), randomUtil.transaction()] },
				400
			)
			.then(res => {
				expect(res.body.message).to.eql('Validation errors');
				expect(res.body.errors[0].code).to.be.equal(
					'INVALID_REQUEST_PARAMETER'
				);
			});
	});

	describe('transaction processing', () => {
		sendTransactionPromise(transaction).then(res => {
			expect(res.body.data.message).to.be.equal('Transaction(s) accepted');
		});
		return phases.confirmation([transaction], []);
	});

	describe('verification', () => {
		it('should fail when trying to send a transaction that is already confirmed', () => {
			return sendTransactionPromise(
				transaction,
				errorCodes.PROCESSING_ERROR
			).then(res => {
				expect(res.body.message).to.be.equal(
					`Transaction is already confirmed: ${transaction.id}`
				);
			});
		});
	});
});
