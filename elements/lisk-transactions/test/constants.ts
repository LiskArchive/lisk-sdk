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
import { expect } from 'chai';
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
		return expect(FIXED_POINT).to.be.an.integer;
	});

	it('DAPP_FEE to be an integer', () => {
		return expect(DAPP_FEE).to.be.an.integer;
	});

	it('DELEGATE_FEE to be an integer', () => {
		return expect(DELEGATE_FEE).to.be.an.integer;
	});

	it('IN_TRANSFER_FEE to be an integer', () => {
		return expect(IN_TRANSFER_FEE).to.be.an.integer;
	});

	it('OUT_TRANSFER_FEE to be an integer', () => {
		return expect(OUT_TRANSFER_FEE).to.be.an.integer;
	});

	it('MULTISIGNATURE_FEE to be an integer', () => {
		return expect(MULTISIGNATURE_FEE).to.be.an.integer;
	});

	it('SIGNATURE_FEE to be an integer', () => {
		return expect(SIGNATURE_FEE).to.be.an.integer;
	});

	it('TRANSFER_FEE to be an integer', () => {
		return expect(TRANSFER_FEE).to.be.an.integer;
	});

	it('VOTE_FEE to be an integer', () => {
		return expect(VOTE_FEE).to.be.an.integer;
	});

	it('BYTESIZES.TYPE to be an integer', () => {
		return expect(BYTESIZES.TYPE).to.be.an.integer;
	});

	it('BYTESIZES.TIMESTAMP to be an integer', () => {
		return expect(BYTESIZES.TIMESTAMP).to.be.an.integer;
	});

	it('BYTESIZES.MULTISIGNATURE_PUBLICKEY to be an integer', () => {
		return expect(BYTESIZES.MULTISIGNATURE_PUBLICKEY).to.be.an.integer;
	});

	it('BYTESIZES.RECIPIENT_ID to be an integer', () => {
		return expect(BYTESIZES.RECIPIENT_ID).to.be.an.integer;
	});

	it('BYTESIZES.AMOUNT to be an integer', () => {
		return expect(BYTESIZES.AMOUNT).to.be.an.integer;
	});

	it('BYTESIZES.SIGNATURE_TRANSACTION to be an integer', () => {
		return expect(BYTESIZES.SIGNATURE_TRANSACTION).to.be.an.integer;
	});

	it('BYTESIZES.SECOND_SIGNATURE_TRANSACTION to be an integer', () => {
		return expect(BYTESIZES.SECOND_SIGNATURE_TRANSACTION).to.be.an.integer;
	});

	it('BYTESIZES.DATA to be an integer', () => {
		return expect(BYTESIZES.DATA).to.be.an.integer;
	});
});
