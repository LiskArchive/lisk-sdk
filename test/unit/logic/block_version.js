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

const exceptions = require('../../../helpers/exceptions.js');
const blockVersion = require('../../../logic/block_version.js');

describe('block_version', () => {
	before(done => {
		exceptions.blockVersions = {
			0: { start: 0, end: 101 },
			1: { start: 102, end: 202 },
			2: { start: 203, end: 303 },
		};
		done();
	});

	describe('get', () => {
		it('should return true for version = 1, height = 101', () => {
			const height = 101;
			const version = 1;

			return expect(blockVersion.isValid(version, height)).to.equal(true);
		});

		it('should return false for version = 0, height = undefined', () => {
			const height = undefined;
			const version = 0;

			return expect(blockVersion.isValid(version, height)).to.equal(false);
		});

		it('should return true for version = 0, height = 1', () => {
			const height = 1;
			const version = 0;

			return expect(blockVersion.isValid(version, height)).to.equal(true);
		});

		it('should return true for version = 0, height = 101', () => {
			const height = 101;
			const version = 0;

			return expect(blockVersion.isValid(version, height)).to.equal(true);
		});

		it('should return true for version = 1, height = 102', () => {
			const height = 102;
			const version = 1;

			return expect(blockVersion.isValid(version, height)).to.equal(true);
		});

		it('should return true for version = 1, height = 202', () => {
			const height = 202;
			const version = 1;

			return expect(blockVersion.isValid(version, height)).to.equal(true);
		});

		it('should return false for version = 2, height = 202', () => {
			const height = 202;
			const version = 2;

			return expect(blockVersion.isValid(version, height)).to.equal(false);
		});

		it('should return true for version = 2, height = 203', () => {
			const height = 203;
			const version = 2;

			return expect(blockVersion.isValid(version, height)).to.equal(true);
		});

		it('should return true for version = 2, height > 203', () => {
			const height = 203;
			const version = 2;

			return expect(blockVersion.isValid(version, height)).to.equal(true);
		});

		it('should return false for version = 3, height > 203', () => {
			const height = 203;
			const version = 3;

			return expect(blockVersion.isValid(version, height)).to.equal(false);
		});
	});
});
