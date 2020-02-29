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
import { FIXED_POINT, BYTESIZES } from '../src/constants';

describe('transactions constants module', () => {
	it('FIXED_POINT to be an integer', () => {
		return expect(FIXED_POINT).toBeNumber();
	});

	it('BYTESIZES.TYPE to be an integer', () => {
		return expect(BYTESIZES.TYPE).toBeNumber();
	});

	it('BYTESIZES.TIMESTAMP to be an integer', () => {
		return expect(BYTESIZES.TIMESTAMP).toBeNumber();
	});

	it('BYTESIZES.MULTISIGNATURE_PUBLICKEY to be an integer', () => {
		return expect(BYTESIZES.MULTISIGNATURE_PUBLICKEY).toBeNumber();
	});

	it('BYTESIZES.RECIPIENT_ID to be an integer', () => {
		return expect(BYTESIZES.RECIPIENT_ID).toBeNumber();
	});

	it('BYTESIZES.AMOUNT to be an integer', () => {
		return expect(BYTESIZES.AMOUNT).toBeNumber();
	});

	it('BYTESIZES.NONCE to be an integer', () => {
		return expect(BYTESIZES.NONCE).toBeNumber();
	});

	it('BYTESIZES.FEE to be an integer', () => {
		return expect(BYTESIZES.FEE).toBeNumber();
	});

	it('BYTESIZES.SIGNATURE_TRANSACTION to be an integer', () => {
		return expect(BYTESIZES.SIGNATURE_TRANSACTION).toBeNumber();
	});

	it('BYTESIZES.DATA to be an integer', () => {
		return expect(BYTESIZES.DATA).toBeNumber();
	});
});
