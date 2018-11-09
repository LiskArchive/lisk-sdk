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

require('../../../functional.js');

var Scenarios = require('../../../../common/scenarios');
var accountFixtures = require('../../../../fixtures/accounts');
var apiHelpers = require('../../../../common/helpers/api');
var waitFor = require('../../../../common/utils/wait_for');
var swaggerEndpoint = require('../../../../common/swagger_spec');

var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /api/accounts', () => {
	var signatureEndpoint = new swaggerEndpoint('POST /signatures');

	var scenario = new Scenarios.Multisig();
	var account = scenario.account;

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

				var signatureRequests = scenario.members.map(member => {
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
		var multisigGroupsEndpoint = new swaggerEndpoint(
			'GET /accounts/{address}/multisignature_groups'
		);

		describe('address', () => {
			it('using known address should respond with its multisignature_group', () => {
				return multisigGroupsEndpoint
					.makeRequest({ address: account.address }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						var group = res.body.data[0];
						expect(group.address).to.be.equal(account.address);
						expect(group.publicKey).to.be.equal(account.publicKey);
						expect(group.members).to.have.length(scenario.members.length);
						expect(_.map(group.members, 'address').sort()).to.be.eql(
							_.map(scenario.members, 'address').sort()
						);
					});
			});

			it('using known address in lowercase should fail', () => {
				return multisigGroupsEndpoint
					.makeRequest({ address: account.address.toLowerCase() }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using unknown address should return empty result', () => {
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

			it('using invalid address should fail', () => {
				return multisigGroupsEndpoint
					.makeRequest({ address: 'InvalidAddress' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using empty address should fail', () => {
				return multisigGroupsEndpoint
					.makeRequest({ address: ' ' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});
		});
	});

	describe('/{address}/multisignature_memberships', () => {
		var multisigMembersEndpoint = new swaggerEndpoint(
			'GET /accounts/{address}/multisignature_memberships'
		);

		describe('address', () => {
			it('using master group account address should respond with empty multisignature memberships', () => {
				return multisigMembersEndpoint
					.makeRequest({ address: account.address }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(0);
					});
			});

			it('using known member address should respond with its multisignature memberships', () => {
				return multisigMembersEndpoint
					.makeRequest({ address: scenario.members[0].address }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						var group = res.body.data[0];
						expect(group.address).to.be.equal(account.address);
						expect(group.publicKey).to.be.equal(account.publicKey);
						expect(group.members).to.have.length(scenario.members.length);
						expect(_.map(group.members, 'address')).to.include(
							scenario.members[0].address
						);
					});
			});

			it('using known other member address should respond with its multisignature memberships', () => {
				return multisigMembersEndpoint
					.makeRequest({ address: scenario.members[1].address }, 200)
					.then(res => {
						expect(res.body.data).to.have.length(1);
						var group = res.body.data[0];
						expect(group.address).to.be.equal(account.address);
						expect(group.publicKey).to.be.equal(account.publicKey);
						expect(group.members).to.have.length(scenario.members.length);
						expect(_.map(group.members, 'address')).to.include(
							scenario.members[1].address
						);
					});
			});

			it('using known address in lowercase should fail', () => {
				return multisigMembersEndpoint
					.makeRequest(
						{ address: scenario.members[0].address.toLowerCase() },
						400
					)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using unknown address should return empty result', () => {
				return multisigMembersEndpoint
					.makeRequest(
						{ address: accountFixtures.existingDelegate.address },
						200
					)
					.then(res => {
						expect(res.body.data).to.have.length(0);
					});
			});

			it('using invalid address should fail', () => {
				return multisigMembersEndpoint
					.makeRequest({ address: 'InvalidAddress' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});

			it('using empty address should fail', () => {
				return multisigMembersEndpoint
					.makeRequest({ address: ' ' }, 400)
					.then(res => {
						expectSwaggerParamError(res, 'address');
					});
			});
		});
	});
});
