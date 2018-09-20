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

const { FEES } = global.constants;
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /api/voters', () => {
	var votersEndpoint = new swaggerEndpoint('GET /voters');
	var validVotedDelegate = accountFixtures.existingDelegate;
	var validNotVotedDelegate = accountFixtures.genesis;
	var validNotExistingAddress = '11111111111111111111L';

	function expectValidVotedDelegateResponse(res) {
		expect(res.body.data.votes).to.be.least(res.body.data.voters.length);
	}

	function expectValidNotVotedDelegateResponse(res) {
		expect(res.body.data.votes).to.be.equal(0);
		expect(res.body.data.voters).to.be.empty;
	}

	describe('?', () => {
		describe('required fields', () => {
			describe('when params are not defined', () => {
				it('should fail with error message requiring any of param', () => {
					return votersEndpoint.makeRequest({}, 400).then(res => {
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
					return votersEndpoint
						.makeRequest({ sort: 'publicKey:asc' }, 400)
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
					return votersEndpoint.makeRequest({ offset: 1 }, 400).then(res => {
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
					return votersEndpoint
						.makeRequest({ sort: 'publicKey:asc' }, 400)
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
					return votersEndpoint
						.makeRequest(
							{
								address: accountFixtures.existingDelegate.address,
								publicKey: accountFixtures.existingDelegate.publicKey,
								username: accountFixtures.existingDelegate.delegateName,
							},
							200
						)
						.then(res => {
							expectValidVotedDelegateResponse(res);
						});
				});
			});
		});

		describe('publicKey', () => {
			it('using no publicKey should fail', () => {
				return votersEndpoint.makeRequest({ publicKey: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using invalid publicKey should fail', () => {
				return votersEndpoint
					.makeRequest({ publicKey: 'invalidPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using valid existing publicKey of genesis delegate should return the expected result', () => {
				return votersEndpoint
					.makeRequest({ publicKey: validVotedDelegate.publicKey }, 200)
					.then(expectValidVotedDelegateResponse);
			});

			it('using valid existing publicKey of genesis account should return the expected result of having never been voted for', () => {
				return votersEndpoint
					.makeRequest({ publicKey: validNotVotedDelegate.publicKey }, 200)
					.then(expectValidNotVotedDelegateResponse);
			});

			it('using valid inexistent publicKey should return empty response and code = 404', () => {
				return votersEndpoint.makeRequest(
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
				return votersEndpoint
					.makeRequest({ secondPublicKey: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'secondPublicKey');
					});
			});

			it('using invalid secondPublicKey should fail', () => {
				return votersEndpoint
					.makeRequest({ secondPublicKey: 'invalidSecondPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'secondPublicKey');
					});
			});

			it('using valid inexistent secondPublicKey should return empty response and code = 404', () => {
				return votersEndpoint.makeRequest(
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
				return votersEndpoint.makeRequest({ address: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using invalid address should fail', () => {
				return votersEndpoint
					.makeRequest({ address: 'invalidAddress' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using valid existing address of genesis delegate should return the expected result', () => {
				return votersEndpoint
					.makeRequest({ address: validVotedDelegate.address }, 200)
					.then(expectValidVotedDelegateResponse);
			});

			it('using valid existing address of genesis account should return the expected result of having never been voted for', () => {
				return votersEndpoint
					.makeRequest({ address: validNotVotedDelegate.address }, 200)
					.then(expectValidNotVotedDelegateResponse);
			});

			it('using valid inexistent address should return empty response and code = 404', () => {
				return votersEndpoint.makeRequest(
					{ address: validNotExistingAddress },
					404
				);
			});
		});

		describe('username', () => {
			it('using no username should fail', () => {
				return votersEndpoint.makeRequest({ username: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'username');
				});
			});

			it('using unknown integer username should be ok but not found', () => {
				return votersEndpoint.makeRequest({ username: 1 }, 404);
			});

			it('using valid existing username of genesis delegate should return the expected result', () => {
				return votersEndpoint
					.makeRequest({ username: validVotedDelegate.delegateName }, 200)
					.then(expectValidVotedDelegateResponse);
			});

			it('using valid inexistent username should return empty response and code = 404', () => {
				return votersEndpoint.makeRequest({ username: 'unknownusername' }, 404);
			});
		});

		describe('sort', () => {
			var validExtraDelegateVoter = randomUtil.account();

			before(() => {
				const amount = new Bignum(FEES.DELEGATE)
					.plus(FEES.VOTE)
					.plus(FEES.SECOND_SIGNATURE);
				var enrichExtraDelegateVoterTransaction = lisk.transaction.transfer({
					amount,
					passphrase: accountFixtures.genesis.passphrase,
					recipientId: validExtraDelegateVoter.address,
				});

				var registerExtraVoterAsADelegateTransaction = lisk.transaction.registerDelegate(
					{
						passphrase: validExtraDelegateVoter.passphrase,
						username: randomstring.generate({
							length: 10,
							charset: 'alphabetic',
							capitalization: 'lowercase',
						}),
					}
				);

				var voteByExtraDelegateVoterTransaction = lisk.transaction.castVotes({
					passphrase: validExtraDelegateVoter.passphrase,
					votes: [`${validVotedDelegate.publicKey}`],
				});

				return apiHelpers
					.sendTransactionPromise(enrichExtraDelegateVoterTransaction)
					.then(() => {
						return waitFor.confirmations([
							enrichExtraDelegateVoterTransaction.id,
						]);
					})
					.then(() => {
						return apiHelpers.sendTransactionPromise(
							registerExtraVoterAsADelegateTransaction
						);
					})
					.then(() => {
						return waitFor.confirmations([
							registerExtraVoterAsADelegateTransaction.id,
						]);
					})
					.then(() => {
						return apiHelpers.sendTransactionPromise(
							voteByExtraDelegateVoterTransaction
						);
					})
					.then(() => {
						return waitFor.confirmations([
							voteByExtraDelegateVoterTransaction.id,
						]);
					});
			});

			describe('sort with any of required field (username)', () => {
				describe('publicKey', () => {
					it('should return voters in ascending order', () => {
						return votersEndpoint
							.makeRequest(
								{
									sort: 'publicKey:asc',
									username: validVotedDelegate.delegateName,
								},
								200
							)
							.then(res => {
								expectValidVotedDelegateResponse(res);
								expect(res.body.data.username).to.equal(
									validVotedDelegate.delegateName
								);
								expect(
									_(res.body.data.voters)
										.sortBy('publicKey')
										.map('publicKey')
										.value()
								).to.be.eql(_.map(res.body.data.voters, 'publicKey'));
							});
					});

					it('should return voters in descending order', () => {
						return votersEndpoint
							.makeRequest(
								{
									sort: 'publicKey:desc',
									username: validVotedDelegate.delegateName,
								},
								200
							)
							.then(res => {
								expectValidVotedDelegateResponse(res);
								expect(res.body.data.username).to.equal(
									validVotedDelegate.delegateName
								);
								expect(
									_(res.body.data.voters)
										.sortBy('publicKey')
										.reverse()
										.map('publicKey')
										.value()
								).to.to.be.eql(_.map(res.body.data.voters, 'publicKey'));
							});
					});
				});

				describe('balance', () => {
					it('should return voters in ascending order', () => {
						return votersEndpoint
							.makeRequest(
								{
									sort: 'balance:asc',
									username: validVotedDelegate.delegateName,
								},
								200
							)
							.then(res => {
								expectValidVotedDelegateResponse(res);
								expect(res.body.data.username).to.equal(
									validVotedDelegate.delegateName
								);
								expect(
									_.map(res.body.data.voters, 'balance').sort()
								).to.to.be.eql(_.map(res.body.data.voters, 'balance'));
							});
					});

					it('should return voters in descending order', () => {
						return votersEndpoint
							.makeRequest(
								{
									sort: 'balance:desc',
									username: validVotedDelegate.delegateName,
								},
								200
							)
							.then(res => {
								expectValidVotedDelegateResponse(res);
								expect(res.body.data.username).to.equal(
									validVotedDelegate.delegateName
								);
								expect(
									_.map(res.body.data.voters, 'balance')
										.sort()
										.reverse()
								).to.to.be.eql(_.map(res.body.data.voters, 'balance'));
							});
					});
				});

				describe('username', () => {
					it('should return voters in ascending order', () => {
						return votersEndpoint
							.makeRequest(
								{
									sort: 'username:asc',
									username: validVotedDelegate.delegateName,
								},
								200
							)
							.then(res => {
								expectValidVotedDelegateResponse(res);
								expect(res.body.data.username).to.equal(
									validVotedDelegate.delegateName
								);
								expect(
									_.map(res.body.data.voters, 'username').sort()
								).to.to.be.eql(_.map(res.body.data.voters, 'username'));
							});
					});

					it('should return voters in descending order', () => {
						return votersEndpoint
							.makeRequest(
								{
									sort: 'username:desc',
									username: validVotedDelegate.delegateName,
								},
								200
							)
							.then(res => {
								expectValidVotedDelegateResponse(res);
								expect(res.body.data.username).to.equal(
									validVotedDelegate.delegateName
								);
								expect(
									_.map(res.body.data.voters, 'username')
										.sort()
										.reverse()
								).to.to.be.eql(_.map(res.body.data.voters, 'username'));
							});
					});
				});
			});
		});

		describe('limit & offset', () => {
			describe('limit=2', () => {
				it('should return 2 voters', () => {
					return votersEndpoint
						.makeRequest(
							{ limit: 2, username: validVotedDelegate.delegateName },
							200
						)
						.then(res => {
							expect(res.body.data.voters).to.have.length(2);
						});
				});
			});

			describe('limit=2 & offset=1', () => {
				it('should return 2 voters, containing 1 from the previous result', done => {
					var voters = null;

					votersEndpoint
						.makeRequest(
							{
								limit: 2,
								offset: 0,
								username: validVotedDelegate.delegateName,
							},
							200
						)
						.then(res => {
							expect(res.body.data.voters).to.have.length(2);

							voters = _.map(res.body.data.voters, 'address');

							return votersEndpoint.makeRequest(
								{
									limit: 2,
									offset: 1,
									username: validVotedDelegate.delegateName,
								},
								200
							);
						})
						.then(res => {
							expect(
								_.intersection(voters, _.map(res.body.data.voters, 'address'))
							).to.have.length(1);
							done();
						})
						.catch(err => {
							done(err);
						});
				});
			});
		});
	});
});
