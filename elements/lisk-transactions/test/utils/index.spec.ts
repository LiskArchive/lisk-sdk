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
 *
 */
import {
	convertBeddowsToLSK,
	convertLSKToBeddows,
	getId,
	prependMinusToPublicKeys,
	prependPlusToPublicKeys,
	validateSignature,
} from '../../src/utils';

describe('transaction utils', () => {
	describe('exports', () => {
		it('should have convertBeddowsToLSK', () => {
			return expect(convertBeddowsToLSK).toBeFunction();
		});

		it('should have convertLSKToBeddows', () => {
			return expect(convertLSKToBeddows).toBeFunction();
		});

		it('should have getId', () => {
			return expect(getId).toBeFunction();
		});

		it('should have prependMinusToPublicKeys', () => {
			return expect(prependMinusToPublicKeys).toBeFunction();
		});

		it('should have prependPlusToPublicKeys', () => {
			return expect(prependPlusToPublicKeys).toBeFunction();
		});

		it('should have verifySignature', () => {
			return expect(validateSignature).toBeFunction();
		});
	});
});
