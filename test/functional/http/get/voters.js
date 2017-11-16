'use strict';

var randomstring = require('randomstring');
var node = require('../../../node.js');
var _ = node._;

var apiCodes = require('../../../../helpers/apiCodes.js');
var constants = require('../../../../helpers/constants.js');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var getVotersPromise = require('../../../common/apiHelpers').getVotersPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;
var waitForBlocksPromise = node.Promise.promisify(node.waitForBlocks);

describe('GET /api/voters', function () {

	var validVotedDelegate = node.eAccount;
	var validNotVotedDelegate = node.gAccount;
	var validNotExistingAddress = '11111111111111111111L';

	function expectValidVotedDelegateResponse (res) {
		node.expect(res).to.have.property('status').equal(apiCodes.OK);
		node.expect(res).to.have.nested.property('body.address').that.is.a('string');
		node.expect(res).to.have.nested.property('body.balance').that.is.a('string');
		node.expect(res).to.have.nested.property('body.voters').that.is.an('array').and.have.a.lengthOf.at.least(1);
		node.expect(res).to.have.nested.property('body.voters.0.address').that.is.a('string').and.have.a.lengthOf.at.least(2);
		node.expect(res).to.have.nested.property('body.voters.0.username');
		node.expect(res).to.have.nested.property('body.voters.0.publicKey').that.is.a('string').and.have.a.lengthOf(64);
		node.expect(res).to.have.nested.property('body.voters.0.balance').that.is.a('string');
		node.expect(res).to.have.nested.property('body.votes').that.is.a('number').equal(res.body.voters.length);
	}

	function expectValidNotVotedDelegateResponse (res) {
		node.expect(res).to.have.property('status').equal(apiCodes.OK);
		node.expect(res).to.have.nested.property('body.address').that.is.a('string');
		node.expect(res).to.have.nested.property('body.balance').that.is.a('string');
		node.expect(res).to.have.nested.property('body.voters').that.is.an('array').and.to.be.empty;
		node.expect(res).to.have.nested.property('body.votes').that.is.a('number').equal(0);
	}

	describe('?', function () {

		describe('required fields', function () {

			describe('when params are not defined', function () {

				var response;
				var emptyParams =  [];

				before(function () {
					return getVotersPromise(emptyParams).then(function (res) {
						response = res;
					});
				});

				it('should return message = Data does not match any schemas from "anyOf"', function () {
					node.expect(response).to.have.nested.property('body.message').equal('Data does not match any schemas from \'anyOf\'');
				});

				it('should return status = 400', function () {
					node.expect(response).to.have.property('status').equal(apiCodes.BAD_REQUEST);
				});
			});

			describe('when only limit param provided', function () {

				var response;
				var validLimit = 1;
				var validLimitParams = ['limit=' + validLimit];

				before(function () {
					return getVotersPromise(validLimitParams).then(function (res) {
						response = res;
					});
				});

				it('should return message = Data does not match any schemas from "anyOf"', function () {
					node.expect(response).to.have.nested.property('body.message').equal('Data does not match any schemas from \'anyOf\'');
				});

				it('should return status = 400', function () {
					node.expect(response).to.have.property('status').equal(apiCodes.BAD_REQUEST);
				});
			});

			describe('when only sort param provided', function () {

				var response;
				var validSort = 'address';
				var validSortParams = ['sort=' + validSort];

				before(function () {
					return getVotersPromise(validSortParams).then(function (res) {
						response = res;
					});
				});

				it('should return message = Data does not match any schemas from "anyOf"', function () {
					node.expect(response).to.have.nested.property('body.message').equal('Data does not match any schemas from \'anyOf\'');
				});

				it('should return status = 400', function () {
					node.expect(response).to.have.property('status').equal(apiCodes.BAD_REQUEST);
				});
			});

			describe('when only offset param provided', function () {

				var response;
				var validOffset = 1;
				var validOffsetParams = ['offset=' + validOffset];

				before(function () {
					return getVotersPromise(validOffsetParams).then(function (res) {
						response = res;
					});
				});

				it('should return message = Data does not match any schemas from "anyOf"', function () {
					node.expect(response).to.have.nested.property('body.message').equal('Data does not match any schemas from \'anyOf\'');
				});

				it('should return status = 400', function () {
					node.expect(response).to.have.property('status').equal(apiCodes.BAD_REQUEST);
				});
			});

			describe('when offset, sort, limit params provided', function () {

				var response;
				var validOffset = 1;
				var validLimit = 1;
				var validSort = 'address';
				var validMergedParams = ['offset=' + validOffset + '&sort=' + validSort + '&validLimit=' + validLimit];

				before(function () {
					return getVotersPromise(validMergedParams).then(function (res) {
						response = res;
					});
				});

				it('should return message = Data does not match any schemas from "anyOf"', function () {
					node.expect(response).to.have.nested.property('body.message').equal('Data does not match any schemas from \'anyOf\'');
				});

				it('should return status = 400', function () {
					node.expect(response).to.have.property('status').equal(400);
				});
			});

			describe('when one of required params provided', function () {

				describe('when address param provided', function () {

					var validAddress = node.eAccount.address;
					var validAddressParams = ['address=' + validAddress];

					it('should return status = 200', function () {
						return getVotersPromise(validAddressParams).then(function (res) {
							node.expect(res).to.have.property('status').equal(200);
						});
					});
				});

				describe('when publicKey param provided', function () {

					var validPublicKey = node.eAccount.publicKey;
					var validPublicKeyParams = ['publicKey=' + validPublicKey];

					it('should return status = 200', function () {
						return getVotersPromise(validPublicKeyParams).then(function (res) {
							node.expect(res).to.have.property('status').equal(200);
						});
					});
				});

				describe('when username param provided', function () {

					var validUsername = node.eAccount.delegateName;
					var validUsernameParams = ['username=' + validUsername];

					it('should return status = 200', function () {
						return getVotersPromise(validUsernameParams).then(function (res) {
							node.expect(res).to.have.property('status').equal(200);
						});
					});
				});
			});

			describe('when all required params (address, publicKey, username) provided', function () {

				var response;
				var validAddress = node.eAccount.address;
				var validPublicKey = node.eAccount.publicKey;
				var validUsername = node.eAccount.delegateName;
				var validMergedParams = ['address=' + validAddress + '&publicKey=' + validPublicKey + '&username=' + validUsername];

				before(function () {
					return getVotersPromise(validMergedParams).then(function (res) {
						response = res;
					});
				});

				it('should return the result for when querying with delegate_101 data', function () {
					expectValidVotedDelegateResponse(response);
				});

				it('should return status = 200', function () {
					node.expect(response).to.have.property('status').equal(apiCodes.OK);
				});
			});
		});

		describe('publicKey', function () {

			it('using no publicKey should return empty response and code = 204', function () {
				var params = [
					'publicKey='
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.NO_CONTENT);
					node.expect(res).to.have.property('body').that.is.empty;
				});
			});

			it('using invalid publicKey should fail', function () {
				var params = [
					'publicKey=' + 'invalidPublicKey'
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').equal('Object didn\'t pass validation for format publicKey: invalidPublicKey');
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

			it('using valid not existing publicKey should return empty response and code = 204', function () {

				var validNotExistingPublicKey = 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8';
				var params = [
					'publicKey=' + validNotExistingPublicKey
				];
				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.NO_CONTENT);
					node.expect(res).to.have.property('body').that.is.empty;
				});
			});
		});

		describe('secondPublicKey', function () {

			it('using no secondPublicKey should return empty response and code = 204', function () {
				var params = [
					'secondPublicKey='
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.NO_CONTENT);
					node.expect(res).to.have.property('body').that.is.empty;
				});
			});

			it('using invalid secondPublicKey should fail', function () {
				var params = [
					'secondPublicKey=' + 'invalidSecondPublicKey'
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').equal('Object didn\'t pass validation for format publicKey: invalidSecondPublicKey');
				});
			});

			it('using valid not existing secondPublicKey should return empty response and code = 204', function () {

				var validNotExistingSecondPublicKey = 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8';
				var params = [
					'secondPublicKey=' + validNotExistingSecondPublicKey
				];
				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.NO_CONTENT);
					node.expect(res).to.have.property('body').that.is.empty;
				});
			});
		});

		describe('address', function () {

			it('using no address should return message = "String is too short (0 chars), minimum 2"', function () {
				var params = [
					'address='
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').equal('String is too short (0 chars), minimum 2');
				});
			});

			it('using invalid address should fail', function () {
				var params = [
					'address=' + 'invalidAddress'
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').equal('Object didn\'t pass validation for format address: invalidAddress');
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

			it('using valid not existing address should return empty response and code = 204', function () {

				var params = [
					'address=' + validNotExistingAddress
				];
				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.NO_CONTENT);
					node.expect(res).to.have.property('body').that.is.empty;
				});
			});
		});

		describe('username', function () {

			it('using no username should return message = "String is too short (0 chars), minimum 1"', function () {
				var params = [
					'username='
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').equal('String is too short (0 chars), minimum 1');
				});
			});

			it('using invalid username as a number should fail', function () {
				var number = 1;
				var params = [
					'username=' + number
				];

				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').equal('Expected type string but found type integer');
				});
			});

			it('using valid existing username of genesis delegate should return the result', function () {
				var params = [
					'username=' + validVotedDelegate.delegateName
				];
				return getVotersPromise(params).then(expectValidVotedDelegateResponse);
			});

			it('using valid not existing username should return empty response and code = 204', function () {

				var validNotExistingUsername = 'unknownusername';

				var params = [
					'username=' + validNotExistingUsername
				];
				return getVotersPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.NO_CONTENT);
					node.expect(res).to.have.property('body').that.is.empty;
				});
			});
		});

		describe('sort, limit, offset', function () {

			var validExtraDelegateVoter = node.randomAccount();
			var validExtraVoter = node.randomAccount();

			before(function () {
				var enrichExtraDelegateVoterTransaction = node.lisk.transaction.createTransaction(
					validExtraDelegateVoter.address,
					constants.fees.delegate + constants.fees.vote + constants.fees.secondSignature,
					node.gAccount.password
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
						var params = [
							'username=' + validVotedDelegate.delegateName,
							'sort=username:asc'
						];
						return getVotersPromise(params).then(function (res) {
							expectValidVotedDelegateResponse(res);
							node.expect(_(res.body.voters).map('username').dbSort()).to.be.eql(_.map(res.body.voters, 'username'));
						});
					});

					it('should return voters in descending order', function () {
						var params = [
							'username=' + validVotedDelegate.delegateName,
							'sort=username:desc'
						];
						return getVotersPromise(params).then(function (res) {
							expectValidVotedDelegateResponse(res);
							node.expect(_(res.body.voters).map('username').dbSort('desc')).to.be.eql(_.map(res.body.voters, 'username'));
						});
					});
				});

				describe('balance', function () {

					it('should return voters in ascending order', function () {
						var params = [
							'username=' + validVotedDelegate.delegateName,
							'sort=balance:asc'
						];
						return getVotersPromise(params).then(function (res) {
							expectValidVotedDelegateResponse(res);
							node.expect(_(res.body.voters.map(function (account) {
								return Number(account.balance);
							})).sortBy().value()).to.be.eql(_.map(res.body.voters, function (account) {
								return Number(account.balance);
							}));
						});
					});

					it('should return voters in descending order', function () {
						var params = [
							'username=' + validVotedDelegate.delegateName,
							'sort=balance:desc'
						];
						return getVotersPromise(params).then(function (res) {
							expectValidVotedDelegateResponse(res);
							node.expect(_(res.body.voters.map(function (account) {
								return Number(account.balance);
							})).sortBy().reverse().value()).to.be.eql(_.map(res.body.voters, function (account) {
								return Number(account.balance);
							}));
						});
					});
				});
			});
		});
	});
});
