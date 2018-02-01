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
var genesisDelegates = require('../../../data/genesis_delegates.json');

var swaggerEndpoint = require('../../../common/swagger_spec');
var apiHelpers = require('../../../common/helpers/api');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('PUT /node/status/forging', () => {
	var validDelegate = genesisDelegates.delegates[0];
	var toggleForgingEndpoint = new swaggerEndpoint('PUT /node/status/forging');
	var forgingStatusEndpoint = new swaggerEndpoint('GET /node/status/forging');

	before(() => {
		return forgingStatusEndpoint
			.makeRequest({ publicKey: validDelegate.publicKey }, 200)
			.then(res => {
				if (!res.body.data[0].forging) {
					return toggleForgingEndpoint
						.makeRequest(
							{
								data: {
									publicKey: validDelegate.publicKey,
									decryptionKey: validDelegate.key,
								},
							},
							200
						)
						.then(res => {
							expect(res.body.data[0].publicKey).to.be.eql(
								validDelegate.publicKey
							);
							expect(res.body.data[0].forging).to.be.true;
						});
				}
			});
	});

	// TODO: Find a library for supertest to make request from a proxy server
	it('called from unauthorized IP should fail');

	it('using no params should fail', () => {
		return toggleForgingEndpoint.makeRequest({ data: {} }, 400).then(res => {
			expectSwaggerParamError(res, 'data');
		});
	});

	it('using invalid publicKey should fail', () => {
		var invalidPublicKey =
			'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
		var params = {
			publicKey: invalidPublicKey,
			decryptionKey: validDelegate.key,
		};

		return toggleForgingEndpoint
			.makeRequest({ data: params }, 404)
			.then(res => {
				expect(res.body.message).to.contains('not found');
			});
	});

	it('using invalid key should fail', () => {
		var params = {
			publicKey: validDelegate.publicKey,
			decryptionKey: 'invalid key',
		};

		return toggleForgingEndpoint
			.makeRequest({ data: params }, 404)
			.then(res => {
				expect(res.body.message).to.contain(
					'Invalid key and public key combination'
				);
			});
	});

	it('using valid params should be ok', () => {
		var params = {
			publicKey: validDelegate.publicKey,
			decryptionKey: validDelegate.key,
		};

		return toggleForgingEndpoint
			.makeRequest({ data: params }, 200)
			.then(res => {
				expect(res.body.data).to.have.length(1);
				expect(res.body.data[0].publicKey).to.be.eql(validDelegate.publicKey);
			});
	});

	it('using valid params should toggle forging status', () => {
		var params = {
			publicKey: validDelegate.publicKey,
			decryptionKey: validDelegate.key,
		};

		return forgingStatusEndpoint
			.makeRequest({ publicKey: params.publicKey }, 200)
			.then(res => {
				var currentStatus = res.body.data[0].forging;

				return toggleForgingEndpoint
					.makeRequest({ data: params }, 200)
					.then(res => {
						expect(res.body.data[0].publicKey).to.eql(validDelegate.publicKey);
						expect(res.body.data[0].forging).to.not.eql(currentStatus);
					});
			});
	});
});
