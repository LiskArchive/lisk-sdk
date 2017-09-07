/*
 * Original mnemonic implementation from https://github.com/bitpay/bitcore-mnemonic
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 BitPay
 *
 * https://github.com/bitpay/bitcore-mnemonic/blob/master/LICENSE
 *
 * --------------------------------------------------
 *
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
 *
 */
/**
 * Mnemonic module provide functions for generation bip39 mnemonic
 * @class mnemonic
 */
import bignum from 'browserify-bignum';
import crypto from 'crypto';
import wordList from './words';

/**
 * @method entropyToSha256
 * @param {Buffer} entropy
 * @returns {Buffer}
 * @private
 */

function entropyToSha256(entropy) {
	return crypto.createHash('sha256').update(entropy).digest();
}

/**
 * @method entropyChecksum
 * @param {Buffer} entropy
 * @returns {string}
 */

function entropyChecksum(entropy) {
	const hash = entropyToSha256(entropy);
	const bits = entropy.length * 8;
	const cs = bits / 32;
	let hashbits = bignum.fromBuffer(hash).toString(2);
	// zero pad the hash bits
	while (hashbits.length % 256 !== 0) {
		hashbits = `0${hashbits}`;
	}
	const checksum = hashbits.slice(0, cs);
	return checksum;
}

/**
 *
 * @method generate
 * @returns {string} A string of 12 random words
 * @public
 */

function generate() {
	const entropy = crypto.randomBytes(16);
	const bin = Array.from(entropy)
		.map(byte => `00000000${byte.toString(2)}`.slice(-8))
		.join('');
	const checksum = entropyChecksum(entropy);
	const binWithChecksum = `${bin}${checksum}`;
	const mnemonic = new Array(Math.ceil((binWithChecksum.length) / 11))
		.fill()
		.map((_, i) => {
			const slice = binWithChecksum.slice(i * 11, (i + 1) * 11);
			const wordIndex = parseInt(slice, 2);
			return wordList[wordIndex];
		});
	return mnemonic.join(' ');
}

/**
 * @method isValid
 * @param {any} mnemonic A string of 12 random words
 * @returns {boolean}
 * @public
 */

function isValid(mnemonic) {
	const words = mnemonic.split(' ');
	if (words.length !== 12 || words.some(w => !wordList.includes(w))) {
		return false;
	}
	const bin = words
		.map(word => `00000000000${wordList.indexOf(word).toString(2)}`.slice(-11))
		.join('');

	const checksumLength = bin.length / 33;
	const hashBits = bin.slice(-checksumLength);
	const nonhashBits = bin.slice(0, bin.length - checksumLength);
	const buf = Buffer.from(new Array(nonhashBits.length / 8)
		.fill()
		.map((_, i) => {
			const slice = bin.slice(i * 8, (i + 1) * 8);
			return parseInt(slice, 2);
		}));
	const expectedHashBits = entropyChecksum(buf);
	return expectedHashBits === hashBits;
}

module.exports = {
	generate,
	isValid,
};
