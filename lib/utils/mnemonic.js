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

var bignum = require('browserify-bignum');
var crypto = require('crypto-browserify');
var wordList = require('./words.js');
var Buffer = require('buffer/').Buffer;

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
	var hash = entropyToSha256(entropy);
	var bits = entropy.length * 8;
	var cs = bits / 32;
	var hashbits = bignum.fromBuffer(hash).toString(2);
	// zero pad the hash bits
	while (hashbits.length % 256 !== 0) {
		hashbits = '0' + hashbits;
	}
	var checksum = hashbits.slice(0, cs);
	return checksum;
};

/**
 *
 * @method generate
 * @returns {string} A string of 12 random words
 * @public
 */

function generate() {
	var entropy = crypto.randomBytes(16);
	var bin = '';
	var mnemonic = [];
	for (var i = 0; i < entropy.length; i++) {
		bin = bin + ('00000000' + entropy[i].toString(2)).slice(-8);
	}
	bin = bin + entropyChecksum(entropy);
	for (i = 0; i < bin.length / 11; i++) {
		var wi = parseInt(bin.slice(i * 11, (i + 1) * 11), 2);
		mnemonic.push(wordList[wi]);
	}
	return mnemonic.join(' ');
};

/**
 * @method isValid
 * @param {any} mnemonic A string of 12 random words
 * @returns {boolean}
 * @public
 */

function isValid(mnemonic) {
	var words = mnemonic.split(' ');
	var bin = '';
	if (words.length !== 12) {
		return false;
	}
	for (var i = 0; i < words.length; i++) {
		var ind = wordList.indexOf(words[i]);
		if (ind < 0) return false;
		bin = bin + ('00000000000' + ind.toString(2)).slice(-11);
	}

	var cs = bin.length / 33;
	var hashBits = bin.slice(-cs);
	var nonhashBits = bin.slice(0, bin.length - cs);
	var buf = Buffer.alloc(nonhashBits.length / 8);
	for (i = 0; i < nonhashBits.length / 8; i++) {
		buf.writeUInt8(parseInt(bin.slice(i * 8, (i + 1) * 8), 2), i);
	}
	var expectedHashBits = entropyChecksum(buf);
	return expectedHashBits === hashBits;
};

module.exports = {
	generate: generate,
	isValid: isValid,
};
