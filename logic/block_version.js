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
 * Main blockVersion logic
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires helpers/exceptions
 */

/**
 * Current block version.
 *
 * @property {number} currentBlockVersion - Current block version used for forging and verify
 */
const currentBlockVersion = 1;

/**
 * Checks if block version is valid - if match current version or there is an exception for provided block height.
 *
 * @param {number} version - Block version
 * @param {number} height - Block height
 * @returns {boolean}
 */
function isValid(version, height) {
	// Check if there is an exception for particular block version
	const heightsRange = exceptions.blockVersions[version];

	const isCurrentVersion = version === this.currentBlockVersion;

	// If there is no exception - check against current block version
	if (!heightsRange && isCurrentVersion) {
		return true;
	}

	const isInExceptionRange =
		heightsRange &&
		(height >= heightsRange.start && height <= heightsRange.end);

	// Return true if block version is in exceptions and between range
	if (isInExceptionRange) {
		return true;
	}

	// Block version for specified height is invalid
	return false;
}

module.exports = {
	isValid,
	currentBlockVersion,
};
