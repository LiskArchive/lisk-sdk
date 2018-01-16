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

var phases = require('../../../common/phases');
var Scenarios = require('../../../common/scenarios');
var localCommon = require('./common');

describe('POST /api/transactions (validate type 1 on top of type 4)', function () {

	var scenarios = {
		'regular': new Scenarios.Multisig(),
	};

	var transaction, signature;
	var badTransactions = [];
	var goodTransactions = [];

	localCommon.beforeValidationPhase(scenarios);

	describe('registering second password', function () {

		it('regular scenario should be ok', function () {
			return localCommon.sendAndSignMultisigTransaction('signature', scenarios.regular)
				.then(function (transaction) {
					goodTransactions.push(transaction);
				});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});
});
