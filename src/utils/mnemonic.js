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

const bignum = require('browserify-bignum');
const crypto = require('crypto-browserify');
const wordList = require('./words.js');
const Buffer = require('buffer/').Buffer;

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
	let bin = '';
	const mnemonic = [];
	for (var i = 0; i < entropy.length; i++) {
		bin += (`00000000${entropy[i].toString(2)}`).slice(-8);
	}
	bin += entropyChecksum(entropy);
	for (i = 0; i < bin.length / 11; i++) {
		const wi = parseInt(bin.slice(i * 11, (i + 1) * 11), 2);
		mnemonic.push(wordList[wi]);
	}
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
	let bin = '';
	if (words.length !== 12) {
		return false;
	}
	for (var i = 0; i < words.length; i++) {
		const ind = wordList.indexOf(words[i]);
		if (ind < 0) return false;
		bin += (`00000000000${ind.toString(2)}`).slice(-11);
	}

	const cs = bin.length / 33;
	const hashBits = bin.slice(-cs);
	const nonhashBits = bin.slice(0, bin.length - cs);
	const buf = Buffer.alloc(nonhashBits.length / 8);
	for (i = 0; i < nonhashBits.length / 8; i++) {
		buf.writeUInt8(parseInt(bin.slice(i * 8, (i + 1) * 8), 2), i);
	}
	const expectedHashBits = entropyChecksum(buf);
	return expectedHashBits === hashBits;
}

module.exports = {
	generate,
	isValid,
};
