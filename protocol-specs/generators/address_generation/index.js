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

const { getAddressFromPublicKey } = require('@liskhq/lisk-cryptography');
const BaseGenerator = require('../base_generator');

const PUBLIC_KEY =
	'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b';

// TODO: Possibly add more public keys

const generateTestCasesForAddressFromPubKey = () => ({
	input: PUBLIC_KEY,
	output: getAddressFromPublicKey(PUBLIC_KEY), // 12668885769632475474L
});

const addressFromPubKeySuite = () => ({
	title: 'Address generation',
	summary: 'Address generation from a public key',
	config: 'mainnet',
	runner: 'address_generation',
	handler: 'address_from_pub_key',
	testCases: [generateTestCasesForAddressFromPubKey()],
});

BaseGenerator.runGenerator('address_generation', [addressFromPubKeySuite]);
