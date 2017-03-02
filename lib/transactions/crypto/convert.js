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

var Buffer = require('buffer/').Buffer;
// var hash = require('./hash');
// var crypto = require('crypto-browserify');
// var bignum = require('browserify-bignum');

function bufferToHex (buffer) {
	return naclInstance.to_hex(buffer);
}

function hexToBuffer (hex) {
	return naclInstance.from_hex(hex);
}

// TODO: Discuss behaviour and output format
function useFirstEightBufferEntriesReversed (publicKeyBytes) {
	var publicKeyTransform = Buffer.alloc(8);

	for (var i = 0; i < 8; i++) {
		publicKeyTransform[i] = publicKeyBytes[7 - i];
	}

	return publicKeyTransform;
}

module.exports = {
	bufferToHex: bufferToHex,
	hexToBuffer: hexToBuffer,
	useFirstEightBufferEntriesReversed: useFirstEightBufferEntriesReversed
};
