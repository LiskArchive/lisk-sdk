/* eslint-disable mocha/no-pending-tests */
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
	var updateForgingEndpoint = new swaggerEndpoint('PUT /node/status/forging');
	var forgingStatusEndpoint = new swaggerEndpoint('GET /node/status/forging');

	before(() => {
		return forgingStatusEndpoint
			.makeRequest({ publicKey: validDelegate.publicKey }, 200)
			.then(res => {
				if (!res.body.data[0].forging) {
					return updateForgingEndpoint
						.makeRequest(
							{
								data: {
									publicKey: validDelegate.publicKey,
									password: validDelegate.password,
									forging: true,
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
		return updateForgingEndpoint.makeRequest({ data: {} }, 400).then(res => {
			expectSwaggerParamError(res, 'data');
		});
	});

	it('using without forging param should fail', () => {
		var invalidPublicKey =
			'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
		var params = {
			publicKey: invalidPublicKey,
			password: validDelegate.password,
		};

		return updateForgingEndpoint
			.makeRequest({ data: params }, 400)
			.then(res => {
				expectSwaggerParamError(res, 'data');
			});
	});

	it('using invalid publicKey should fail', () => {
		var invalidPublicKey =
			'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
		var params = {
			publicKey: invalidPublicKey,
			password: validDelegate.password,
			forging: true,
		};

		return updateForgingEndpoint
			.makeRequest({ data: params }, 404)
			.then(res => {
				expect(res.body.message).to.contains('not found');
			});
	});

	it('using invalid password should fail', () => {
		var params = {
			publicKey: validDelegate.publicKey,
			password: 'invalid password',
			forging: true,
		};

		return updateForgingEndpoint
			.makeRequest({ data: params }, 404)
			.then(res => {
				expect(res.body.message).to.contain(
					'Invalid password and public key combination'
				);
			});
	});

	it('using valid params should be ok', () => {
		var params = {
			publicKey: validDelegate.publicKey,
			password: validDelegate.password,
			forging: true,
		};

		return updateForgingEndpoint
			.makeRequest({ data: params }, 200)
			.then(res => {
				expect(res.body.data).to.have.length(1);
				expect(res.body.data[0].publicKey).to.be.eql(validDelegate.publicKey);
				expect(res.body.data[0].forging).to.be.eql(true);
			});
	});

	it('using forging false should disable forging status', () => {
		var params = {
			publicKey: validDelegate.publicKey,
			password: validDelegate.password,
			forging: false,
		};

		return forgingStatusEndpoint
			.makeRequest({ publicKey: params.publicKey }, 200)
			.then(res => {
				expect(res.body.data[0].forging).to.be.eql(true);

				return updateForgingEndpoint.makeRequest({ data: params }, 200);
			})
			.then(res => {
				expect(res.body.data[0].publicKey).to.eql(validDelegate.publicKey);
				expect(res.body.data[0].forging).to.be.eql(false);

				return forgingStatusEndpoint.makeRequest(
					{ publicKey: params.publicKey },
					200
				);
			})
			.then(res => {
				expect(res.body.data[0].forging).to.be.eql(false);
			});
	});

	it('using forging true should enable forging status', () => {
		var params = {
			publicKey: validDelegate.publicKey,
			password: validDelegate.password,
			forging: false,
		};

		// First disable the forging
		return updateForgingEndpoint
			.makeRequest(
				{
					data: {
						publicKey: validDelegate.publicKey,
						password: validDelegate.password,
						forging: false,
					},
				},
				200
			)
			.then(res => {
				expect(res.body.data[0].publicKey).to.eql(validDelegate.publicKey);
				expect(res.body.data[0].forging).to.be.eql(false);

				return forgingStatusEndpoint.makeRequest(
					{ publicKey: params.publicKey },
					200
				);
			})
			.then(res => {
				expect(res.body.data[0].publicKey).to.be.eql(validDelegate.publicKey);
				expect(res.body.data[0].forging).to.be.eql(false);

				// Now enable the forging
				return updateForgingEndpoint.makeRequest(
					{
						data: {
							publicKey: validDelegate.publicKey,
							password: validDelegate.password,
							forging: true,
						},
					},
					200
				);
			})
			.then(res => {
				expect(res.body.data[0].publicKey).to.eql(validDelegate.publicKey);
				expect(res.body.data[0].forging).to.be.eql(true);

				return forgingStatusEndpoint.makeRequest(
					{ publicKey: params.publicKey },
					200
				);
			})
			.then(res => {
				expect(res.body.data[0].publicKey).to.be.eql(validDelegate.publicKey);
				expect(res.body.data[0].forging).to.be.eql(true);
			});
	});
});
