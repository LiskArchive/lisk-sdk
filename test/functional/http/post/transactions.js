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
var randomUtil = require('../../../common/utils/random');
var swaggerSpec = require('../../../common/swagger_spec');
var expectSwaggerParamError = require('../../../common/helpers/api')
	.expectSwaggerParamError;

describe('POST /api/transactions (general)', () => {
	var transactionsEndpoint = new swaggerSpec('POST /transactions');

	it('should fail if empty transactions posted', () => {
		return transactionsEndpoint
			.makeRequest({ transactions: [] }, 400)
			.then(res => {
				expectSwaggerParamError(res, 'transactions');
				expect(res.body.errors[0].errors[0].code).to.be.equal(
					'ARRAY_LENGTH_SHORT'
				);
			});
	});

	it('should fail on more than one transactions at a time', () => {
		return transactionsEndpoint
			.makeRequest(
				{ transactions: [randomUtil.transaction(), randomUtil.transaction()] },
				400
			)
			.then(res => {
				expectSwaggerParamError(res, 'transactions');
				expect(res.body.errors[0].errors[0].code).to.be.equal(
					'ARRAY_LENGTH_LONG'
				);
			});
	});
});
