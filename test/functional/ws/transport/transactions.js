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
const lisk = require('lisk-js');
const phases = require('../../common/phases');
const ws = require('../../../common/ws/communication');
const randomUtil = require('../../../common/utils/random');
const normalizeTransactionObject = require('../../../common/helpers/api')
	.normalizeTransactionObject;

function postTransaction(transaction, cb) {
	transaction = normalizeTransactionObject(transaction);

	ws.call(
		'postTransactions',
		{
			transactions: [transaction],
		},
		() => {},
		true
	);
	cb();
}

describe('Posting transaction (type 0)', () => {
	let transaction;
	const goodTransactions = [];
	const badTransactions = [];
	const account = randomUtil.account();

	beforeEach(done => {
		transaction = randomUtil.transaction();
		done();
	});

	describe('transaction processing', () => {
		it('when sender has no funds should fail', done => {
			transaction = lisk.transaction.createTransaction(
				'1L',
				1,
				account.password
			);

			postTransaction(transaction, () => {
				done();
			});
		});

		it('when sender has funds should be ok', done => {
			postTransaction(transaction, () => {
				done();
			});
		});
	});

	describe('confirmation', () => {
		phases.confirmation(goodTransactions, badTransactions);
	});
});
