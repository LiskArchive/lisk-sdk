'use strict';

var test = require('../../functional.js');

var randomstring = require('randomstring');
var lisk = require('lisk-js');
var Promise = require('bluebird');

var _ = test._;
var accountFixtures = require('../../../fixtures/accounts');

var apiCodes = require('../../../../helpers/apiCodes');
var constants = require('../../../../helpers/constants');

var randomUtil = require('../../../common/utils/random');
var swaggerEndpoint = require('../../../common/swaggerSpec');
var waitFor = require('../../../common/utils/waitFor');
var apiHelpers = require('../../../common/helpers/api');
var constants = require('../../../../helpers/constants');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /api/votes', function () {

	var votesEndpoint = new swaggerEndpoint('GET /votes');
	var nonVoterDelegate = accountFixtures.existingDelegate;
	var voterDelegate = accountFixtures.genesis;
	var validNotExistingAddress = '11111111111111111111L';

	function expectValidVoterDelegateResponse (res) {
		res.body.data.votesUsed.should.be.least(res.body.data.votes.length);
		constants.maxVotesPerAccount.should.be.equal(res.body.data.votesUsed + res.body.data.votesAvailable);
	}

	function expectValidNonVoterDelegateResponse (res) {
		res.body.data.votesUsed.should.be.equal(0);
		res.body.data.votes.should.be.empty;
		constants.maxVotesPerAccount.should.be.equal(res.body.data.votesUsed + res.body.data.votesAvailable);
	}

	describe('?', function () {

		describe('required fields', function () {

			describe('when params are not defined', function () {

				it('should fail with error message requiring any of param', function () {
					return votesEndpoint.makeRequest({}, 400).then(function (res) {
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
					return votesEndpoint.makeRequest({sort: 'username:asc'}, 400).then(function (res) {
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
					return votesEndpoint.makeRequest({offset: 1}, 400).then(function (res) {
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
					return votesEndpoint.makeRequest({sort: 'username:asc'}, 400).then(function (res) {
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
					return votesEndpoint.makeRequest({
						address: accountFixtures.existingDelegate.address,
						publicKey: accountFixtures.existingDelegate.publicKey,
						username: accountFixtures.existingDelegate.delegateName
					}, 200).then(function (res) {
						expectValidVoterDelegateResponse(res);
					});
				});
			});
		});

		describe('publicKey', function () {

			it('using no publicKey should fail', function () {
				return votesEndpoint.makeRequest({publicKey: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using invalid publicKey should fail', function () {
				return votesEndpoint.makeRequest({publicKey: 'invalidPublicKey'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using valid existing publicKey of genesis delegate should return list of votes it made', function () {
				return votesEndpoint.makeRequest({publicKey: voterDelegate.publicKey}, 200).then(expectValidVoterDelegateResponse);
			});

			it('using valid existing publicKey of a delegate account should return the expected result of having no vote', function () {
				return votesEndpoint.makeRequest({publicKey: nonVoterDelegate.publicKey}, 200).then(expectValidNonVoterDelegateResponse);
			});

			it('using valid inexistent publicKey should return empty response and code = 404', function () {
				return votesEndpoint.makeRequest({publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8'}, 404);
			});
		});

		describe('secondPublicKey', function () {

			it('using no secondPublicKey should fail', function () {
				return votesEndpoint.makeRequest({secondPublicKey: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'secondPublicKey');
				});
			});

			it('using invalid secondPublicKey should fail', function () {
				return votesEndpoint.makeRequest({secondPublicKey: 'invalidSecondPublicKey'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'secondPublicKey');
				});
			});

			it('using valid inexistent secondPublicKey should return empty response and code = 404', function () {
				return votesEndpoint.makeRequest({secondPublicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8'}, 404);
			});
		});

		describe('address', function () {

			it('using no address should fail', function () {
				return votesEndpoint.makeRequest({address: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using invalid address should fail', function () {
				return votesEndpoint.makeRequest({address: 'invalidAddress'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using valid existing address of genesis delegate should return list of votes it made', function () {
				return votesEndpoint.makeRequest({address: voterDelegate.address}, 200).then(expectValidVoterDelegateResponse);
			});

			it('using valid existing address of a delegate account should return the expected result of having no vote', function () {
				return votesEndpoint.makeRequest({address: nonVoterDelegate.address}, 200).then(expectValidNonVoterDelegateResponse);
			});

			it('using valid inexistent address should return empty response and code = 404', function () {
				return votesEndpoint.makeRequest({address: validNotExistingAddress}, 404);
			});
		});

		describe('username', function () {

			it('using no username should fail', function () {
				return votesEndpoint.makeRequest({username: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'username');
				});
			});

			it('using unknown integer username should be ok but not found', function () {
				return votesEndpoint.makeRequest({username: 1}, 404);
			});

			it('using valid existing username of a delegate account should return the expected result of having no vote', function () {
				return votesEndpoint.makeRequest({username: nonVoterDelegate.delegateName}, 200).then(expectValidNonVoterDelegateResponse);
			});

			it('using valid inexistent username should return empty response and code = 404', function () {
				return votesEndpoint.makeRequest({username: 'unknownusername'}, 404);
			});
		});

		describe('sort', function () {

			describe('sort with any of required field (username)', function () {

				describe('username', function () {

					it('should return votes in ascending order', function () {
						return votesEndpoint.makeRequest({sort: 'username:asc', publicKey: voterDelegate.publicKey}, 200).then(function (res) {
							expectValidVoterDelegateResponse(res);
							_(res.body.data.votes).sortBy('username').map('username').value().should.to.be.eql(_.map(res.body.data.votes, 'username'));
						});
					});

					it('should return votes in descending order', function () {
						return votesEndpoint.makeRequest({sort: 'username:desc', publicKey: voterDelegate.publicKey}, 200).then(function (res) {
							expectValidVoterDelegateResponse(res);
							_(res.body.data.votes).sortBy('username').reverse().map('username').value().should.to.be.eql(_.map(res.body.data.votes, 'username'));
						});
					});
				});

				describe('balance', function () {

					it('should return votes in ascending order', function () {
						return votesEndpoint.makeRequest({sort: 'balance:asc', publicKey: voterDelegate.publicKey}, 200).then(function (res) {
							expectValidVoterDelegateResponse(res);
							_.map(res.body.data.votes, 'balance').sort().should.to.be.eql(_.map(res.body.data.votes, 'balance'));
						});
					});

					it('should return votes in descending order', function () {
						return votesEndpoint.makeRequest({sort: 'balance:desc', publicKey: voterDelegate.publicKey}, 200).then(function (res) {
							expectValidVoterDelegateResponse(res);
							_.map(res.body.data.votes, 'balance').sort().reverse().should.to.be.eql(_.map(res.body.data.votes, 'balance'));
						});
					});
				});
			});
		});

		describe('limit & offset', function () {

			describe('limit=2', function () {

				it('should return 2 voters', function () {
					return votesEndpoint.makeRequest({limit: 2, publicKey: voterDelegate.publicKey}, 200).then(function (res) {
						res.body.data.votes.should.have.length(2);
					});
				});
			});

			describe('limit=2 & offset=1', function () {

				it('should return 2 voters, containing 1 from the previous result', function () {
					var votes = null;

					return votesEndpoint.makeRequest({limit: 2, offset: 0, publicKey: voterDelegate.publicKey}, 200).then(function (res) {
						res.body.data.votes.should.have.length(2);

						votes = _.map(res.body.data.votes, 'address');

						return votesEndpoint.makeRequest({limit: 2, offset: 1, publicKey: voterDelegate.publicKey}, 200);
					}).then(function (res) {
						_.intersection(votes, _.map(res.body.data.votes, 'address')).should.have.length(1);
					});
				});
			});
		});

		describe('increased votes numbers after posting vote transaction', function () {

			it('should increase votes and votesUsed after posting a vote', function () {
				var account = randomUtil.account();
				var creditTransaction = lisk.transaction.createTransaction(
					account.address,
					constants.fees.delegate + constants.fees.vote,
					accountFixtures.genesis.password
				);
				var delegateTransaction = lisk.delegate.createDelegate(account.password, randomstring.generate({
					length: 10,
					charset: 'alphabetic',
					capitalization: 'lowercase'
				}));
				var voteTransaction = lisk.vote.createVote(account.password, ['+' + nonVoterDelegate.publicKey]);

				return apiHelpers.sendTransactionPromise(creditTransaction).then(function (res) {
					return waitFor.confirmations([creditTransaction.id]);
				}).then(function () {
					return apiHelpers.sendTransactionPromise(delegateTransaction);
				}).then(function (res) {
					return waitFor.confirmations([delegateTransaction.id]);
				}).then(function (res) {
					return votesEndpoint.makeRequest({address: account.address}, 200);
				}).then(function (res) {
					expectValidNonVoterDelegateResponse(res);
					res.body.data.address.should.be.equal(account.address);
					res.body.data.votesUsed.should.be.equal(0);
					res.body.data.votesAvailable.should.be.equal(constants.maxVotesPerAccount);
				}).then(function (res) {
					return apiHelpers.sendTransactionPromise(voteTransaction);
				}).then(function (res) {
					return waitFor.confirmations([voteTransaction.id]);
				}).then(function (value) {
					return votesEndpoint.makeRequest({address: account.address}, 200);
				}).then(function (res) {
					expectValidVoterDelegateResponse(res);
					res.body.data.votesUsed.should.be.equal(1);
					_.map(res.body.data.votes, 'publicKey').should.be.eql([nonVoterDelegate.publicKey]);
				});
			});
		});
	});
});
