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

/**
 * Buffer functions that implements bignumber.
 *
 * @class
 * @memberof helpers
 *
 * @requires bignumber
 */
var BigNumber = require('bignumber.js');

// The BigNumber by default beyond a number range
// converts the number representation to exponential format
// In our application we are using BigNumber everywhere for amount field
// due to which the signatures can lead to different results
// in order to keep the consistency updating BigNumber config to
// Almost never return exponential notation: ref http://mikemcl.github.io/bignumber.js/#exponential-at
BigNumber.config({ EXPONENTIAL_AT: 1e9 });

/**
 * Creates an instance from a Buffer.
 *
 * @param {ArrayBuffer} buf
 * @param {Object} opts
 * @returns {ArrayBuffer} New BigNumber instance
 * @throws {RangeError} If description multiple of size
 * @todo Add description for the params
 */
BigNumber.fromBuffer = function(buf, opts) {
	if (!opts) {
		opts = {};
	}

	var endian =
		{ 1: 'big', '-1': 'little' }[opts.endian] || opts.endian || 'big';

	var size = opts.size === 'auto' ? Math.ceil(buf.length) : opts.size || 1;

	if (buf.length % size !== 0) {
		throw new RangeError(
			`Buffer length (${buf.length}) must be a multiple of size (${size})`
		);
	}

	var hex = [];
	for (var i = 0; i < buf.length; i += size) {
		var chunk = [];
		for (var j = 0; j < size; j++) {
			chunk.push(buf[i + (endian === 'big' ? j : size - j - 1)]);
		}

		hex.push(chunk.map(c => (c < 16 ? '0' : '') + c.toString(16)).join(''));
	}

	return new BigNumber(hex.join(''), 16);
};

/**
 * Returns an instance as Buffer.
 *
 * @param {Object} opts
 * @returns {ArrayBuffer} New buffer or error message
 * @todo Add description for the params
 */
BigNumber.prototype.toBuffer = function(opts) {
	var abs = this.abs();
	var isNeg = this.lt(0);
	var buf;
	var len;
	var ret;
	var endian;
	var hex = this.toString(16);
	var size;
	var hx;

	if (typeof opts === 'string') {
		if (opts !== 'mpint') {
			return 'Unsupported Buffer representation';
		}

		buf = abs.toBuffer({ size: 1, endian: 'big' });
		len = buf.length === 1 && buf[0] === 0 ? 0 : buf.length;

		if (buf[0] & 0x80) {
			len++;
		}

		ret = Buffer.alloc(4 + len);
		if (len > 0) {
			buf.copy(ret, 4 + (buf[0] & 0x80 ? 1 : 0));
		}
		if (buf[0] & 0x80) {
			ret[4] = 0;
		}

		ret[0] = len & (0xff << 24);
		ret[1] = len & (0xff << 16);
		ret[2] = len & (0xff << 8);
		ret[3] = len & (0xff << 0);

		// Two's compliment for negative integers
		if (isNeg) {
			for (var i = 4; i < ret.length; i++) {
				ret[i] = 0xff - ret[i];
			}
		}
		ret[4] = (ret[4] & 0x7f) | (isNeg ? 0x80 : 0);
		if (isNeg) {
			ret[ret.length - 1]++;
		}

		return ret;
	}

	if (!opts) {
		opts = {};
	}

	endian = { 1: 'big', '-1': 'little' }[opts.endian] || opts.endian || 'big';

	if (hex.charAt(0) === '-') {
		throw new Error('Converting negative numbers to Buffers not supported yet');
	}

	size = opts.size === 'auto' ? Math.ceil(hex.length / 2) : opts.size || 1;

	len = Math.ceil(hex.length / (2 * size)) * size;
	buf = Buffer.alloc(len);

	// Zero-pad the hex string so the chunks are all `size` long
	while (hex.length < 2 * len) {
		hex = `0${hex}`;
	}

	hx = hex.split(new RegExp(`(.{${2 * size}})`)).filter(s => s.length > 0);

	hx.forEach((chunk, i) => {
		for (var j = 0; j < size; j++) {
			var ix = i * size + (endian === 'big' ? j : size - j - 1);
			buf[ix] = parseInt(chunk.slice(j * 2, j * 2 + 2), 16);
		}
	});

	return buf;
};

module.exports = BigNumber;
