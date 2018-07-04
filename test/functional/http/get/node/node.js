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

require('../../../functional.js');
var swaggerEndpoint = require('../../../../common/swagger_spec');
var apiHelpers = require('../../../../common/helpers/api');

var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /node', () => {
	describe('/constants', () => {
		var endPoint = swaggerEndpoint('GET /node/constants 200');

		var constantsResponse;

		before(() => {
			return endPoint.makeRequest().then(response => {
				constantsResponse = response.body.data;
			});
		});

		it('should return a result containing nethash = "198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d"', () => {
			return expect(constantsResponse.nethash).to.be.equal(
				'198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d'
			);
		});

		it('should return a result containing milestone that is a number <= 500000000', () => {
			return expect(parseInt(constantsResponse.milestone)).to.at.most(
				500000000
			);
		});

		it('should return a result containing reward that is a number <= 500000000', () => {
			return expect(parseInt(constantsResponse.reward)).to.at.most(500000000);
		});

		it('should return a result containing supply that is a number = 10000000000000000', () => {
			return expect(constantsResponse.supply).to.be.equal('10000000000000000');
		});

		it('should return a result containing version in semver format', () => {
			return expect(constantsResponse)
				.to.have.property('version')
				.to.match(
					/^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})(-(alpha|beta|rc)\.[0-9]{1,3}(\.[0-9]{1,3})?)?$/
				);
		});

		it('should return a result containing fees.send = 10000000', () => {
			return expect(constantsResponse.fees.send).to.be.equal('10000000');
		});

		it('should return a result containing fees.vote = 100000000', () => {
			return expect(constantsResponse.fees.vote).to.be.equal('100000000');
		});

		it('should return a result containing fees.secondSignature = 500000000', () => {
			return expect(constantsResponse.fees.secondSignature).to.be.equal(
				'500000000'
			);
		});

		it('should return a result containing fees.delegate = 2500000000', () => {
			return expect(constantsResponse.fees.delegate).to.be.equal('2500000000');
		});

		it('should return a result containing fees.multisignature = 500000000', () => {
			return expect(constantsResponse.fees.multisignature).to.be.equal(
				'500000000'
			);
		});

		it('should return a result containing fees.dappRegistration = 2500000000', () => {
			return expect(constantsResponse.fees.dappRegistration).to.be.equal(
				'2500000000'
			);
		});

		it('should return a result containing fees.dappWithdrawal = 10000000', () => {
			return expect(constantsResponse.fees.dappWithdrawal).to.be.equal(
				'10000000'
			);
		});

		it('should return a result containing fees.dappDeposit = 10000000', () => {
			return expect(constantsResponse.fees.dappDeposit).to.be.equal('10000000');
		});
	});

	describe('/status', () => {
		var ndoeStatusEndpoint = swaggerEndpoint('GET /node/status 200');

		it('should return node status', () => {
			return ndoeStatusEndpoint.makeRequest();
		});

		describe('GET /forging', () => {
			var forgingEndpoint = new swaggerEndpoint('GET /node/status/forging');

			// TODO: Find a library for supertest to make request from a proxy server
			it('called from unauthorized IP should fail');

			it('using no params should return full list of internal forgers', () => {
				return forgingEndpoint.makeRequest({}, 200).then(res => {
					expect(res.body.data.length).to.be.eql(
						__testContext.config.forging.delegates.length
					);
				});
			});

			it('using invalid publicKey should fail', () => {
				return forgingEndpoint
					.makeRequest({ publicKey: 'invalidPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using empty publicKey should should fail', () => {
				return forgingEndpoint
					.makeRequest({ publicKey: 'invalidPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using existing publicKey should be ok', () => {
				var publicKey = __testContext.config.forging.delegates[0].publicKey;

				return forgingEndpoint.makeRequest({ publicKey }, 200).then(res => {
					expect(res.body.data).to.have.length(1);
					expect(res.body.data[0].publicKey).to.be.eql(publicKey);
				});
			});

			it('using available publicKey should be ok', () => {
				var publicKey = __testContext.config.forging.delegates[0].publicKey;

				return forgingEndpoint.makeRequest({ publicKey }, 200).then(res => {
					expect(res.body.data[0].publicKey).to.be.eql(publicKey);
					expect(res.body.data[0].forging).to.be.true;
				});
			});
		});
	});
});
