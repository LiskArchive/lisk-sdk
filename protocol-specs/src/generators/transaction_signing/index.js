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

const BaseGenerator = require('../base_generator');

const SENDER_ACCOUNT = {
	passphrase:
		'movie tiger belt popular bridge dish frozen fragile quit high pass coconut',
	privateKey:
		'b2b833cffa07ff0cac5b4806d961bea17283c20004864b9ff3b91d2a1614e4982ce28adf8f6dcbd11fcc2f7a0a8721e378dd15ec07eb94ec34b996a132193eee',
	publicKey: '2ce28adf8f6dcbd11fcc2f7a0a8721e378dd15ec07eb94ec34b996a132193eee',
	address: '572744713366027662L',
};

const TARGET_ACCOUNT = {
	passphrase:
		'mixture pond wool snake affair online chalk birth apple injury miss face',
	privateKey:
		'37c67af69695af1c6b7b4c952c73336a6ed171285b2b0c88facfd53900028eae80b44e69311d9c832d365d2a3e2c8a9c8a9079eeef9f9d1c7491a6598502947d',
	publicKey: '80b44e69311d9c832d365d2a3e2c8a9c8a9079eeef9f9d1c7491a6598502947d',
	address: '17819145097849555674L',
};

const BASIC_TRANSFER = {
	amount: '10',
	recipientId: TARGET_ACCOUNT.address,
	timestamp: 100565431,
	asset: {},
	fee: '10000000',
	type: 0,
};

const generateTestCasesForValidSignature = () => ({
	input: {
		transferTransaction: BASIC_TRANSFER,
		senderPassphrase: SENDER_ACCOUNT.passphrase,
	},
	output:
		'579164b3045a612823b2b9ec667374417565229a4028f905b8452bf91048633f9a679d49fc46169659f3f3329ad414e8c6e17e1c2f9866a6e1bee9efa2a60a0a',
});

const validSignatureSuite = () => ({
	title: 'Valid signature generation',
	summary:
		'based on a valid transfer transaction generate a signature an id for it',
	config: 'mainnet',
	runner: 'transaction_signing',
	handler: 'valid_transaction_signing',
	testCases: generateTestCasesForValidSignature(),
});

module.exports = BaseGenerator.runGenerator('transaction_signing', [
	validSignatureSuite,
]);
