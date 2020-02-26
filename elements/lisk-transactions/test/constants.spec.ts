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
	FIXED_POINT,
	DAPP_FEE,
	DELEGATE_FEE,
	IN_TRANSFER_FEE,
	OUT_TRANSFER_FEE,
	MULTISIGNATURE_FEE,
	SIGNATURE_FEE,
	TRANSFER_FEE,
	VOTE_FEE,
	BYTESIZES,
} from '../src/constants';

describe('transactions constants module', () => {
	it('FIXED_POINT to be an integer', () => {
		return expect(FIXED_POINT).toBeNumber();
	});

	it('DAPP_FEE to be an integer', () => {
		return expect(DAPP_FEE).toBeNumber();
	});

	it('DELEGATE_FEE to be an integer', () => {
		return expect(DELEGATE_FEE).toBeNumber();
	});

	it('IN_TRANSFER_FEE to be an integer', () => {
		return expect(IN_TRANSFER_FEE).toBeNumber();
	});

	it('OUT_TRANSFER_FEE to be an integer', () => {
		return expect(OUT_TRANSFER_FEE).toBeNumber();
	});

	it('MULTISIGNATURE_FEE to be an integer', () => {
		return expect(MULTISIGNATURE_FEE).toBeNumber();
	});

	it('SIGNATURE_FEE to be an integer', () => {
		return expect(SIGNATURE_FEE).toBeNumber();
	});

	it('TRANSFER_FEE to be an integer', () => {
		return expect(TRANSFER_FEE).toBeNumber();
	});

	it('VOTE_FEE to be an integer', () => {
		return expect(VOTE_FEE).toBeNumber();
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

	it('BYTESIZES.SIGNATURE_TRANSACTION to be an integer', () => {
		return expect(BYTESIZES.SIGNATURE_TRANSACTION).toBeNumber();
	});

	it('BYTESIZES.DATA to be an integer', () => {
		return expect(BYTESIZES.DATA).toBeNumber();
	});
});
