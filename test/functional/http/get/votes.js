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

require('../../functional.js');
var randomstring = require('randomstring');
var lisk = require('lisk-elements').default;
var accountFixtures = require('../../../fixtures/accounts');
var randomUtil = require('../../../common/utils/random');
var swaggerEndpoint = require('../../../common/swagger_spec');
var waitFor = require('../../../common/utils/wait_for');
var apiHelpers = require('../../../common/helpers/api');
var Bignum = require('../../../../helpers/bignum.js');

const { FEES, MAX_VOTES_PER_ACCOUNT } = global.constants;
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /api/votes', () => {
	var votesEndpoint = new swaggerEndpoint('GET /votes');
	var nonVoterDelegate = accountFixtures.existingDelegate;
	var voterDelegate = accountFixtures.genesis;
	var validNotExistingAddress = '11111111111111111111L';

	function expectValidVoterDelegateResponse(res) {
		expect(res.body.data.votesUsed).to.be.least(res.body.data.votes.length);
		expect(MAX_VOTES_PER_ACCOUNT).to.be.equal(
			res.body.data.votesUsed + res.body.data.votesAvailable
		);
	}

	function expectValidNonVoterDelegateResponse(res) {
		expect(res.body.data.votesUsed).to.be.equal(0);
		expect(res.body.data.votes).to.be.empty;
		expect(MAX_VOTES_PER_ACCOUNT).to.be.equal(
			res.body.data.votesUsed + res.body.data.votesAvailable
		);
	}

	describe('?', () => {
		describe('required fields', () => {
			describe('when params are not defined', () => {
				it('should fail with error message requiring any of param', () => {
					return votesEndpoint.makeRequest({}, 400).then(res => {
						expect(res.body.errors).to.have.length(4);
						expectSwaggerParamError(res, 'username');
						expectSwaggerParamError(res, 'address');
						expectSwaggerParamError(res, 'publicKey');
						expectSwaggerParamError(res, 'secondPublicKey');
					});
				});
			});

			describe('when only sort param provided', () => {
				it('should fail with error message requiring any of param', () => {
					return votesEndpoint
						.makeRequest({ sort: 'username:asc' }, 400)
						.then(res => {
							expect(res.body.errors).to.have.length(4);
							expectSwaggerParamError(res, 'username');
							expectSwaggerParamError(res, 'address');
							expectSwaggerParamError(res, 'publicKey');
							expectSwaggerParamError(res, 'secondPublicKey');
						});
				});
			});

			describe('when only offset param provided', () => {
				it('should fail with error message requiring any of param', () => {
					return votesEndpoint.makeRequest({ offset: 1 }, 400).then(res => {
						expect(res.body.errors).to.have.length(4);
						expectSwaggerParamError(res, 'username');
						expectSwaggerParamError(res, 'address');
						expectSwaggerParamError(res, 'publicKey');
						expectSwaggerParamError(res, 'secondPublicKey');
					});
				});
			});

			describe('when sort params provided', () => {
				it('should fail with error message requiring any of param', () => {
					return votesEndpoint
						.makeRequest({ sort: 'username:asc' }, 400)
						.then(res => {
							expect(res.body.errors).to.have.length(4);
							expectSwaggerParamError(res, 'username');
							expectSwaggerParamError(res, 'address');
							expectSwaggerParamError(res, 'publicKey');
							expectSwaggerParamError(res, 'secondPublicKey');
						});
				});
			});

			describe('when all required params (address, publicKey, username) provided', () => {
				it('should return the expected result as when db has only 101 delegates', () => {
					return votesEndpoint
						.makeRequest(
							{
								address: accountFixtures.existingDelegate.address,
								publicKey: accountFixtures.existingDelegate.publicKey,
								username: accountFixtures.existingDelegate.delegateName,
							},
							200
						)
						.then(res => {
							expectValidVoterDelegateResponse(res);
						});
				});
			});
		});

		describe('publicKey', () => {
			it('using no publicKey should fail', () => {
				return votesEndpoint.makeRequest({ publicKey: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using invalid publicKey should fail', () => {
				return votesEndpoint
					.makeRequest({ publicKey: 'invalidPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using valid existing publicKey of genesis delegate should return list of votes it made', () => {
				return votesEndpoint
					.makeRequest({ publicKey: voterDelegate.publicKey }, 200)
					.then(expectValidVoterDelegateResponse);
			});

			it('using valid existing publicKey of a delegate account should return the expected result of having no vote', () => {
				return votesEndpoint
					.makeRequest({ publicKey: nonVoterDelegate.publicKey }, 200)
					.then(expectValidNonVoterDelegateResponse);
			});

			it('using valid inexistent publicKey should return empty response and code = 404', () => {
				return votesEndpoint.makeRequest(
					{
						publicKey:
							'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8',
					},
					404
				);
			});
		});

		describe('secondPublicKey', () => {
			it('using no secondPublicKey should fail', () => {
				return votesEndpoint
					.makeRequest({ secondPublicKey: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'secondPublicKey');
					});
			});

			it('using invalid secondPublicKey should fail', () => {
				return votesEndpoint
					.makeRequest({ secondPublicKey: 'invalidSecondPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'secondPublicKey');
					});
			});

			it('using valid inexistent secondPublicKey should return empty response and code = 404', () => {
				return votesEndpoint.makeRequest(
					{
						secondPublicKey:
							'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8',
					},
					404
				);
			});
		});

		describe('address', () => {
			it('using no address should fail', () => {
				return votesEndpoint.makeRequest({ address: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using invalid address should fail', () => {
				return votesEndpoint
					.makeRequest({ address: 'invalidAddress' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using valid existing address of genesis delegate should return list of votes it made', () => {
				return votesEndpoint
					.makeRequest({ address: voterDelegate.address }, 200)
					.then(expectValidVoterDelegateResponse);
			});

			it('using valid existing address of a delegate account should return the expected result of having no vote', () => {
				return votesEndpoint
					.makeRequest({ address: nonVoterDelegate.address }, 200)
					.then(expectValidNonVoterDelegateResponse);
			});

			it('using valid inexistent address should return empty response and code = 404', () => {
				return votesEndpoint.makeRequest(
					{ address: validNotExistingAddress },
					404
				);
			});
		});

		describe('username', () => {
			it('using no username should fail', () => {
				return votesEndpoint.makeRequest({ username: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'username');
				});
			});

			it('using unknown integer username should be ok but not found', () => {
				return votesEndpoint.makeRequest({ username: 1 }, 404);
			});

			it('using valid existing username of a delegate account should return the expected result of having no vote', () => {
				return votesEndpoint
					.makeRequest({ username: nonVoterDelegate.delegateName }, 200)
					.then(expectValidNonVoterDelegateResponse);
			});

			it('using valid inexistent username should return empty response and code = 404', () => {
				return votesEndpoint.makeRequest({ username: 'unknownusername' }, 404);
			});
		});

		describe('sort', () => {
			describe('sort with any of required field (username)', () => {
				describe('username', () => {
					it('should return votes in ascending order', () => {
						return votesEndpoint
							.makeRequest(
								{ sort: 'username:asc', publicKey: voterDelegate.publicKey },
								200
							)
							.then(res => {
								expectValidVoterDelegateResponse(res);
								expect(
									_(res.body.data.votes)
										.sortBy('username')
										.map('username')
										.value()
								).to.to.be.eql(_.map(res.body.data.votes, 'username'));
							});
					});

					it('should return votes in descending order', () => {
						return votesEndpoint
							.makeRequest(
								{ sort: 'username:desc', publicKey: voterDelegate.publicKey },
								200
							)
							.then(res => {
								expectValidVoterDelegateResponse(res);
								expect(
									_(res.body.data.votes)
										.sortBy('username')
										.reverse()
										.map('username')
										.value()
								).to.to.be.eql(_.map(res.body.data.votes, 'username'));
							});
					});
				});

				describe('balance', () => {
					it('should return votes in ascending order', () => {
						return votesEndpoint
							.makeRequest(
								{ sort: 'balance:asc', publicKey: voterDelegate.publicKey },
								200
							)
							.then(res => {
								expectValidVoterDelegateResponse(res);
								expect(
									_(res.body.data.votes)
										.map('balance')
										.sortNumbers()
								).to.be.eql(_.map(res.body.data.votes, 'balance'));
							});
					});

					it('should return votes in descending order', () => {
						return votesEndpoint
							.makeRequest(
								{ sort: 'balance:desc', publicKey: voterDelegate.publicKey },
								200
							)
							.then(res => {
								expectValidVoterDelegateResponse(res);
								expect(
									_(res.body.data.votes)
										.map('balance')
										.sortNumbers('desc')
								).to.to.be.eql(_.map(res.body.data.votes, 'balance'));
							});
					});
				});
			});
		});

		describe('limit & offset', () => {
			describe('limit=2', () => {
				it('should return 2 voters', () => {
					return votesEndpoint
						.makeRequest({ limit: 2, publicKey: voterDelegate.publicKey }, 200)
						.then(res => {
							expect(res.body.data.votes).to.have.length(2);
						});
				});
			});

			describe('limit=101', () => {
				it('should return 101 voters', () => {
					return votesEndpoint
						.makeRequest(
							{ limit: 101, publicKey: voterDelegate.publicKey },
							200
						)
						.then(res => {
							expect(res.body.data.votes).to.have.length(101);
						});
				});
			});

			describe('limit=2 & offset=1', () => {
				it('should return 2 voters, containing 1 from the previous result', () => {
					var votes = null;

					return votesEndpoint
						.makeRequest(
							{ limit: 2, offset: 0, publicKey: voterDelegate.publicKey },
							200
						)
						.then(res => {
							expect(res.body.data.votes).to.have.length(2);

							votes = _.map(res.body.data.votes, 'address');

							return votesEndpoint.makeRequest(
								{ limit: 2, offset: 1, publicKey: voterDelegate.publicKey },
								200
							);
						})
						.then(res => {
							expect(
								_.intersection(votes, _.map(res.body.data.votes, 'address'))
							).to.have.length(1);
						});
				});
			});
		});

		describe('increased votes numbers after posting vote transaction', () => {
			it('should increase votes and votesUsed after posting a vote', done => {
				var account = randomUtil.account();
				var creditTransaction = lisk.transaction.transfer({
					amount: new Bignum(FEES.DELEGATE).plus(FEES.VOTE),
					passphrase: accountFixtures.genesis.passphrase,
					recipientId: account.address,
				});
				var delegateTransaction = lisk.transaction.registerDelegate({
					passphrase: account.passphrase,
					username: randomstring.generate({
						length: 10,
						charset: 'alphabetic',
						capitalization: 'lowercase',
					}),
				});
				var voteTransaction = lisk.transaction.castVotes({
					passphrase: account.passphrase,
					votes: [`${nonVoterDelegate.publicKey}`],
				});

				apiHelpers
					.sendTransactionPromise(creditTransaction)
					.then(() => {
						return waitFor.confirmations([creditTransaction.id]);
					})
					.then(() => {
						return apiHelpers.sendTransactionPromise(delegateTransaction);
					})
					.then(() => {
						return waitFor.confirmations([delegateTransaction.id]);
					})
					.then(() => {
						return votesEndpoint.makeRequest({ address: account.address }, 200);
					})
					.then(res => {
						expectValidNonVoterDelegateResponse(res);
						expect(res.body.data.address).to.be.equal(account.address);
						expect(res.body.data.votesUsed).to.be.equal(0);
						expect(res.body.data.votesAvailable).to.be.equal(
							MAX_VOTES_PER_ACCOUNT
						);
					})
					.then(() => {
						return apiHelpers.sendTransactionPromise(voteTransaction);
					})
					.then(() => {
						return waitFor.confirmations([voteTransaction.id]);
					})
					.then(() => {
						return votesEndpoint.makeRequest({ address: account.address }, 200);
					})
					.then(res => {
						expectValidVoterDelegateResponse(res);
						expect(res.body.data.votesUsed).to.be.equal(1);
						expect(_.map(res.body.data.votes, 'publicKey')).to.be.eql([
							nonVoterDelegate.publicKey,
						]);
						done();
					})
					.catch(err => {
						done(err);
					});
			});
		});
	});
});
