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
};
