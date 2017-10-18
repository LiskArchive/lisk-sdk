'use strict';

var node = require('../../../node.js');
var http = require('../../../common/httpCommunication.js');

describe('GET /api/node/constants', function () {

	var constantsResponse;

	before(function (done) {
		http.get('/api/node/constants', function (err, res) {
			constantsResponse = res.body;
			done();
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

	it('should return a result containing nonce = "Lm8aN0rlnMsUZ0uM"', function () {
		node.expect(constantsResponse).to.have.property('nonce').equal('Lm8aN0rlnMsUZ0uM');
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
