/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import { Buffer } from 'buffer';
import bignum from 'browserify-bignum';

function bufferToHex(buffer) {
	return naclInstance.to_hex(buffer);
}

function hexToBuffer(hex) {
	return naclInstance.from_hex(hex);
}

// TODO: Discuss behaviour and output format
function useFirstEightBufferEntriesReversed(publicKeyBytes) {
	return Buffer.from(publicKeyBytes)
		.slice(0, 8)
		.reverse();
}

function toAddress(buffer) {
	return `${bignum.fromBuffer(buffer).toString()}L`;
}

module.exports = {
	bufferToHex,
	hexToBuffer,
	useFirstEightBufferEntriesReversed,
	toAddress,
};
