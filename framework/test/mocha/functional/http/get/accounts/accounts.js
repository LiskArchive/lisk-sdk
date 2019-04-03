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

require('../../../functional');
const {
	transfer,
	registerSecondPassphrase,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../../fixtures/accounts');
const SwaggerEndpoint = require('../../../../common/swagger_spec');
const randomUtil = require('../../../../common/utils/random');
const waitFor = require('../../../../common/utils/wait_for');
const apiHelpers = require('../../../../common/helpers/api');
const Bignum = require('../../../../../../src/modules/chain/helpers/bignum');

const { FEES } = global.constants;
const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /accounts', () => {
	const account = randomUtil.account();
	const accountsEndpoint = new SwaggerEndpoint('GET /accounts');
	const constantsEndPoint = new SwaggerEndpoint('GET /node/constants 200');

	describe('?', () => {
		describe('address', () => {
			it('using known address should be ok', async () => {
				return accountsEndpoint.makeRequest(
					{ address: accountFixtures.genesis.address },
					200
				);
			});

			it('using known address and empty publicKey should return empty result', async () => {
				return accountsEndpoint
					.makeRequest(
						{ address: accountFixtures.genesis.address, publicKey: '' },
						200
					)
					.then(res => {
						expect(res.body.data).to.have.length(0);
					});
			});

			it('using known lowercase address should fail', async () => {
				return accountsEndpoint
					.makeRequest(
						{ address: accountFixtures.genesis.address.toLowerCase() },
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using unknown address should return empty result', async () => {
				return accountsEndpoint
					.makeRequest({ address: account.address }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(0);
					});
			});

			it('using invalid address should fail', async () => {
				return accountsEndpoint
					.makeRequest({ address: 'InvalidAddress' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using empty address should fail', async () => {
				return accountsEndpoint.makeRequest({ address: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'address');
				});
			});
		});

		describe('publicKey', () => {
			it('using known publicKey should be ok', async () => {
				return accountsEndpoint.makeRequest(
					{ publicKey: accountFixtures.genesis.publicKey },
					200
				);
			});

			it('using known publicKey and empty address should fail', async () => {
				return accountsEndpoint
					.makeRequest(
						{ publicKey: accountFixtures.genesis.publicKey, address: '' },
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using unknown publicKey should return empty result', async () => {
				return accountsEndpoint
					.makeRequest({ publicKey: account.publicKey }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(0);
					});
			});

			it('using invalid publicKey should fail', async () => {
				return accountsEndpoint
					.makeRequest({ publicKey: 'invalidPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using invalid publicKey (integer) should fail', async () => {
				return accountsEndpoint
					.makeRequest({ publicKey: '123' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'publicKey');
					});
			});

			it('using empty publicKey should return empty results', async () => {
				return accountsEndpoint
					.makeRequest({ publicKey: '' }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(0);
					});
			});

			it('using empty publicKey and address should fail', async () => {
				return accountsEndpoint
					.makeRequest({ publicKey: '', address: '' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using known address and matching publicKey should be ok', async () => {
				return accountsEndpoint
					.makeRequest(
						{
							publicKey: accountFixtures.genesis.publicKey,
							address: accountFixtures.genesis.address,
						},
						200
					)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.data[0].address).to.be.eql(
							accountFixtures.genesis.address
						);
						expect(res.body.data[0].publicKey).to.be.eql(
							accountFixtures.genesis.publicKey
						);
					});
			});

			it('using known address and not matching publicKey should return empty result', async () => {
				return accountsEndpoint
					.makeRequest(
						{
							publicKey: account.publicKey,
							address: accountFixtures.genesis.address,
						},
						200
					)
					.then(res => {
						expect(res.body.data).to.have.length(0);
					});
			});
		});

		describe('secondPublicKey', () => {
			const secondPublicKeyAccount = randomUtil.account();
			const creditTransaction = transfer({
				amount: FEES.SECOND_SIGNATURE,
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: secondPublicKeyAccount.address,
			});
			const signatureTransaction = registerSecondPassphrase({
				passphrase: secondPublicKeyAccount.passphrase,
				secondPassphrase: secondPublicKeyAccount.secondPassphrase,
			});

			before(() => {
				return apiHelpers
					.sendTransactionPromise(creditTransaction)
					.then(res => {
						expect(res.statusCode).to.be.eql(200);
						return waitFor.confirmations([creditTransaction.id]);
					})
					.then(() => {
						return apiHelpers.sendTransactionPromise(signatureTransaction);
					})
					.then(res => {
						expect(res.statusCode).to.be.eql(200);
						return waitFor.confirmations([signatureTransaction.id]);
					});
			});

			it('using known secondPublicKey should be ok', async () => {
				return accountsEndpoint
					.makeRequest(
						{ secondPublicKey: secondPublicKeyAccount.secondPublicKey },
						200
					)
					.then(res => {
						expect(res.body.data[0].secondPublicKey).to.be.eql(
							secondPublicKeyAccount.secondPublicKey
						);
					});
			});

			it('using unknown secondPublicKey should return empty result', async () => {
				return accountsEndpoint
					.makeRequest({ secondPublicKey: account.secondPublicKey }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(0);
					});
			});

			it('using invalid secondPublicKey should fail', async () => {
				return accountsEndpoint
					.makeRequest({ secondPublicKey: 'invalidPublicKey' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'secondPublicKey');
					});
			});
		});

		describe('username', () => {
			it('using empty username name should fail', async () => {
				return accountsEndpoint.makeRequest({ username: '' }, 400).then(res => {
					expectSwaggerParamError(res, 'username');
				});
			});

			it('using username with string greater than max length should fail', async () => {
				return accountsEndpoint
					.makeRequest({ username: _.repeat('a', 21) }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'username');
					});
			});

			it('using valid username name should result account', async () => {
				return accountsEndpoint
					.makeRequest(
						{ username: accountFixtures.existingDelegate.delegateName },
						200
					)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						expect(res.body.data[0].address).to.be.eql(
							accountFixtures.existingDelegate.address
						);
						expect(res.body.data[0].publicKey).to.be.eql(
							accountFixtures.existingDelegate.publicKey
						);
						expect(res.body.data[0].delegate.username).to.to.eql(
							accountFixtures.existingDelegate.delegateName
						);
					});
			});
		});

		describe('limit', () => {
			it('using limit = 0 should return error', async () => {
				return accountsEndpoint.makeRequest({ limit: 0 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit = 102 should return error', async () => {
				return accountsEndpoint.makeRequest({ limit: 102 }, 400).then(res => {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit = 5 should return return 5 accounts', async () => {
				return accountsEndpoint.makeRequest({ limit: 5 }, 200).then(res => {
					expect(res.body.data).to.have.length(5);
				});
			});
		});

		describe('sort', () => {
			it('using sort = invalid should return error', async () => {
				return accountsEndpoint.makeRequest({ sort: 'invalid' }, 400);
			});

			it('using no sort return accounts sorted by both balance and address in asending order as default behavior', async () => {
				return accountsEndpoint.makeRequest({}, 200).then(res => {
					const balances = _.clone(res.body.data);
					expect(
						balances.sort((a, b) => {
							const aBignumBalance = new Bignum(a.balance);
							return (
								aBignumBalance.minus(b.balance) ||
								a.address.localeCompare(b.address)
							);
						})
					).to.be.eql(res.body.data);
				});
			});

			it('using sort = balance:asc should return accounts in ascending order by balance', async () => {
				return accountsEndpoint
					.makeRequest({ sort: 'balance:asc' }, 200)
					.then(res => {
						const balances = _.clone(res.body.data);
						expect(
							balances.sort((a, b) => {
								const aBignumBalance = new Bignum(a.balance);
								return (
									aBignumBalance.minus(b.balance) ||
									a.address.localeCompare(b.address)
								);
							})
						).to.be.eql(res.body.data);
					});
			});

			it('using sort = balance:desc should return accounts in descending order by balance', async () => {
				return accountsEndpoint
					.makeRequest({ sort: 'balance:desc' }, 200)
					.then(res => {
						const balances = _.clone(res.body.data);
						expect(
							balances.sort((a, b) => {
								const bBignumBalance = new Bignum(b.balance);
								return (
									bBignumBalance.minus(a.balance) ||
									a.address.localeCompare(b.address)
								);
							})
						).to.be.eql(res.body.data);
					});
			});
		});

		describe('offset', () => {
			it('using offset = -1 should return error', async () => {
				return accountsEndpoint.makeRequest({ offset: -1 }, 400).then(res => {
					expectSwaggerParamError(res, 'offset');
				});
			});

			it('using offset = 5 should return accounts including top 5', async () => {
				let res1;

				return accountsEndpoint
					.makeRequest({ offset: 0 }, 200)
					.then(res => {
						res1 = res;
						return accountsEndpoint.makeRequest({ offset: 5 }, 200);
					})
					.then(res2 => {
						expect(res2.body.data).to.include.deep.members(
							res1.body.data.slice(-5)
						);
					});
			});
		});

		describe('sort, offset & limit together', () => {
			it('using sort = balance:asc and offset = 1 and limit = 5 should return 5 accounts sorted by balance', async () => {
				return accountsEndpoint
					.makeRequest({ sort: 'balance:asc', offset: 1, limit: 5 }, 200)
					.then(res => {
						const balances = _(res.body.data)
							.map('balance')
							.value();

						expect(res.body.data).to.have.length(5);
						expect(
							_.clone(balances)
								.sort()
								.reverse()
						).to.be.eql(balances);
					});
			});
		});

		it('should return delegate properties for a delegate account', async () => {
			return accountsEndpoint
				.makeRequest({ address: accountFixtures.existingDelegate.address }, 200)
				.then(res => {
					expect(res.body.data[0].address).to.be.eql(
						accountFixtures.existingDelegate.address
					);
					expect(res.body.data[0].publicKey).to.be.eql(
						accountFixtures.existingDelegate.publicKey
					);
					expect(res.body.data[0].delegate.username).to.be.eql(
						accountFixtures.existingDelegate.delegateName
					);
				});
		});

		it('should return correct delegate approval for a delegate account', async () => {
			const promises = [
				constantsEndPoint.makeRequest(),
				accountsEndpoint.makeRequest(
					{ address: accountFixtures.existingDelegate.address },
					200
				),
			];

			const [
				{ body: { data: constansts } },
				{ body: { data: [{ delegate }] } },
			] = await Promise.all(promises);

			const calculatedApproval = apiHelpers.calculateApproval(
				delegate.vote,
				constansts.supply
			);
			expect(delegate.approval).to.be.eql(calculatedApproval);
		});

		it('should return empty delegate property for a non delegate account', () => {
			return accountsEndpoint
				.makeRequest({ address: accountFixtures.genesis.address }, 200)
				.then(res => {
					expect(res.body.data[0].address).to.be.eql(
						accountFixtures.genesis.address
					);
					expect(res.body.data[0].publicKey).to.be.eql(
						accountFixtures.genesis.publicKey
					);
					expect(res.body.data[0]).to.not.have.property('delegate');
				});
		});
	});
});
