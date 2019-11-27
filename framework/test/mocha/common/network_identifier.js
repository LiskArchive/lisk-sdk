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
		'11a254dc30db5eb1ce4001acde35fd5a14d62584f886d30df161e4e883220eb7',
	getNetworkIdentifier,
};
