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

const exceptions = require('../helpers/exceptions.js');

/**
 * Helper module for getting block version for particular height
 *
 * @module
 * @see Parent: {@link helpers}
 */

/**
 * Returns block version for provided block height.
 *
 * @param {number} height - Block height
 * @returns {number} version - Block version
 */
function get(height) {
	let version = 0;
	for (let i = 0; i < exceptions.precedent.blockVersions.length; i++) {
		if (exceptions.precedent.blockVersions[i] <= height) {
			version = i;
		}
	}
	return version;
}

module.exports = {
	get,
};
