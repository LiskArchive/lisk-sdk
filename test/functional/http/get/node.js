'use strict';

var node = require('../../../node.js');
var getNodeConstantsPromise = require('../../../common/apiHelpers').getNodeConstantsPromise;
var getNodeStatusPromise = require('../../../common/apiHelpers').getNodeStatusPromise;

describe('GET /api/node', function () {

	describe('/constants', function () {

		var constantsResponse;

		before(function () {
			return getNodeConstantsPromise()
				.then(function (responseBody) {
					constantsResponse = responseBody;
				});
		});

		it('should return a result containing build = ""', function () {
			node.expect(constantsResponse).to.have.property('build').to.equal('');
		});

		it('should return a result containing commit as a string of length 40', function () {
			node.expect(constantsResponse).to.have.property('commit').that.is.a('string').and.has.a.lengthOf(40);
		});

		it('should return a result containing epoch as a string date', function () {
			node.expect(constantsResponse).to.have.property('epoch').that.is.a('string');
			node.expect(new Date(constantsResponse.epoch)).not.to.equal('Invalid Date');
		});

		it('should return a result containing nethash = "198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d"', function () {
			node.expect(constantsResponse).to.have.property('nethash').equal('198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d');
		});

		it('should return a result containing nonce as a string of length 16', function () {
			node.expect(constantsResponse).to.have.property('nonce').that.is.a('string').and.has.a.lengthOf(16);
		});

		it('should return a result containing milestone that is a number <= 4', function () {
			node.expect(constantsResponse).to.have.property('milestone').to.be.at.most(4);
		});

		it('should return a result containing reward that is a number <= 500000000', function () {
			node.expect(constantsResponse).to.have.property('reward').to.be.at.most(500000000);
		});

		it('should return a result containing supply that is a number = 10000000000000000', function () {
			node.expect(constantsResponse).to.have.property('supply').equal(10000000000000000);
		});

		it('should return a result containing version = "0.0.0a"', function () {
			node.expect(constantsResponse).to.have.property('version').equal('0.0.0a');
		});

		it('should return a result containing fees.send = 10000000', function () {
			node.expect(constantsResponse).to.have.nested.property('fees.send').equal(10000000);
		});

		it('should return a result containing fees.vote = 100000000', function () {
			node.expect(constantsResponse).to.have.nested.property('fees.vote').equal(100000000);
		});

		it('should return a result containing fees.secondSignature = 500000000', function () {
			node.expect(constantsResponse).to.have.nested.property('fees.secondSignature').equal(500000000);
		});

		it('should return a result containing fees.delegate = 2500000000', function () {
			node.expect(constantsResponse).to.have.nested.property('fees.delegate').equal(2500000000);
		});

		it('should return a result containing fees.multisignature = 500000000', function () {
			node.expect(constantsResponse).to.have.nested.property('fees.multisignature').equal(500000000);
		});

		it('should return a result containing fees.dappRegistration = 2500000000', function () {
			node.expect(constantsResponse).to.have.nested.property('fees.dappRegistration').equal(2500000000);
		});

		it('should return a result containing fees.dappWithdrawal = 10000000', function () {
			node.expect(constantsResponse).to.have.nested.property('fees.dappWithdrawal').equal(10000000);
		});

		it('should return a result containing fees.dappDeposit = 10000000', function () {
			node.expect(constantsResponse).to.have.nested.property('fees.dappDeposit').equal(10000000);
		});

		it('should return a result containing fees.data = 10000000', function () {
			node.expect(constantsResponse).to.have.nested.property('fees.data').equal(10000000);
		});
	});

	describe('/status', function () {

		var statusResponse;

		before(function () {
			return getNodeStatusPromise()
				.then(function (responseBody) {
					statusResponse = responseBody;
				});
		});

		it('should return a result containing broadhash that is a string of length 64', function () {
			node.expect(statusResponse).to.have.property('broadhash').that.is.a('string').and.has.a.lengthOf(64);
		});

		it('should return a result containing consensus as a number >= 0 and <= 100 or null', function () {
			node.expect(statusResponse).to.have.property('consensus');
			if (statusResponse.consensus !== null) {
				node.expect(statusResponse.consensus).to.be.at.most(100).and.at.least(0);
			}
		});

		it('should return a result containing height as a number >= 1', function () {
			node.expect(statusResponse).to.have.property('height').that.is.a('number').at.least(1);
		});

		it('should return a result containing networkHeight as a number >= 1 or null', function () {
			node.expect(statusResponse).to.have.property('networkHeight');
			if (statusResponse.consensus !== null) {
				node.expect(statusResponse.consensus).to.be.at.least(1);
			}
		});

		it('should return a result containing syncing that is boolean', function () {
			node.expect(statusResponse).to.have.property('syncing').to.be.a('boolean');
		});
	});
});
