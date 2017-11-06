/*
 * Copyright © 2017 Lisk Foundation
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
	DATA_FEE,
	EPOCH_TIME,
	EPOCH_TIME_SECONDS,
	EPOCH_TIME_MILLISECONDS,
} from '../src/constants';

describe('constants', () => {
	it('FIXED_POINT should be an integer', () => {
		FIXED_POINT.should.be.an.integer();
	});

	it('DAPP_FEE should be an integer', () => {
		DAPP_FEE.should.be.an.integer();
	});

	it('DELEGATE_FEE should be an integer', () => {
		DELEGATE_FEE.should.be.an.integer();
	});

	it('IN_TRANSFER_FEE should be an integer', () => {
		IN_TRANSFER_FEE.should.be.an.integer();
	});

	it('OUT_TRANSFER_FEE should be an integer', () => {
		OUT_TRANSFER_FEE.should.be.an.integer();
	});

	it('MULTISIGNATURE_FEE should be an integer', () => {
		MULTISIGNATURE_FEE.should.be.an.integer();
	});

	it('SIGNATURE_FEE should be an integer', () => {
		SIGNATURE_FEE.should.be.an.integer();
	});

	it('TRANSFER_FEE should be an integer', () => {
		TRANSFER_FEE.should.be.an.integer();
	});

	it('VOTE_FEE should be an integer', () => {
		VOTE_FEE.should.be.an.integer();
	});

	it('DATA_FEE should be an integer', () => {
		DATA_FEE.should.be.an.integer();
	});

	it('EPOCH_TIME should be a Date instance', () => {
		EPOCH_TIME.should.be.instanceOf(Date);
	});

	it('EPOCH_TIME_SECONDS should be an integer', () => {
		EPOCH_TIME_SECONDS.should.be.an.integer();
	});

	it('EPOCH_TIME_MILLISECONDS should be an integer', () => {
		EPOCH_TIME_MILLISECONDS.should.be.an.integer();
	});
});
