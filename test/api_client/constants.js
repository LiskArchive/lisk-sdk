/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import {
	GET,
	POST,
	PUT,
	API_RECONNECT_MAX_RETRY_COUNT,
} from 'api_client/constants';

describe('api constants module', () => {
	it('GET should be a string', () => {
		return expect(GET).to.be.a('string');
	});

	it('POST should be a string', () => {
		return expect(POST).to.be.a('string');
	});

	it('PUT should be a string', () => {
		return expect(PUT).to.be.a('string');
	});

	it('API_RECONNECT_MAX_RETRY_COUNT should be an integer', () => {
		return expect(API_RECONNECT_MAX_RETRY_COUNT).to.be.an.integer;
	});
});
