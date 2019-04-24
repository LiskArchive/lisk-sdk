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

require('../../functional');
const genesisDelegates = require('../../../data/genesis_delegates.json');
const SwaggerEndpoint = require('../../../common/swagger_spec');
const apiHelpers = require('../../../common/helpers/api');

const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('PUT /node/status/forging', () => {
	const validDelegate = genesisDelegates.delegates[0];
	const updateForgingEndpoint = new SwaggerEndpoint('PUT /node/status/forging');
	const forgingStatusEndpoint = new SwaggerEndpoint('GET /node/status/forging');

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
						.then(updateForgingEndpointRes => {
							expect(updateForgingEndpointRes.body.data[0].publicKey).to.be.eql(
								validDelegate.publicKey
							);
							expect(updateForgingEndpointRes.body.data[0].forging).to.be.true;
						});
				}

				return null;
			});
	});

	/* eslint-disable mocha/no-pending-tests */
	// TODO: Find a library for supertest to make request from a proxy server
	it('called from unauthorized IP should fail');
	/* eslint-enable mocha/no-pending-tests */

	it('using no params should fail', async () => {
		return updateForgingEndpoint.makeRequest({ data: {} }, 400).then(res => {
			expectSwaggerParamError(res, 'data');
		});
	});

	it('using without forging param should fail', async () => {
		const invalidPublicKey =
			'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
		const params = {
			publicKey: invalidPublicKey,
			password: validDelegate.password,
		};

		return updateForgingEndpoint
			.makeRequest({ data: params }, 400)
			.then(res => {
				expectSwaggerParamError(res, 'data');
			});
	});

	it('using invalid publicKey should fail', async () => {
		const invalidPublicKey =
			'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
		const params = {
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

	it('using invalid password should fail', async () => {
		const params = {
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

	it('using valid params should be ok', async () => {
		const params = {
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

	it('using forging false should disable forging status', async () => {
		const params = {
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

	it('using forging true should enable forging status', async () => {
		const params = {
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
