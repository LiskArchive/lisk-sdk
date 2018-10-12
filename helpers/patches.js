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

const semver = require('semver');

const Patches = {
	systemHeaders: {
		/**
		 * For version >=1.0.0-rc.0 - <=1.0.0-rc.4
		 *
		 * Strip the pre-release tag fwrom the version so it can work
		 * with semver.satisfies at modules.system.versionCompatible
		 * https://github.com/LiskHQ/lisk/issues/2389
		 *
		 * @param {string} forVersion - Version of the peer for which patch the headers
		 * @param {Object} headers - Headers that we need to patch
		 * @param {Object} logger - Logger object to log patching related logs
		 * @return {Object}
		 */
		versionForPreRelease: (forVersion, headers, logger) => {
			const headersData = Object.assign({}, headers);
			const isPeerVersionDefined =
				forVersion !== null && forVersion !== undefined;

			// if destination node is running a pre-release and
			// if destination node version is >=1.0.0-rc.0 and <=1.0.0-rc.3
			const isPeerInPreReleaseRange =
				isPeerVersionDefined &&
				semver.prerelease(forVersion) !== null &&
				semver.lte(forVersion, '1.0.0-rc.5') &&
				semver.gte(forVersion, '1.0.0-rc.0');

			const isSeedPeer = !isPeerVersionDefined;

			if ((isSeedPeer || isPeerInPreReleaseRange) && headers.version) {
				logger.info('Patching SystemHeaders.versionForPreRelease', forVersion);
				logger.debug(`Before patching version: ${headersData.version}`);

				const versionComponents = semver.parse(headersData.version);

				// Strip the pre-release tag fwrom the version so it can work
				// with semver.satisfies at modules.system.versionCompatible
				// https://github.com/LiskHQ/lisk/issues/2389
				headersData.version = `${versionComponents.major}.${
					versionComponents.minor
				}.${versionComponents.patch}`;

				logger.debug(`After patching version: ${headersData.version}`);
			}
			return headersData;
		},
	},
};

// Export
module.exports = Patches;
