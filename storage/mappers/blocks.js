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

const toEntity = dataValues => {
	const {
		id,
		version,
		timestamp,
		height,
		previousBlock,
		numberOfTransactions,
		totalAmount,
		totalFee,
		reward,
		payloadLength,
		payloadHash,
		generatorPublicKey,
		blockSignature,
	} = dataValues;

	return {
		id,
		version: version.toString(),
		timestamp,
		height,
		previousBlockId: previousBlock,
		numberOfTransactions,
		totalAmount,
		totalFee,
		reward,
		payloadLength,
		payloadHash,
		generatorPublicKey,
		blockSignature,
	};
};

module.exports = {
	toEntity,
};
