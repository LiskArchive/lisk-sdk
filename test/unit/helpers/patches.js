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

const modulesLoader = require('../../common/modules_loader');
const patches = require('../../../helpers/patches.js');

const logger = modulesLoader.logger;

describe('Patches', () => {
	describe('systemHeaders', () => {
		describe('versionForPreRelease', () => {
			it('should not strip pre-release tag from headers if version is less than 1.0.0-rc.0', () => {
				const headersBefore = { version: '1.1.0-rc.5' };
				const headersAfter = patches.systemHeaders.versionForPreRelease(
					'1.0.0-beta.0',
					headersBefore,
					logger
				);

				return expect(headersAfter).to.be.eql(headersBefore);
			});
			it('should not strip pre-release tag from headers if version is greater than 1.0.0-rc.5', () => {
				const headersBefore = { version: '1.1.0-rc.5' };
				const headersAfter = patches.systemHeaders.versionForPreRelease(
					'1.0.0-rc.6',
					headersBefore,
					logger
				);

				return expect(headersAfter).to.be.eql(headersBefore);
			});
			it('should strip pre-release tag from headers if version is between 1.0.0-rc.0 - 1.0.0-rc.5', () => {
				const headersBefore = { version: '1.1.0-rc.5' };
				const headersAfter = patches.systemHeaders.versionForPreRelease(
					'1.0.0-rc.3',
					headersBefore,
					logger
				);

				return expect(headersAfter).to.be.eql({ version: '1.1.0' });
			});
			it('should return same version if there is no pre-release tag in header', () => {
				const headersBefore = { version: '1.1.0' };
				const headersAfter = patches.systemHeaders.versionForPreRelease(
					'1.0.0-rc.3',
					headersBefore,
					logger
				);

				return expect(headersAfter).to.be.eql(headersBefore);
			});
		});
	});
});
