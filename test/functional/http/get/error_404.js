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
var apiHelpers = require('../../../common/helpers/api');

describe('GET /unknown_endpoint', () => {
	it('should fail with error 404', () => {
		return apiHelpers.getNotFoundEndpointPromise().then(res => {
			expect(res.error).is.not.empty;
			expect(res.error.status).to.equal(404);
			expect(res.body.description).to.equal('Page not found');
		});
	});
});
