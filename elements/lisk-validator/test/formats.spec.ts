/*
 * Copyright © 2020 Lisk Foundation
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
 *
 */

import { csv } from '../src/formats';

describe('formats', () => {
	describe('csv', () => {
		it('should return false for too many csv values', () => {
			const csvString = `1${Array(1001).join(',1')}`;
			return expect(csv(csvString)).toBeFalse();
		});

		it('should return for valid count of csv values', () => {
			const csvString = `1${Array(999).join(',1')}`;
			return expect(csv(csvString)).toBeTrue();
		});
	});
});
