'use strict';

require('../../functional.js');

var randomstring = require('randomstring');
var _ = require('lodash');

var node = require('../../../node.js');
var accountFixtures = require('../../../fixtures/accounts');

var apiCodes = require('../../../../helpers/apiCodes.js');
var constants = require('../../../../helpers/constants.js');

var waitFor = require('../../../common/utils/waitFor');
var waitForBlocksPromise = node.Promise.promisify(waitFor.blocks);

var randomUtil = require('../../../common/utils/random');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var getVotersPromise = require('../../../common/apiHelpers').getVotersPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;
var swaggerEndpoint = require('../../../common/swaggerSpec');
var expectSwaggerParamError = require('../../../common/apiHelpers').expectSwaggerParamError;

describe('GET /api/voters', function () {

	var votersEndpoint = new swaggerEndpoint('GET /voters');
	var validVotedDelegate = accountFixtures.existingDelegate;
	var validNotVotedDelegate = accountFixtures.genesis;
	var validNotExistingAddress = '11111111111111111111L';

	function expectValidVotedDelegateResponse (res) {
		res.body.data.votes.should.be.least(res.body.data.voters.length);
	}

	function expectValidNotVotedDelegateResponse (res) {
		res.body.data.votes.should.be.equal(0);
		res.body.data.voters.should.be.empty;
	}

	describe('?', function () {

		describe('required fields', function () {

			describe('when params are not defined', function () {

				it('should fail with error message requiring any of param', function () {
					return votersEndpoint.makeRequest({}, 400).then(function (res) {
						res.body.errors.should.have.length(4);
						expectSwaggerParamError(res, 'username');
						expectSwaggerParamError(res, 'address');
						expectSwaggerParamError(res, 'publicKey');
						expectSwaggerParamError(res, 'secondPublicKey');
					});
				});
			});

			describe('when only sort param provided', function () {

				it('should fail with error message requiring any of param', function () {
					return votersEndpoint.makeRequest({sort: 'username:asc'}, 400).then(function (res) {
						res.body.errors.should.have.length(4);
						expectSwaggerParamError(res, 'username');
						expectSwaggerParamError(res, 'address');
						expectSwaggerParamError(res, 'publicKey');
						expectSwaggerParamError(res, 'secondPublicKey');
					});
				});
			});

			describe('when only offset param provided', function () {

				it('should fail with error message requiring any of param', function () {
					return votersEndpoint.makeRequest({offset: 1}, 400).then(function (res) {
						res.body.errors.should.have.length(4);
						expectSwaggerParamError(res, 'username');
						expectSwaggerParamError(res, 'address');
						expectSwaggerParamError(res, 'publicKey');
						expectSwaggerParamError(res, 'secondPublicKey');
					});
				});
			});

			describe('when sort params provided', function () {

				it('should fail with error message requiring any of param', function () {
					return votersEndpoint.makeRequest({sort: 'username:asc'}, 400).then(function (res) {
						res.body.errors.should.have.length(4);
						expectSwaggerParamError(res, 'username');
						expectSwaggerParamError(res, 'address');
						expectSwaggerParamError(res, 'publicKey');
						expectSwaggerParamError(res, 'secondPublicKey');
					});
				});
			});

			describe('when all required params (address, publicKey, username) provided', function () {

				it('should return the expected result as when db has only 101 delegates', function () {
					return votersEndpoint.makeRequest({
						address: accountFixtures.existingDelegate.address,
						publicKey: accountFixtures.existingDelegate.publicKey,
						username: accountFixtures.existingDelegate.delegateName
					}, 200).then(function (res) {
						expectValidVotedDelegateResponse(res);
					});
				});
			});
		});

		describe('publicKey', function () {

			it('using no publicKey should fail', function () {
				return votersEndpoint.makeRequest({publicKey: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using invalid publicKey should fail', function () {
				return votersEndpoint.makeRequest({publicKey: 'invalidPublicKey'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using valid existing publicKey of genesis delegate should return the expected result', function () {
				return votersEndpoint.makeRequest({publicKey: validVotedDelegate.publicKey}, 200).then(expectValidVotedDelegateResponse);
			});

			it('using valid existing publicKey of genesis account should return the expected result of having never been voted for', function () {
				return votersEndpoint.makeRequest({publicKey: validNotVotedDelegate.publicKey}, 200).then(expectValidNotVotedDelegateResponse);
			});

			it('using valid inexistent publicKey should return empty response and code = 404', function () {
				return votersEndpoint.makeRequest({publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8'}, 404);
			});
		});

		describe('secondPublicKey', function () {

			it('using no secondPublicKey should fail', function () {
				return votersEndpoint.makeRequest({secondPublicKey: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'secondPublicKey');
				});
			});

			it('using invalid secondPublicKey should fail', function () {
				return votersEndpoint.makeRequest({secondPublicKey: 'invalidSecondPublicKey'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'secondPublicKey');
				});
			});

			it('using valid inexistent secondPublicKey should return empty response and code = 404', function () {
				return votersEndpoint.makeRequest({secondPublicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8'}, 404);
			});
		});

		describe('address', function () {

			it('using no address should fail', function () {
				return votersEndpoint.makeRequest({address: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using invalid address should fail', function () {
				return votersEndpoint.makeRequest({address: 'invalidAddress'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using valid existing address of genesis delegate should return the expected result', function () {
				return votersEndpoint.makeRequest({address: validVotedDelegate.address}, 200).then(expectValidVotedDelegateResponse);
			});

			it('using valid existing address of genesis account should return the expected result of having never been voted for', function () {
				return votersEndpoint.makeRequest({address: validNotVotedDelegate.address}, 200).then(expectValidNotVotedDelegateResponse);
			});

			it('using valid inexistent address should return empty response and code = 404', function () {
				return votersEndpoint.makeRequest({address: validNotExistingAddress}, 404);
			});
		});

		describe('username', function () {

			it('using no username should fail', function () {
				return votersEndpoint.makeRequest({username: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'username');
				});
			});

			it('using invalid username as a number should fail', function () {
				return votersEndpoint.makeRequest({username: 1}, 400).then(function (res) {
					expectSwaggerParamError(res, 'username');
				});
			});

			it('using valid existing username of genesis delegate should return the expected result', function () {
				return votersEndpoint.makeRequest({username: validVotedDelegate.delegateName}, 200).then(expectValidVotedDelegateResponse);
			});

			it('using valid inexistent username should return empty response and code = 404', function () {
				return votersEndpoint.makeRequest({username: 'unknownusername'}, 404);
			});
		});

		describe('sort', function () {

			var validExtraDelegateVoter = randomUtil.account();
			var validExtraVoter = randomUtil.account();

			before(function () {
				var enrichExtraDelegateVoterTransaction = node.lisk.transaction.createTransaction(
					validExtraDelegateVoter.address,
					constants.fees.delegate + constants.fees.vote + constants.fees.secondSignature,
					accountFixtures.genesis.password
				);

				var registerExtraVoterAsADelegateTransaction = node.lisk.delegate.createDelegate(validExtraDelegateVoter.password, randomstring.generate({
					length: 10,
					charset: 'alphabetic',
					capitalization: 'lowercase'
				}));

				var voteByExtraDelegateVoterTransaction = node.lisk.vote.createVote(validExtraDelegateVoter.password, ['+' + validVotedDelegate.publicKey]);

				return sendTransactionPromise(enrichExtraDelegateVoterTransaction)
					.then(function () {
						return waitForConfirmations([enrichExtraDelegateVoterTransaction.id]);
					})
					.then(function (){
						return sendTransactionPromise(registerExtraVoterAsADelegateTransaction);
					})
					.then(function () {
						return waitForConfirmations([registerExtraVoterAsADelegateTransaction.id]);
					})
					.then(function () {
						return sendTransactionPromise(voteByExtraDelegateVoterTransaction);
					})
					.then(function () {
						return waitForConfirmations([voteByExtraDelegateVoterTransaction.id]);
					});
			});

			describe('sort with any of required field (username)', function () {

				describe('username', function () {

					it('should return voters in ascending order', function () {
						return votersEndpoint.makeRequest({sort: 'username:asc', username: validVotedDelegate.delegateName}, 200).then(function (res) {
							expectValidVotedDelegateResponse(res);
							res.body.data.username.should.equal(validVotedDelegate.delegateName);
							_(res.body.data.voters).sortBy('username').map('username').value().should.to.be.eql(_.map(res.body.data.voters, 'username'));
						});
					});

					it('should return voters in descending order', function () {
						return votersEndpoint.makeRequest({sort: 'username:desc', username: validVotedDelegate.delegateName}, 200).then(function (res) {
							expectValidVotedDelegateResponse(res);
							res.body.data.username.should.equal(validVotedDelegate.delegateName);
							_(res.body.data.voters).sortBy('username').reverse().map('username').value().should.to.be.eql(_.map(res.body.data.voters, 'username'));
						});
					});
				});

				describe('balance', function () {

					it('should return voters in ascending order', function () {
						return votersEndpoint.makeRequest({sort: 'balance:asc', username: validVotedDelegate.delegateName}, 200).then(function (res) {
							expectValidVotedDelegateResponse(res);
							res.body.data.username.should.equal(validVotedDelegate.delegateName);
							_.map(res.body.data.voters, 'balance').sort().should.to.be.eql(_.map(res.body.data.voters, 'balance'));
						});
					});

					it('should return voters in descending order', function () {
						return votersEndpoint.makeRequest({sort: 'balance:desc', username: validVotedDelegate.delegateName}, 200).then(function (res) {
							expectValidVotedDelegateResponse(res);
							res.body.data.username.should.equal(validVotedDelegate.delegateName);
							_.map(res.body.data.voters, 'balance').sort().reverse().should.to.be.eql(_.map(res.body.data.voters, 'balance'));
						});
					});
				});
			});
		});

		describe('limit & offset', function () {

			describe('limit=2', function () {

				it('should return 2 voters', function () {
					return votersEndpoint.makeRequest({limit: 2, username: validVotedDelegate.delegateName}, 200).then(function (res) {
						res.body.data.voters.should.have.length(2);
					});
				});
			});

			describe('limit=2 & offset=1', function () {

				it('should return 2 voters, containing 1 from the previous result', function () {
					var voters = null;

					return votersEndpoint.makeRequest({limit: 2, offset: 0, username: validVotedDelegate.delegateName}, 200).then(function (res) {
						res.body.data.voters.should.have.length(2);

						voters = _.map(res.body.data.voters, 'address');

						return votersEndpoint.makeRequest({limit: 2, offset: 1, username: validVotedDelegate.delegateName}, 200);
					}).then(function (res) {
						_.intersection(voters, _.map(res.body.data.voters, 'address')).should.have.length(1);
					});
				});
			});
		});
	});
});
