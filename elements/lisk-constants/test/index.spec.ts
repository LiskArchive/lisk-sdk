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
	MAX_ADDRESS_NUMBER,
	MAX_TRANSACTION_ID,
	MAX_TRANSACTION_AMOUNT,
	TESTNET_NETHASH,
	MAINNET_NETHASH,
	SIGNED_MESSAGE_PREFIX,
} from '../src';

describe('lisk-constants', () => {
	it('MAX_ADDRESS_NUMBER should be a string', () => {
		expect(MAX_ADDRESS_NUMBER).toBeString();
	});

	it('MAX_TRANSACTION_ID should be a string', () => {
		expect(MAX_TRANSACTION_ID).toBeString();
	});

	it('MAX_TRANSACTION_AMOUNT should be a string', () => {
		expect(MAX_TRANSACTION_AMOUNT).toBeString();
	});

	it('TESTNET_NETHASH should be a string', () => {
		expect(TESTNET_NETHASH).toBeString();
	});

	it('MAINNET_NETHASH should be a string', () => {
		expect(MAINNET_NETHASH).toBeString();
	});

	it('SIGNED_MESSAGE_PREFIX should be a string', () => {
		expect(SIGNED_MESSAGE_PREFIX).toBeString();
	});
});
