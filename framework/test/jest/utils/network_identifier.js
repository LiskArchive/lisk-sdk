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

const cryptography = require('@liskhq/lisk-cryptography');

const getNetworkIdentifier = genesisBlock =>
	cryptography.getNetworkIdentifier(
		genesisBlock.payloadHash,
		genesisBlock.communityIdentifier,
	);

module.exports = {
	devnetNetworkIdentifier:
		'fcce549a208ed7e47c1e62d27ea6292464c575d72ec5cf979bea417994d7079b',
	getNetworkIdentifier,
};
