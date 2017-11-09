'use strict';

var swaggerEndpoint = require('../../../common/swaggerSpec');

describe('GET /node', function () {

	describe('/constants', function () {

		var endPoint = swaggerEndpoint('GET /node/constants 200');

		var constantsResponse;

		before(function () {
			return endPoint.makeRequest()
				.then(function (response) {
					constantsResponse = response.body;
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

		var endPoint = swaggerEndpoint('GET /node/status 200');

		return endPoint.makeRequest();
	});
});
