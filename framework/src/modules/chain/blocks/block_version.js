/*
 * Copyright © 2019 Lisk Foundation
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
 * Current block version.
 *
 * @property {number} currentBlockVersion - Current block version used for forging and verify
 */
const currentBlockVersion = 2;

/**
 * Checks if block version is valid - if match current version or there is an exception for provided block height.
 *
 * @param {number} version - Block version
 * @param {number} height - Block height
 * @returns {boolean}
 */
const isValid = (version, height, exceptions = {}) => {
	// Check is there an exception for provided height and if yes assing its version
	const blockVersionExceptions = exceptions.blockVersions || {};
	const exceptionVersion = Object.keys(blockVersionExceptions).find(
		exception => {
			// Get height range of current exceptions
			const heightsRange = blockVersionExceptions[exception];
			// Check if provided height is between the range boundaries
			return height >= heightsRange.start && height <= heightsRange.end;
		},
	);

	if (exceptionVersion === undefined) {
		// If there is no exception for provided height - check against current block version
		// eslint-disable-next-line no-use-before-define
		return version === blockVersionInterface.currentBlockVersion;
	}

	// If there is an exception - check if version match
	return Number(exceptionVersion) === version;
};

const getBlockVersion = (height, exceptions = {}) => {
	if (height === undefined || !exceptions.blockVersions) {
		// eslint-disable-next-line no-use-before-define
		return blockVersionInterface.currentBlockVersion;
	}

	const exceptionVersion = Object.keys(exceptions.blockVersions).find(
		exception => {
			// Get height range of current exceptions
			const heightsRange = exceptions.blockVersions[exception];
			// Check if provided height is between the range boundaries
			return height >= heightsRange.start && height <= heightsRange.end
				? exception
				: false;
		},
	);

	if (exceptionVersion === undefined) {
		// If there is no exception for provided height return currentBlockVersion
		// eslint-disable-next-line no-use-before-define
		return blockVersionInterface.currentBlockVersion;
	}

	return Number(exceptionVersion);
};

const blockVersionInterface = {
	isValid,
	currentBlockVersion,
	getBlockVersion,
};

module.exports = blockVersionInterface;
