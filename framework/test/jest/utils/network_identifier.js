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
		'a59352e01fa66bd4fa270af5d47a8f827c56b36b2d80528b04e1e8ba03134de9',
	getNetworkIdentifier,
};
