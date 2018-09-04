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

const exceptions = global.exceptions;

/**
 * Main blockVersion logic
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
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
	// Check is there an exception for provided height and if yes assing its version
	const exceptionVersion = Object.keys(exceptions.blockVersions).find(
		exceptionVersion => {
			// Get height range of current exceptions
			const heightsRange = exceptions.blockVersions[exceptionVersion];
			// Check if provided height is between the range boundaries
			return height >= heightsRange.start && height <= heightsRange.end;
		}
	);

	if (exceptionVersion === undefined) {
		// If there is no exception for provided height - check against current block version
		return version === this.currentBlockVersion;
	}

	// If there is an exception - check if version match
	return Number(exceptionVersion) === version;
}

module.exports = {
	isValid,
	currentBlockVersion,
};
