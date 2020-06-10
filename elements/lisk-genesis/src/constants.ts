/*
 * Copyright © 2020 Lisk Foundation
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

export const EMPTY_BUFFER = Buffer.alloc(0);

// To avoid adding dependency of another package hard-coded this value
//
// https://github.com/LiskHQ/lips/blob/master/proposals/lip-0031.md
// The Merkle root of an empty dataset is equal to the hash of an empty string
// EMPTYHASH=SHA256().
// hash(Buffer.alloc(0)) or hash(Buffer.from('', 'hex'))
export const EMPTY_HASH = Buffer.from(
	'47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
	'base64',
);
