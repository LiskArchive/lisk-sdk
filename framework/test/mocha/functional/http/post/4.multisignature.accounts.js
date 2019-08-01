/*
 * Copyright © 2019 Lisk Foundation
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

require('../../functional');

const { transfer } = require('@liskhq/lisk-transactions');
const Scenarios = require('../../../common/scenarios');
const waitFor = require('../../../common/utils/wait_for');
const apiHelpers = require('../../../common/helpers/api');
const SwaggerEndpoint = require('../../../common/swagger_spec');
const accountFixtures = require('../../../fixtures/accounts');

const signatureEndpoint = new SwaggerEndpoint('POST /signatures');
const accountsEndpoint = new SwaggerEndpoint('GET /accounts');

const { NORMALIZER } = global.__testContext.config;
const amount = `${10 * NORMALIZER}`;

describe('POST /api/transactions (type 4) register multisignature', () => {
	const scenarios = {
		no_members_exists: new Scenarios.Multisig({ members: 3 }),
		some_members_exists: new Scenarios.Multisig({ members: 3 }),
		all_members_exists: new Scenarios.Multisig({ members: 3 }),
	};

	before(async () => {
		const transactions = [];

		// Credit main account for each scenario
		Object.keys(scenarios).forEach(type =>
			transactions.push(scenarios[type].creditTransaction),
		);
		const responses = await apiHelpers.sendTransactionsPromise(transactions);

		responses.forEach(res => {
			return expect(res.statusCode).to.be.equal(200);
		});
		// Wait for confirmation of credits
		const transactionsToWaitFor = transactions.map(
			transaction => transaction.id,
		);
		await waitFor.confirmations(transactionsToWaitFor);
	});

	it('When members do not exist in blockchain should be created', async () => {
		const membersPublicKeysByAddress = {};
		// Send registration
		const resgisterMultisignature =
			scenarios.no_members_exists.multiSigTransaction;
		const response = await apiHelpers.sendTransactionPromise(
			resgisterMultisignature,
		);
		expect(response.statusCode).to.be.equal(200);
		// Generate signatures
		const signatureRequests = scenarios.no_members_exists.members.map(
			member => {
				membersPublicKeysByAddress[member.address] = member.publicKey;
				return {
					signature: apiHelpers.createSignatureObject(
						resgisterMultisignature,
						member,
					),
				};
			},
		);
		const sendSignatures = await signatureEndpoint.makeRequests(
			signatureRequests,
			200,
		);

		sendSignatures.forEach(res => {
			return expect(res.statusCode).to.be.equal(200);
		});

		// Wait for multi-signature registration to succeed
		await waitFor.confirmations([resgisterMultisignature.id]);

		// Check mem_accounts
		const membersAccounts = await Promise.all(
			Object.keys(membersPublicKeysByAddress).map(aMemberAddress =>
				accountsEndpoint.makeRequest({ address: aMemberAddress }, 200),
			),
		);
		// mem_accounts records should contain accounts
		membersAccounts.forEach(aMember => {
			const aMembersData = aMember.body.data[0];
			const memberAddress = aMembersData.address;
			const memberPublicKey = aMembersData.publicKey;
			expect(membersPublicKeysByAddress[memberAddress]).to.be.eql(
				memberPublicKey,
			);
		});
	});

	it('When some members exists its account balance should not be modified ', async () => {
		const membersPublicKeysByAddress = {};
		// Send registration
		const resgisterMultisignature =
			scenarios.some_members_exists.multiSigTransaction;
		const response = await apiHelpers.sendTransactionPromise(
			resgisterMultisignature,
		);
		expect(response.statusCode).to.be.equal(200);
		// Generate signatures
		const signatureRequests = scenarios.some_members_exists.members.map(
			member => {
				membersPublicKeysByAddress[member.address] = member.publicKey;
				return {
					signature: apiHelpers.createSignatureObject(
						resgisterMultisignature,
						member,
					),
				};
			},
		);

		// Send credit to first member
		const creditMemberTransfer = transfer({
			amount: `${10 * NORMALIZER}`,
			passphrase: accountFixtures.genesis.passphrase,
			recipientId: scenarios.some_members_exists.members[0].address,
		});

		const creditMemberOne = await apiHelpers.sendTransactionPromise(
			creditMemberTransfer,
		);
		expect(creditMemberOne.statusCode).to.be.equal(200);
		await waitFor.confirmations([creditMemberTransfer.id]);
		const memberOne = await accountsEndpoint.makeRequest(
			{ address: scenarios.some_members_exists.members[0].address },
			200,
		);

		const memberOneBeforeRegistration = memberOne.body.data[0];

		// Send signatures
		const sendSignatures = await signatureEndpoint.makeRequests(
			signatureRequests,
			200,
		);

		sendSignatures.forEach(res => {
			return expect(res.statusCode).to.be.equal(200);
		});

		// Wait for multi-signature registration to succeed
		await waitFor.confirmations([resgisterMultisignature.id]);

		// Check mem_accounts
		const membersAccounts = await Promise.all(
			Object.keys(membersPublicKeysByAddress).map(aMemberAddress =>
				accountsEndpoint.makeRequest({ address: aMemberAddress }, 200),
			),
		);

		let memberOneAfterRegistration = null;
		// mem_accounts records should contain accounts
		membersAccounts.forEach(aMember => {
			const aMembersData = aMember.body.data[0];
			const memberAddress = aMembersData.address;
			const memberPublicKey = aMembersData.publicKey;
			expect(membersPublicKeysByAddress[memberAddress]).to.be.eql(
				memberPublicKey,
			);
			aMembersData.address === memberOneBeforeRegistration.address
				? (memberOneAfterRegistration = aMembersData)
				: null;
		});
		// Balance from existing member one shouldn't have changed, i.e. the account was not overwritten!
		expect(memberOneAfterRegistration.balance).to.be.equal(
			memberOneBeforeRegistration.balance,
		);
	});

	it('When all members exist its account balances should not be modified ', async () => {
		const membersPublicKeysByAddress = {};
		// Send registration
		const resgisterMultisignature =
			scenarios.all_members_exists.multiSigTransaction;
		const response = await apiHelpers.sendTransactionPromise(
			resgisterMultisignature,
		);
		expect(response.statusCode).to.be.equal(200);
		// Generate signatures
		const signatureRequests = scenarios.all_members_exists.members.map(
			member => {
				membersPublicKeysByAddress[member.address] = member.publicKey;
				return {
					signature: apiHelpers.createSignatureObject(
						resgisterMultisignature,
						member,
					),
				};
			},
		);

		// Credit all members
		const members = scenarios.all_members_exists.members;

		const creditTransactionsIds = [];
		const creditTransactions = members.map(aMember => {
			const aTransfer = transfer({
				amount,
				passphrase: accountFixtures.genesis.passphrase,
				recipientId: aMember.address,
			});
			creditTransactionsIds.push(aTransfer.id);
			return aTransfer;
		});

		await Promise.all(
			creditTransactions.map(aCredit =>
				apiHelpers.sendTransactionPromise(aCredit, 200),
			),
		);
		await waitFor.confirmations(creditTransactionsIds);

		// Send signatures
		const sendSignatures = await signatureEndpoint.makeRequests(
			signatureRequests,
			200,
		);

		sendSignatures.forEach(res => {
			return expect(res.statusCode).to.be.equal(200);
		});

		// Wait for multi-signature registration to succeed
		await waitFor.confirmations([resgisterMultisignature.id]);

		// Check mem_accounts
		const membersAccounts = await Promise.all(
			Object.keys(membersPublicKeysByAddress).map(aMemberAddress =>
				accountsEndpoint.makeRequest({ address: aMemberAddress }, 200),
			),
		);

		// mem_accounts records should contain accounts and correct balance
		membersAccounts.forEach(aMember => {
			const aMembersData = aMember.body.data[0];
			const memberAddress = aMembersData.address;
			const memberPublicKey = aMembersData.publicKey;
			expect(membersPublicKeysByAddress[memberAddress]).to.be.eql(
				memberPublicKey,
			);
			expect(aMembersData.balance).to.be.equal(amount);
		});
	});
});
