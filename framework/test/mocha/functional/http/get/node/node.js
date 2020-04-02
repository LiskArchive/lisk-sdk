/*
 * Copyright © 2019 Lisk Foundation
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

require('../../../functional');
const SwaggerEndpoint = require('../../../../../utils/http/swagger_spec');
const apiHelpers = require('../../../../../utils/http/api');

const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /node', () => {
	describe('/constants', () => {
		const endPoint = new SwaggerEndpoint('GET /node/constants 200');
		const devnetNetworkId =
			'93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e';

		let constantsResponse;

		before(() => {
			return endPoint.makeRequest().then(response => {
				constantsResponse = response.body.data;
			});
		});

		it('should return a result containing networkId = "93d00fe5be70d90e7ae247936a2e7d83b50809c79b73fa14285f02c842348b3e"', async () => {
			return expect(constantsResponse.networkId).to.be.equal(devnetNetworkId);
		});

		it('should return a result containing milestone that is a number <= 500000000', async () => {
			return expect(parseInt(constantsResponse.milestone, 10)).to.at.most(
				500000000,
			);
		});

		it('should return a result containing reward that is a number <= 500000000', async () => {
			return expect(parseInt(constantsResponse.reward, 10)).to.at.most(
				500000000,
			);
		});

		it('should return a result containing supply that is a number = 10000000000000000', async () => {
			return expect(constantsResponse.supply).to.be.equal('10000000000000000');
		});

		it('should return a result containing version in semver format', async () => {
			return expect(constantsResponse)
				.to.have.property('version')
				.to.match(
					/^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})(-(alpha|beta|rc)\.[0-9]{1,3}(\.[0-9]{1,3})?)?$/,
				);
		});

		it('should return a result containing protocolVersion correctly formatted', async () => {
			return expect(constantsResponse)
				.to.have.property('protocolVersion')
				.to.match(/^(\d|[1-9]\d{1,2})\.(\d|[1-9]\d{1,2})$/);
		});
	});

	describe('/status', () => {
		const nodeStatusEndpoint = new SwaggerEndpoint('GET /node/status 200');
		// eslint-disable-next-line
		it('should return node status', async () => {
			return nodeStatusEndpoint.makeRequest();
		});

		describe('GET /forging', () => {
			const forgingEndpoint = new SwaggerEndpoint('GET /node/status/forging');

			/* eslint-disable mocha/no-pending-tests */
			// TODO: Find a library for supertest to make request from a proxy server
			it('called from unauthorized IP should fail');
			/* eslint-enable mocha/no-pending-tests */

			it('using no params should return full list of internal forgers', async () => {
				return forgingEndpoint.makeRequest({}, 200).then(res => {
					expect(res.body.data.length).to.be.eql(
						__testContext.config.app.node.forging.delegates.length,
					);
				});
			});

			it('using invalid publicKey should fail', async () => {
				return forgingEndpoint
					.makeRequest({ publicKey: 'invalidPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using empty publicKey should should fail', async () => {
				return forgingEndpoint
					.makeRequest({ publicKey: 'invalidPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using existing publicKey should be ok', async () => {
				const publicKey =
					__testContext.config.app.node.forging.delegates[0].publicKey;

				return forgingEndpoint.makeRequest({ publicKey }, 200).then(res => {
					expect(res.body.data).to.have.length(1);
					expect(res.body.data[0].publicKey).to.be.eql(publicKey);
				});
			});

			it('using available publicKey should be ok', async () => {
				const publicKey =
					__testContext.config.app.node.forging.delegates[0].publicKey;

				return forgingEndpoint.makeRequest({ publicKey }, 200).then(res => {
					expect(res.body.data[0].publicKey).to.be.eql(publicKey);
					expect(res.body.data[0].forging).to.be.true;
				});
			});

			it('using invalid forging value should fail', async () => {
				return forgingEndpoint.makeRequest({ forging: null }, 400).then(res => {
					expectSwaggerParamError(res, 'forging');
				});
			});

			it('should return only forging delegates', async () => {
				return forgingEndpoint.makeRequest({ forging: true }, 200).then(res => {
					expect(res.body.data.length).to.be.eql(
						__testContext.config.app.node.forging.delegates.length,
					);
					expect(
						res.body.data.filter(d => d.forging === false).length,
					).to.be.eql(0);
				});
			});
		});
	});
});
