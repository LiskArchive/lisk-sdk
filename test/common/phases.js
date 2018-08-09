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

require('../functional/functional.js');
var Promise = require('bluebird');
var apiHelpers = require('./helpers/api');
var waitFor = require('./utils/wait_for');

function confirmation(
	goodTransactions,
	badTransactions,
	pendingMultisignatures
) {
	describe('after transactions get confirmed', () => {
		before(() => {
			return waitFor.confirmations(_.map(goodTransactions, 'id'));
		});

		it('bad transactions should not be confirmed', () => {
			return Promise.map(badTransactions, transaction => {
				var params = [`id=${transaction.id}`];
				return apiHelpers.getTransactionsPromise(params).then(res => {
					expect(res.body.data).to.have.length(0);
				});
			});
		});

		it('good transactions should not be unconfirmed', () => {
			return Promise.map(goodTransactions, transaction => {
				return apiHelpers
					.getUnconfirmedTransactionPromise(transaction.id)
					.then(res => {
						expect(res.body.data).to.be.empty;
					});
			});
		});

		it('good transactions should be confirmed', () => {
			return Promise.map(goodTransactions, transaction => {
				var params = [`id=${transaction.id}`];
				return apiHelpers.getTransactionsPromise(params).then(res => {
					expect(res.body.data).to.have.length(1);
				});
			});
		});

		if (pendingMultisignatures) {
			it('pendingMultisignatures should remain in the pending queue', () => {
				return Promise.map(pendingMultisignatures, transaction => {
					var params = [`id=${transaction.id}`];

					return apiHelpers
						.getPendingMultisignaturesPromise(params)
						.then(res => {
							expect(res.body.data).to.have.length(1);
							expect(res.body.data[0].id).to.be.equal(transaction.id);
						});
				});
			});

			it('pendingMultisignatures should not be confirmed', () => {
				return Promise.map(pendingMultisignatures, transaction => {
					var params = [`id=${transaction.id}`];
					return apiHelpers.getTransactionsPromise(params).then(res => {
						expect(res.body.data).to.have.length(0);
					});
				});
			});
		}
	});
}

module.exports = {
	confirmation,
};
