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

const constants = require('../../../helpers/constants.js');
const blockVersion = require('../../../helpers/block_version.js');

describe('block_version', () => {
	before(done => {
		constants.blockVersions = [
			0,
			102, // Bump block version at height 102
			203, // Bump block version at height 203
		];
		done();
	});

	describe('get', () => {
		it('should return 0 for height = undefined', () => {
			const height = undefined;
			const version = 0;

			return expect(blockVersion.get(height)).to.equal(version);
		});

		it('should return 0 for height = 1', () => {
			const height = 1;
			const version = 0;

			return expect(blockVersion.get(height)).to.equal(version);
		});

		it('should return 0 for height = 101', () => {
			const height = 101;
			const version = 0;

			return expect(blockVersion.get(height)).to.equal(version);
		});

		it('should return 1 for height = 102', () => {
			const height = 102;
			const version = 1;

			return expect(blockVersion.get(height)).to.equal(version);
		});

		it('should return 1 for height = 202', () => {
			const height = 202;
			const version = 1;

			return expect(blockVersion.get(height)).to.equal(version);
		});

		it('should return 2 for height = 203', () => {
			const height = 203;
			const version = 2;

			return expect(blockVersion.get(height)).to.equal(version);
		});

		it('should return 2 for height > 203', () => {
			const height = 204;
			const version = 2;

			return expect(blockVersion.get(height)).to.equal(version);
		});
	});
});
