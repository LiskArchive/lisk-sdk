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
const { P2P } = require('@liskhq/lisk-p2p');
const { generatePeerHeader } = require('../../../common/generatePeerHeader');
const SwaggerEndpoint = require('../../../common/swagger_spec');
const apiHelpers = require('../../../common/helpers/api');

const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /peers', () => {
	const peersEndpoint = new SwaggerEndpoint('GET /peers');
	const peerSetting = generatePeerHeader();
	const validHeaders = peerSetting.nodeInfo;
	let p2p1;
	let p2p2;

	before(async () => {
		p2p1 = new P2P(peerSetting);
		p2p2 = new P2P(generatePeerHeader());

		await p2p1.start();
		await p2p2.start();
	});

	after(async () => {
		await p2p1.stop();
		await p2p2.stop();
	});

	const paramSet = {
		ip: {
			valid: ['192.168.99.1'],
			invalid: ['invalid', '1278.0.0.2'],
			checkResponse: true,
		},
		wsPort: {
			valid: [65535, 4508],
			invalid: [0, 65536],
			checkResponse: true,
		},
		httpPort: {
			valid: [65535, 4508],
			invalid: [0, 65536],
			checkResponse: true,
		},
		state: {
			valid: [0, 1, 2],
			invalid: [-1, 3],
			checkResponse: true,
		},
		version: {
			valid: ['999.999.999'],
			invalid: ['9999.999.999a'],
			checkResponse: true,
		},
		protocolVersion: {
			valid: ['999.999'],
			invalid: ['9999.9999', '-1.-1', 'a.b'],
			checkResponse: true,
		},
		broadhash: {
			valid: [__testContext.config.app.nethash],
			invalid: ['invalid'],
			checkResponse: true,
		},
		limit: {
			valid: [1, 100],
			invalid: [-1, 0],
		},
		offset: {
			valid: [1],
			invalid: [-1],
		},
		sort: {
			valid: ['height:asc'],
			invalid: ['alpha'],
		},
	};
	/**
	 * Skipping this GET /api/peers tests as of now because we are using new p2p library and it needs a different apporach to setup the functional test
	 */
	Object.keys(paramSet).forEach(param => {
		// Describe each param
		describe(param, () => {
			paramSet[param].invalid.forEach(val => {
				// Test case for each invalid param
				it(`using invalid value ${param}=${val}`, async () => {
					const params = {};
					params[param] = val;
					return peersEndpoint.makeRequest(params, 400).then(res => {
						apiHelpers.expectSwaggerParamError(res, param);
					});
				});
			});

			paramSet[param].valid.forEach(val => {
				// Test case for each valid param
				it(`using valid value ${param}=${val}`, async () => {
					const params = {};
					params[param] = val;
					return peersEndpoint.makeRequest(params, 200).then(res => {
						if (paramSet[param].checkResponse) {
							res.body.data.forEach(peer => {
								expect(peer[param]).to.be.eql(val);
							});
						}
					});
				});
			});
		});
	});

	describe('pass data from a real peer', () => {
		it(`using a valid httpPort = ${
			validHeaders.httpPort
		} should return the result`, async () => {
			return peersEndpoint
				.makeRequest({ httpPort: validHeaders.httpPort }, 200)
				.then(res => {
					expect(res.body.data[0].httpPort).to.be.eql(validHeaders.httpPort);
				});
		});

		it(`using state = ${
			validHeaders.state
		} should return the result`, async () => {
			return peersEndpoint
				.makeRequest({ state: validHeaders.state }, 200)
				.then(res => {
					expect(res.body.data[0].state).to.be.eql(2);
				});
		});

		it(`using version = "${
			validHeaders.version
		}" should return the result`, async () => {
			return peersEndpoint
				.makeRequest({ version: validHeaders.version }, 200)
				.then(res => {
					expect(res.body.data[0].version).to.be.eql(validHeaders.version);
				});
		});

		it(`using protocolVersion = "${
			validHeaders.protocolVersion
		}" should return the result`, async () => {
			return peersEndpoint
				.makeRequest({ protocolVersion: validHeaders.protocolVersion }, 200)
				.then(res => {
					expect(res.body.data[0].protocolVersion).to.be.eql(
						validHeaders.protocolVersion
					);
				});
		});

		it(`using valid broadhash = "${
			validHeaders.broadhash
		}" should return the result`, async () => {
			return peersEndpoint
				.makeRequest({ broadhash: validHeaders.broadhash }, 200)
				.then(res => {
					expect(res.body.data[0].broadhash).to.be.eql(validHeaders.broadhash);
				});
		});

		it('using sort = "version:asc" should return results in ascending order by version', async () => {
			return peersEndpoint
				.makeRequest({ sort: 'version:asc' }, 200)
				.then(res => {
					const versions = _(res.body.data)
						.map('version')
						.value();
					expect(_.clone(versions).sort()).to.be.eql(versions);
				});
		});

		it('using sort = "version:desc" should return results in descending order by version', async () => {
			return peersEndpoint
				.makeRequest({ sort: 'version:desc' }, 200)
				.then(res => {
					const versions = _(res.body.data)
						.map('version')
						.value();
					expect(
						_.clone(versions)
							.sort()
							.reverse()
					).to.be.eql(versions);
				});
		});

		it('using limit = 1 and offset = 1 should be ok', async () => {
			const limit = 1;
			let firstObject = null;

			return peersEndpoint
				.makeRequest({ limit }, 200)
				.then(res => {
					expect(res.body.data.length).to.be.at.most(limit);
					firstObject = res.body.data[0];

					return peersEndpoint.makeRequest({ limit, offset: 1 }, 200);
				})
				.then(res => {
					expect(res.body.data.length).to.be.at.most(limit);
					expect(res.body.data[0]).to.not.equal(firstObject);
				});
		});
	});

	describe('with wrong input', () => {
		it('using invalid field name should fail', async () => {
			return peersEndpoint
				.makeRequest(
					{
						whatever: validHeaders.broadhash,
					},
					400
				)
				.then(res => {
					expectSwaggerParamError(res, 'whatever');
				});
		});

		it('using empty valid parameter should return empty array', async () => {
			return peersEndpoint
				.makeRequest(
					{
						broadhash: '',
					},
					200
				)
				.then(res => {
					expect(res.body.data).to.be.empty;
				});
		});

		it('using completely invalid fields should fail', async () => {
			return peersEndpoint
				.makeRequest(
					{
						wsPort: 'invalid',
						limit: 'invalid',
						offset: 'invalid',
						sort: 'invalid',
					},
					400
				)
				.then(res => {
					expectSwaggerParamError(res, 'wsPort');
					expectSwaggerParamError(res, 'limit');
					expectSwaggerParamError(res, 'offset');
					expectSwaggerParamError(res, 'sort');
				});
		});

		it('using partially invalid fields should fail', async () => {
			return peersEndpoint
				.makeRequest(
					{
						wsPort: 5678,
						limit: 'invalid',
						offset: 'invalid',
						sort: 'invalid',
					},
					400
				)
				.then(res => {
					expectSwaggerParamError(res, 'limit');
					expectSwaggerParamError(res, 'offset');
					expectSwaggerParamError(res, 'sort');
				});
		});
	});

	it('using no params should be ok', async () => {
		return peersEndpoint.makeRequest({}, 200).then(res => {
			expect(res.body.data).to.not.empty;
		});
	});

	describe('node does not connect to itself', () => {
		it('should not contain itself in its peer list', async () => {
			return peersEndpoint.makeRequest({}, 200).then(res => {
				const responseData = res.body.data;

				expect(responseData).is.an('array');

				responseData.forEach(peer => {
					expect(peer.wsPort).to.not.be.eql(
						__testContext.config.modules.network.wsPort
					);
				});
			});
		});
	});
});
