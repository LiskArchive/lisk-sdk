'use strict';

var _ = require('lodash');
var node = require('../../../node.js');
var http = require('../../../common/httpCommunication.js');
var constants = require('../../../../helpers/constants.js');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var getVotersPromise = require('../../../common/apiHelpers').getVotersPromise;
var waitForBlocksPromise = node.Promise.promisify(node.waitForBlocks);

describe('GET /api/voters', function () {

	var validVotedDelegate = node.eAccount;
	var validNotVotedDelegate = node.gAccount;
	var validNotExistingAddress = '11111111111111111111L';

	function expectValidVotedDelegateResponse (res) {
		node.expect(res).to.have.property('address').that.is.a('string');
		node.expect(res).to.have.property('balance').that.is.a('string');
		node.expect(res).to.have.property('voters').that.is.an('array').and.have.a.lengthOf.at.least(1);
		node.expect(res).to.have.nested.property('voters.0.address').that.is.a('string').and.have.a.lengthOf.at.least(2);
		node.expect(res).to.have.nested.property('voters.0.username');
		node.expect(res).to.have.nested.property('voters.0.publicKey').that.is.a('string').and.have.a.lengthOf(64);
		node.expect(res).to.have.nested.property('voters.0.balance').that.is.a('string');
		node.expect(res).to.have.property('votes').that.is.a('number').equal(res.voters.length);
	}

	function expectValidNotVotedDelegateResponse (res) {
		node.expect(res).to.have.property('address').that.is.a('string');
		node.expect(res).to.have.property('balance').that.is.a('string');
		node.expect(res).to.have.property('voters').that.is.an('array').and.to.be.empty;
		node.expect(res).to.have.property('votes').that.is.a('number').equal(0);
	}

	describe('?', function () {

		describe('required fields', function () {

			describe('when params are not defined', function () {

				var response;

				before(function (done) {
					http.get('/api/voters', function (err, res) {
						response = res;
						done();
					});
				});

				it('should return message = Data does not match any schemas from "anyOf"', function () {
					node.expect(response).to.have.nested.property('body.message').equal('Data does not match any schemas from \'anyOf\'');
				});

				it('should return status status = 400', function () {
					node.expect(response).to.have.property('status').equal(400);
				});
			});

			describe('when only limit param provided', function () {

				var response;
				var validLimit = 1;

				before(function (done) {
					http.get('/api/voters?limit=' + validLimit, function (err, res) {
						response = res;
						done();
					});
				});

				it('should return message = Data does not match any schemas from "anyOf"', function () {
					node.expect(response).to.have.nested.property('body.message').equal('Data does not match any schemas from \'anyOf\'');
				});

				it('should return status status = 400', function () {
					node.expect(response).to.have.property('status').equal(400);
				});
			});

			describe('when only sort param provided', function () {

				var response;
				var validOrderBy = 'address';

				before(function (done) {
					http.get('/api/voters?sort=' + validOrderBy, function (err, res) {
						response = res;
						done();
					});
				});

				it('should return message = Data does not match any schemas from "anyOf"', function () {
					node.expect(response).to.have.nested.property('body.message').equal('Data does not match any schemas from \'anyOf\'');
				});

				it('should return status status = 400', function () {
					node.expect(response).to.have.property('status').equal(400);
				});
			});

			describe('when only offset param provided', function () {

				var response;
				var validOffset = 1;

				before(function (done) {
					http.get('/api/voters?offset=' + validOffset, function (err, res) {
						response = res;
						done();
					});
				});

				it('should return message = Data does not match any schemas from "anyOf"', function () {
					node.expect(response).to.have.nested.property('body.message').equal('Data does not match any schemas from \'anyOf\'');
				});

				it('should return status status = 400', function () {
					node.expect(response).to.have.property('status').equal(400);
				});
			});

			describe('when offset, sort, limit params provided', function () {

				var response;
				var validOffset = 1;
				var validLimit = 1;
				var validOrderBy = 'address';

				before(function (done) {
					var params = 'offset=' + validOffset + '&sort=' + validOrderBy + '&validLimit=' + validLimit;
					http.get('/api/voters?' + params, function (err, res) {
						response = res;
						done();
					});
				});

				it('should return message = Data does not match any schemas from "anyOf"', function () {
					node.expect(response).to.have.nested.property('body.message').equal('Data does not match any schemas from \'anyOf\'');
				});

				it('should return status status = 400', function () {
					node.expect(response).to.have.property('status').equal(400);
				});
			});

			describe('when one of required params provided', function () {

				describe('when address param provided', function () {

					var validAddress = node.eAccount.address;

					it('should return status status = 200', function (done) {
						http.get('/api/voters?address=' + validAddress, function (err, res) {
							node.expect(res).to.have.property('status').equal(200);
							done();
						});
					});
				});

				describe('when publicKey param provided', function () {

					var validPublicKey = node.eAccount.publicKey;

					it('should return status status = 200', function (done) {
						http.get('/api/voters?publicKey=' + validPublicKey, function (err, res) {
							node.expect(res).to.have.property('status').equal(200);
							done();
						});
					});
				});

				describe('when username param provided', function () {

					var validUsername = node.eAccount.delegateName;

					it('should return status status = 200', function (done) {
						http.get('/api/voters?username=' + validUsername, function (err, res) {
							node.expect(res).to.have.property('status').equal(200);
							done();
						});
					});
				});
			});

			describe('when all required params (address, publicKey, username) provided', function () {

				var response;
				var validAddress = node.eAccount.address;
				var validPublicKey = node.eAccount.publicKey;
				var validUsername = node.eAccount.delegateName;

				before(function (done) {
					var params = 'address=' + validAddress + '&publicKey=' + validPublicKey + '&username=' + validUsername;
					http.get('/api/voters?' + params, function (err, res) {
						response = res;
						done();
					});
				});

				it('should return the result for when querying with delegate_101 data', function () {
					expectValidVotedDelegateResponse(response.body);
				});

				it('should return status status = 200', function () {
					node.expect(response).to.have.property('status').equal(200);
				});
			});
		});

		describe('publicKey', function () {

			it('using no publicKey should return message = "No data returned"', function () {
				var params = [
					'publicKey='
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('No data returned');
				});
			});

			it('using invalid publicKey should fail', function () {
				var params = [
					'publicKey=' + 'invalidPublicKey'
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Object didn\'t pass validation for format publicKey: invalidPublicKey');
				});
			});

			it('using valid existing publicKey of genesis delegate should return the result', function () {
				var params = [
					'publicKey=' + validVotedDelegate.publicKey
				];
				return getVotersPromise(params).then(expectValidVotedDelegateResponse);
			});

			it('using valid existing publicKey of genesis account should return the never voted result', function () {
				var params = [
					'publicKey=' + validNotVotedDelegate.publicKey
				];
				return getVotersPromise(params).then(expectValidNotVotedDelegateResponse);
			});

			it('using valid not existing publicKey should return message = "No data returned"', function () {

				var validNotExistingPublicKey = 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8';
				var params = [
					'publicKey=' + validNotExistingPublicKey
				];
				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('No data returned');
				});
			});
		});

		describe('address', function () {

			it('using no address should return message = "String is too short (0 chars), minimum 21"', function () {
				var params = [
					'address='
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('String is too short (0 chars), minimum 21');
				});
			});

			it('using invalid address should fail', function () {
				var params = [
					'address=' + 'invalidAddress'
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Object didn\'t pass validation for format address: invalidAddress');
				});
			});

			it('using valid existing address of genesis delegate should return the result', function () {
				var params = [
					'address=' + validVotedDelegate.address
				];
				return getVotersPromise(params).then(expectValidVotedDelegateResponse);
			});

			it('using valid existing address of genesis account should return the never voted result', function () {
				var params = [
					'address=' + validNotVotedDelegate.address
				];
				return getVotersPromise(params).then(expectValidNotVotedDelegateResponse);
			});

			it('using valid not existing address should return message = "No data returned"', function () {

				var params = [
					'address=' + validNotExistingAddress
				];
				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('No data returned');
				});
			});
		});

		describe('username', function () {

			it('using no username should return message = "String is too short (0 chars), minimum 1"', function () {
				var params = [
					'username='
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('String is too short (0 chars), minimum 1');
				});
			});

			it('using invalid username as a number should fail', function () {
				var number = 1;
				var params = [
					'username=' + number
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Expected type string but found type integer');
				});
			});

			it('using valid existing username of genesis delegate should return the result', function () {
				var params = [
					'username=' + validVotedDelegate.delegateName
				];
				return getVotersPromise(params).then(expectValidVotedDelegateResponse);
			});

			it('using valid not existing username should return message = "No data returned"', function () {

				var validNotExistingUsername = 'unknownusername';

				var params = [
					'username=' + validNotExistingUsername
				];
				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('No data returned');
				});
			});
		});

		describe('sort, limit, offset', function () {

			before(function () {
				var validExtraVoter = node.randomAccount();
				var enrichExtraVoterTransaction = node.lisk.transaction.createTransaction(
					validExtraVoter.address,
					constants.fees.delegate + constants.fees.vote,
					node.gAccount.password
				);
				var registerExtraVoterAsADelagateTransaction = node.lisk.delegate.createDelegate(validExtraVoter.password, 'extravoter');
				var voteByExtraVoterTransaction = node.lisk.vote.createVote(validExtraVoter.password, ['+' + validVotedDelegate.publicKey]);

				return sendTransactionPromise(enrichExtraVoterTransaction)
					.then(function () {
						return waitForBlocksPromise(1);
					})
					.then(function (){
						return sendTransactionPromise(registerExtraVoterAsADelagateTransaction);
					})
					.then(function () {
						return waitForBlocksPromise(1);
					})
					.then(function () {
						return sendTransactionPromise(voteByExtraVoterTransaction);
					})
					.then(function () {
						return waitForBlocksPromise(1);
					});
			});

			describe('sort with any of required field (username)', function () {

				describe('address', function () {

					it('should return voters in ascending order', function () {
						var params = [
							'username=' + validVotedDelegate.delegateName,
							'sort=address:asc'
						];
						return getVotersPromise(params).then(function (res) {
							expectValidVotedDelegateResponse(res);
							node.expect(_(res.voters).sortBy('address').map('address').value()).to.be.eql(_.map(res.voters, 'address'));
						});
					});

					it('should return voters in descending order', function () {
						var params = [
							'username=' + validVotedDelegate.delegateName,
							'sort=address:desc'
						];
						return getVotersPromise(params).then(function (res) {
							expectValidVotedDelegateResponse(res);
							node.expect(_(res.voters).sortBy('address').reverse().map('address').value()).to.be.eql(_.map(res.voters, 'address'));
						});
					});
				});

				describe('username', function () {

					it('should return voters in ascending order', function () {
						var params = [
							'username=' + validVotedDelegate.delegateName,
							'sort=username:asc'
						];
						return getVotersPromise(params).then(function (res) {
							expectValidVotedDelegateResponse(res);
							node.expect(_(res.voters).sortBy('username').map('username').value()).to.be.eql(_.map(res.voters, 'username'));
						});
					});

					it('should return voters in descending order', function () {
						var params = [
							'username=' + validVotedDelegate.delegateName,
							'sort=username:desc'
						];
						return getVotersPromise(params).then(function (res) {
							expectValidVotedDelegateResponse(res);
							node.expect(_(res.voters).sortBy('username').reverse().map('username').value()).to.be.eql(_.map(res.voters, 'username'));
						});
					});
				});

				describe('publicKey', function () {

					it('should return voters in ascending order', function () {
						var params = [
							'username=' + validVotedDelegate.delegateName,
							'sort=publicKey:asc'
						];
						return getVotersPromise(params).then(function (res) {
							expectValidVotedDelegateResponse(res);
							node.expect(_(res.voters).sortBy('publicKey').map('publicKey').value()).to.be.eql(_.map(res.voters, 'publicKey'));
						});
					});

					it('should return voters in descending order', function () {
						var params = [
							'username=' + validVotedDelegate.delegateName,
							'sort=publicKey:desc'
						];
						return getVotersPromise(params).then(function (res) {
							expectValidVotedDelegateResponse(res);
							node.expect(_(res.voters).sortBy('publicKey').reverse().map('publicKey').value()).to.be.eql(_.map(res.voters, 'publicKey'));
						});
					});
				});
			});
		});

		describe('codes', function () {

			describe('when query is malformed', function () {

				var invalidParams = 'address="invalidAddress"';

				it('should return http code = 400', function (done) {
					http.get('/api/voters?' + invalidParams, function (err, res) {
						node.expect(res).to.have.property('status').equal(400);
						done();
					});
				});
			});

			describe('when query does not return results', function () {

				var emptyResultParams = 'address=' + validNotExistingAddress;

				it('should return http code = 200', function (done) {
					http.get('/api/voters?' + emptyResultParams, function (err, res) {
						node.expect(res).to.have.property('status').equal(200);
						done();
					});
				});
			});

			describe('when query returns results', function () {

				it('should return http code = 200', function (done) {
					http.get('/api/voters?address=' + node.gAccount.address, function (err, res) {
						node.expect(res).to.have.property('status').equal(200);
						done();
					});
				});
			});
		});
	});
});
