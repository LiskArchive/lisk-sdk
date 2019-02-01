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
 * Description if the module.
 *
 * @module
 * @todo Add description for the module
 */
module.exports = {
	/**
	 * Changes operation sign.
	 *
	 * @param {Array} diff
	 * @returns {Array} Reverse sign
	 * @todo Add description for the params
	 */
	reverse(diff) {
		const copyDiff = diff.slice();
		for (let i = 0; i < copyDiff.length; i++) {
			const math = copyDiff[i][0] === '-' ? '+' : '-';
			copyDiff[i] = math + copyDiff[i].slice(1);
		}
		return copyDiff;
	},

	/**
	 * Acts over source content adding(+) or deleting(-) public keys based on diff content.
	 *
	 * @param {Array} source
	 * @param {Array} diff
	 * @returns {Array} Source data without -publicKeys and with +publicKeys from diff.
	 * @todo Add description for the params
	 */
	merge(source, diff) {
		let res = source ? source.slice() : [];
		let index;

		for (let i = 0; i < diff.length; i++) {
			const math = diff[i][0];
			const publicKey = diff[i].slice(1);

			if (math === '+') {
				res = res || [];

				index = -1;
				if (res) {
					index = res.indexOf(publicKey);
				}
				if (index !== -1) {
					return false;
				}

				res.push(publicKey);
			}
			if (math === '-') {
				index = -1;
				if (res) {
					index = res.indexOf(publicKey);
				}
				if (index === -1) {
					return false;
				}
				res.splice(index, 1);
				if (!res.length) {
					res = null;
				}
			}
		}
		return res;
	},
};
