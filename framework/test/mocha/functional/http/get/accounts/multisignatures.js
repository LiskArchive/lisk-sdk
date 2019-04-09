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

const Scenarios = require('../../../../common/scenarios');
const accountFixtures = require('../../../../fixtures/accounts');
const apiHelpers = require('../../../../common/helpers/api');
const waitFor = require('../../../../common/utils/wait_for');
const SwaggerEndpoint = require('../../../../common/swagger_spec');

const expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /api/accounts', () => {
	const signatureEndpoint = new SwaggerEndpoint('POST /signatures');

	const scenario = new Scenarios.Multisig();
	const account = scenario.account;

	before(() => {
		// Crediting accounts
		return apiHelpers
			.sendTransactionPromise(scenario.creditTransaction)
			.then(res => {
				expect(res)
					.to.have.property('status')
					.to.equal(200);
				return waitFor.confirmations([scenario.creditTransaction.id]);
			})
			.then(() => {
				return apiHelpers.sendTransactionPromise(scenario.multiSigTransaction);
			})
			.then(res => {
				expect(res)
					.to.have.property('status')
					.to.equal(200);

				const signatureRequests = scenario.members.map(member => {
					return {
						signature: apiHelpers.createSignatureObject(
							scenario.multiSigTransaction,
							member
						),
					};
				});
				return signatureEndpoint.makeRequests(signatureRequests, 200);
			})
			.then(responses => {
				responses.forEach(res => {
					expect(res.body.meta.status).to.be.true;
				});
				return waitFor.confirmations([scenario.multiSigTransaction.id]);
			});
	});

	describe('/{address}/multisignature_groups', () => {
		const multisigGroupsEndpoint = new SwaggerEndpoint(
			'GET /accounts/{address}/multisignature_groups'
		);

		describe('address', () => {
			it('using known address should respond with its multisignature_group', async () => {
				return multisigGroupsEndpoint
					.makeRequest({ address: account.address }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						const group = res.body.data[0];
						expect(group.address).to.be.equal(account.address);
						expect(group.publicKey).to.be.equal(account.publicKey);
						expect(group.members).to.have.length(scenario.members.length);
						expect(_.map(group.members, 'address').sort()).to.be.eql(
							_.map(scenario.members, 'address').sort()
						);
					});
			});

			it('using known address in lowercase should fail', async () => {
				return multisigGroupsEndpoint
					.makeRequest({ address: account.address.toLowerCase() }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using unknown address should return empty result', async () => {
				return multisigGroupsEndpoint
					.makeRequest(
						{ address: accountFixtures.existingDelegate.address },
						404
					)
					.then(res => {
						expect(res.body.message).to.be.equal(
							'Multisignature account not found'
						);
					});
			});

			it('using invalid address should fail', async () => {
				return multisigGroupsEndpoint
					.makeRequest({ address: 'InvalidAddress' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using empty address should fail', async () => {
				return multisigGroupsEndpoint
					.makeRequest({ address: ' ' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});
		});
	});

	describe('/{address}/multisignature_memberships', () => {
		const multisigMembersEndpoint = new SwaggerEndpoint(
			'GET /accounts/{address}/multisignature_memberships'
		);

		describe('address', () => {
			it('using master group account address should respond with empty multisignature memberships', async () => {
				return multisigMembersEndpoint
					.makeRequest({ address: account.address }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(0);
					});
			});

			it('using known member address should respond with its multisignature memberships', async () => {
				return multisigMembersEndpoint
					.makeRequest({ address: scenario.members[0].address }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						const group = res.body.data[0];
						expect(group.address).to.be.equal(account.address);
						expect(group.publicKey).to.be.equal(account.publicKey);
						expect(group.members).to.have.length(scenario.members.length);
						expect(_.map(group.members, 'address')).to.include(
							scenario.members[0].address
						);
					});
			});

			it('using known other member address should respond with its multisignature memberships', async () => {
				return multisigMembersEndpoint
					.makeRequest({ address: scenario.members[1].address }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						const group = res.body.data[0];
						expect(group.address).to.be.equal(account.address);
						expect(group.publicKey).to.be.equal(account.publicKey);
						expect(group.members).to.have.length(scenario.members.length);
						expect(_.map(group.members, 'address')).to.include(
							scenario.members[1].address
						);
					});
			});

			it('using known address in lowercase should fail', async () => {
				return multisigMembersEndpoint
					.makeRequest(
						{ address: scenario.members[0].address.toLowerCase() },
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using unknown address should return empty result', async () => {
				return multisigMembersEndpoint
					.makeRequest(
						{ address: accountFixtures.existingDelegate.address },
						200
					)
					.then(res => {
						expect(res.body.data).to.have.length(0);
					});
			});

			it('using invalid address should fail', async () => {
				return multisigMembersEndpoint
					.makeRequest({ address: 'InvalidAddress' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using empty address should fail', async () => {
				return multisigMembersEndpoint
					.makeRequest({ address: ' ' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});
		});
	});
});
