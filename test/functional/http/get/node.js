'use strict';

require('../../functional.js');

var swaggerEndpoint = require('../../../common/swaggerSpec');
var apiHelpers = require('../../../common/apiHelpers');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
var node = require('../../../node');

describe('GET /node', function () {

	describe('/constants', function () {

		var endPoint = swaggerEndpoint('GET /node/constants 200');

		var constantsResponse;

		before(function () {
			return endPoint.makeRequest()
				.then(function (response) {
					constantsResponse = response.body.data;
				});
		});

		it('should return a result containing nethash = "198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d"', function () {
			constantsResponse.nethash.should.be.equal('198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d');
		});


		it('should return a result containing milestone that is a number <= 500000000', function () {
			parseInt(constantsResponse.milestone).should.at.most(500000000);
		});

		it('should return a result containing reward that is a number <= 500000000', function () {
			parseInt(constantsResponse.reward).should.at.most(500000000);
		});

		it('should return a result containing supply that is a number = 10000000000000000', function () {
			constantsResponse.supply.should.be.equal('10000000000000000');
		});

		it('should return a result containing version = "0.0.1"', function () {
			constantsResponse.should.have.property('version').equal('0.0.1');
		});

		it('should return a result containing fees.send = 10000000', function () {
			constantsResponse.fees.send.should.be.equal('10000000');
		});

		it('should return a result containing fees.vote = 100000000', function () {
			constantsResponse.fees.vote.should.be.equal('100000000');
		});

		it('should return a result containing fees.secondSignature = 500000000', function () {
			constantsResponse.fees.secondSignature.should.be.equal('500000000');
		});

		it('should return a result containing fees.delegate = 2500000000', function () {
			constantsResponse.fees.delegate.should.be.equal('2500000000');
		});

		it('should return a result containing fees.multisignature = 500000000', function () {
			constantsResponse.fees.multisignature.should.be.equal('500000000');
		});

		it('should return a result containing fees.dappRegistration = 2500000000', function () {
			constantsResponse.fees.dappRegistration.should.be.equal('2500000000');
		});

		it('should return a result containing fees.dappWithdrawal = 10000000', function () {
			constantsResponse.fees.dappWithdrawal.should.be.equal('10000000');
		});

		it('should return a result containing fees.dappDeposit = 10000000', function () {
			constantsResponse.fees.dappDeposit.should.be.equal('10000000');
		});

		it('should return a result containing fees.data = 10000000', function () {
			constantsResponse.fees.data.should.be.equal('10000000');
		});
	});

	describe('/status', function () {

		var ndoeStatusEndpoint = swaggerEndpoint('GET /node/status 200');

		it('should return node status', function () {
			return ndoeStatusEndpoint.makeRequest();
		});

		describe('GET /forging', function () {

			var forgingEndpoint = new swaggerEndpoint('GET /node/status/forging');

			// TODO: Find a library for supertest to make request from a proxy server
			it('called from unauthorized IP should fail');

			it('using no params should return full list of internal forgers', function () {
				return forgingEndpoint.makeRequest({}, 200).then(function (res) {
					res.body.data.length.should.be.eql(node.config.forging.secret.length);
				});
			});

			it('using invalid publicKey should fail', function () {
				return forgingEndpoint.makeRequest({publicKey: 'invalidPublicKey'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using empty publicKey should should fail', function () {
				return forgingEndpoint.makeRequest({publicKey: 'invalidPublicKey'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using existing publicKey should be ok', function () {
				var publicKey = node.config.forging.secret[0].publicKey;

				return forgingEndpoint.makeRequest({publicKey: publicKey}, 200).then(function (res) {
					res.body.data.should.have.length(1);
					res.body.data[0].publicKey.should.be.eql(publicKey);
				});
			});

			it('using enabled publicKey should be ok', function () {
				var publicKey = node.config.forging.secret[0].publicKey;

				return forgingEndpoint.makeRequest({publicKey: publicKey}, 200).then(function (res) {
					res.body.data[0].publicKey.should.be.eql(publicKey);
					res.body.data[0].forging.should.be.true;
				});
			});
		});
	});
});
