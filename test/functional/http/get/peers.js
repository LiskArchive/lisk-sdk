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
var WSServer = require('../../../common/ws/server_master');
var swaggerEndpoint = require('../../../common/swagger_spec');
var apiHelpers = require('../../../common/helpers/api');

describe('GET /peers', () => {
	var peersEndpoint = new swaggerEndpoint('GET /peers');
	var wsServer1 = new WSServer();
	var wsServer2 = new WSServer();
	var validHeaders = wsServer1.headers;

	before(() => {
		return wsServer1
			.start()
			.then(() => {
				return wsServer2.start().catch(() => {
					wsServer2.stop();
				});
			})
			.catch(() => {
				wsServer1.stop();
			});
	});

	after(() => {
		wsServer1.stop();
		return wsServer2.stop();
	});

	var paramSet = {
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
		broadhash: {
			valid: [__testContext.config.nethash],
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

	Object.keys(paramSet).forEach(param => {
		// Describe each param
		describe(param, () => {
			paramSet[param].invalid.forEach(val => {
				// Test case for each invalid param
				it(`using invalid value ${param}=${val}`, () => {
					var params = {};
					params[param] = val;
					return peersEndpoint.makeRequest(params, 400).then(res => {
						apiHelpers.expectSwaggerParamError(res, param);
					});
				});
			});

			paramSet[param].valid.forEach(val => {
				// Test case for each valid param
				it(`using valid value ${param}=${val}`, () => {
					var params = {};
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
		} should return the result`, () => {
			return peersEndpoint
				.makeRequest({ httpPort: validHeaders.httpPort }, 200)
				.then(res => {
					expect(res.body.data[0].httpPort).to.be.eql(validHeaders.httpPort);
				});
		});

		it(`using state = ${validHeaders.state} should return the result`, () => {
			return peersEndpoint
				.makeRequest({ state: validHeaders.state }, 200)
				.then(res => {
					expect(res.body.data[0].state).to.be.eql(2);
				});
		});

		it(`using version = "${
			validHeaders.version
		}" should return the result`, () => {
			return peersEndpoint
				.makeRequest({ version: validHeaders.version }, 200)
				.then(res => {
					expect(res.body.data[0].version).to.be.eql(validHeaders.version);
				});
		});

		it(`using valid broadhash = "${
			validHeaders.broadhash
		}" should return the result`, () => {
			return peersEndpoint
				.makeRequest({ broadhash: validHeaders.broadhash }, 200)
				.then(res => {
					expect(res.body.data[0].broadhash).to.be.eql(validHeaders.broadhash);
				});
		});

		it('using sort = "version:asc" should return results in ascending order by version', () => {
			return peersEndpoint
				.makeRequest({ sort: 'version:asc' }, 200)
				.then(res => {
					var versions = _(res.body.data)
						.map('version')
						.value();
					expect(_.clone(versions).sort()).to.be.eql(versions);
				});
		});

		it('using sort = "version:desc" should return results in descending order by version', () => {
			return peersEndpoint
				.makeRequest({ sort: 'version:desc' }, 200)
				.then(res => {
					var versions = _(res.body.data)
						.map('version')
						.value();
					expect(
						_.clone(versions)
							.sort()
							.reverse()
					).to.be.eql(versions);
				});
		});

		it('using limit = 1 and offset = 1 should be ok', () => {
			var limit = 1;
			var firstObject = null;

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
});
