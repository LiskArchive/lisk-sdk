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
	EPOCH_TIME,
	EPOCH_TIME_SECONDS,
	EPOCH_TIME_MILLISECONDS,
	MAX_ADDRESS_NUMBER,
	MAX_TRANSACTION_AMOUNT,
} from 'lisk-constants';

describe('lisk-constants', () => {
	it('EPOCH_TIME should be a Date instance', () => {
		return EPOCH_TIME.should.be.instanceOf(Date);
	});

	it('EPOCH_TIME_SECONDS should be an integer', () => {
		return EPOCH_TIME_SECONDS.should.be.an.integer;
	});

	it('EPOCH_TIME_MILLISECONDS should be an integer', () => {
		return EPOCH_TIME_MILLISECONDS.should.be.an.integer;
	});

	it('MAX_ADDRESS_NUMBER should be a string', () => {
		return MAX_ADDRESS_NUMBER.should.be.a('string');
	});

	it('MAX_TRANSACTION_AMOUNT should be a string', () => {
		return MAX_TRANSACTION_AMOUNT.should.be.a('string');
	});
});
