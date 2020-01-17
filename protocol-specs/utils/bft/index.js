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

const fs = require('fs');
const { getKeys, hash } = require('@liskhq/lisk-cryptography');
const BigNum = require('@liskhq/bignum');

const loadCSVFile = filePath =>
	fs
		.readFileSync(filePath)
		.toString()
		.split('\n')
		.map(line => line.toString().split(','));

const generateBlockHeader = ({
	delegateName,
	height,
	maxHeightPreviouslyForged,
	maxHeightPrevoted,
	delegateMinHeightActive,
}) => {
	const delegatePublicKey = getKeys(delegateName).publicKey;

	// Generate a deterministic block id from a block height
	const blockId = BigNum.fromBuffer(
		hash(height.toString(), 'utf8').slice(0, 8),
	).toString();

	return {
		blockId,
		height,
		maxHeightPreviouslyForged,
		delegatePublicKey,
		delegateMinHeightActive,
		maxHeightPrevoted,
	};
};

const generateBlockHeadersSeries = ({ activeDelegates, count }) => {
	const threshold = Math.ceil((activeDelegates * 2) / 3);

	return new Array(count).fill(0).map((_v, index) => {
		const height = index + 1;
		const maxHeightPrevoted = height - threshold;
		const maxHeightPreviouslyForged = height - activeDelegates;

		return generateBlockHeader({
			delegateName: `D${height % activeDelegates}`,
			height,
			maxHeightPreviouslyForged:
				maxHeightPreviouslyForged < 0 ? 0 : maxHeightPreviouslyForged,
			maxHeightPrevoted: maxHeightPrevoted < 0 ? 0 : maxHeightPrevoted,
			delegateMinHeightActive: 1,
		});
	});
};

module.exports = {
	loadCSVFile,
	generateBlockHeader,
	generateBlockHeadersSeries,
};
