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

var lisk = require('lisk-js');

var Scenarios = require('../../common/scenarios');
var accountFixtures = require('../../../fixtures/accounts');

var constants = require('../../../../helpers/constants');
var transactionTypes = require('../../../../helpers/transactionTypes.js');

var apiHelpers = require('../../../common/helpers/api');
var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');
var waitFor = require('../../../common/utils/waitFor');
var swaggerEndpoint = require('../../../common/swaggerSpec');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /api/accounts', function () {

	var signatureEndpoint = new swaggerEndpoint('POST /signatures');

	var scenario = new Scenarios.Multisig();
	var account = scenario.account;

	before(function () {
		// Crediting accounts
		return apiHelpers.sendTransactionPromise(scenario.creditTransaction)
			.then(function (res) {
				expect(res).to.have.property('status').to.equal(200);
				return waitFor.confirmations([scenario.creditTransaction.id]);
			})
			.then(function (res) {
				return apiHelpers.sendTransactionPromise(scenario.multiSigTransaction);
			})
			.then(function (res) {
				expect(res).to.have.property('status').to.equal(200);

				var signatures = [];
				scenario.members.map(function (member) {
					signatures.push(apiHelpers.createSignatureObject(scenario.multiSigTransaction, member));
				});

				return signatureEndpoint.makeRequest({signatures: signatures}, 200);
			}).then(function (res) {
				expect(res.body.meta.status).to.be.true;
				return waitFor.confirmations([scenario.multiSigTransaction.id]);
			});
	});

	describe('/{address}/multisignature_groups', function () {

		var multisigGroupsEndpoint = new swaggerEndpoint('GET /accounts/{address}/multisignature_groups');

		describe('address', function () {

			it('using known address should respond with its multisignature_group', function () {
				return multisigGroupsEndpoint.makeRequest({address: account.address}, 200).then(function (res) {
					expect(res.body.data).to.have.length(1);
					var group = res.body.data[0];
					expect(group.address).to.be.equal(account.address);
					expect(group.publicKey).to.be.equal(account.publicKey);
					expect(group.members).to.have.length(scenario.members.length);
					expect(_.map(group.members, 'address').sort()).to.be.eql(_.map(scenario.members, 'address').sort());
				});
			});

			it('using known lowercase address should respond with its multisignature_group', function () {
				return multisigGroupsEndpoint.makeRequest({address: account.address.toLowerCase()}, 200).then(function (res) {
					expect(res.body.data).to.have.length(1);
					var group = res.body.data[0];
					expect(group.address).to.be.equal(account.address);
					expect(group.publicKey).to.be.equal(account.publicKey);
					expect(group.members).to.have.length(scenario.members.length);
					expect(_.map(group.members, 'address').sort()).to.be.eql(_.map(scenario.members, 'address').sort());
				});
			});

			it('using unknown address should return empty result', function () {
				return multisigGroupsEndpoint.makeRequest({address: accountFixtures.existingDelegate.address}, 404).then(function (res) {
					expect(res.body.message).to.be.equal('Multisignature account not found');
				});
			});

			it('using invalid address should fail', function () {
				return multisigGroupsEndpoint.makeRequest({address: 'InvalidAddress'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using empty address should fail', function () {
				return multisigGroupsEndpoint.makeRequest({address: ' '}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});
		});
	});

	describe('/{address}/multisignature_memberships', function () {

		var multisigMembersEndpoint = new swaggerEndpoint('GET /accounts/{address}/multisignature_memberships');

		describe('address', function () {

			it('using master group account address should respond with empty multisignature memberships', function () {
				return multisigMembersEndpoint.makeRequest({address: account.address}, 200).then(function (res) {
					expect(res.body.data).to.have.length(0);
				});
			});

			it('using known member address should respond with its multisignature memberships', function () {
				return multisigMembersEndpoint.makeRequest({address: scenario.members[0].address}, 200).then(function (res) {
					expect(res.body.data).to.have.length(1);
					var group = res.body.data[0];
					expect(group.address).to.be.equal(account.address);
					expect(group.publicKey).to.be.equal(account.publicKey);
					expect(group.members).to.have.length(scenario.members.length);
					expect(_.map(group.members, 'address')).to.include(scenario.members[0].address);
				});
			});

			it('using known other member address should respond with its multisignature memberships', function () {
				return multisigMembersEndpoint.makeRequest({address: scenario.members[1].address}, 200).then(function (res) {
					expect(res.body.data).to.have.length(1);
					var group = res.body.data[0];
					expect(group.address).to.be.equal(account.address);
					expect(group.publicKey).to.be.equal(account.publicKey);
					expect(group.members).to.have.length(scenario.members.length);
					expect(_.map(group.members, 'address')).to.include(scenario.members[1].address);
				});
			});

			it('using known lowercase address should respond with its multisignature_group', function () {
				return multisigMembersEndpoint.makeRequest({address: scenario.members[0].address}, 200).then(function (res) {
					expect(res.body.data).to.have.length(1);
					var group = res.body.data[0];
					expect(group.address).to.be.equal(account.address);
					expect(group.publicKey).to.be.equal(account.publicKey);
					expect(group.members).to.have.length(scenario.members.length);
					expect(_.map(group.members, 'address')).to.include(scenario.members[0].address);
				});
			});

			it('using unknown address should return empty result', function () {
				return multisigMembersEndpoint.makeRequest({address: accountFixtures.existingDelegate.address}, 200).then(function (res) {
					expect(res.body.data).to.have.length(0);
				});
			});

			it('using invalid address should fail', function () {
				return multisigMembersEndpoint.makeRequest({address: 'InvalidAddress'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using empty address should fail', function () {
				return multisigMembersEndpoint.makeRequest({address: ' '}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});
		});
	});
});
