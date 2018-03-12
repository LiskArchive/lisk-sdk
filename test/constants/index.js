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
	MAX_ADDRESS_NUMBER,
	MAX_TRANSACTION_AMOUNT,
	LIVE_PORT,
	SSL_PORT,
	TEST_PORT,
	GET,
	POST,
	PUT,
	MAINNET_NETHASH,
	TESTNET_NETHASH,
} from 'constants';

describe('constants', () => {
	it('FIXED_POINT should be an integer', () => {
		return FIXED_POINT.should.be.an.integer;
	});

	it('DAPP_FEE should be an integer', () => {
		return DAPP_FEE.should.be.an.integer;
	});

	it('DELEGATE_FEE should be an integer', () => {
		return DELEGATE_FEE.should.be.an.integer;
	});

	it('IN_TRANSFER_FEE should be an integer', () => {
		return IN_TRANSFER_FEE.should.be.an.integer;
	});

	it('OUT_TRANSFER_FEE should be an integer', () => {
		return OUT_TRANSFER_FEE.should.be.an.integer;
	});

	it('MULTISIGNATURE_FEE should be an integer', () => {
		return MULTISIGNATURE_FEE.should.be.an.integer;
	});

	it('SIGNATURE_FEE should be an integer', () => {
		return SIGNATURE_FEE.should.be.an.integer;
	});

	it('TRANSFER_FEE should be an integer', () => {
		return TRANSFER_FEE.should.be.an.integer;
	});

	it('VOTE_FEE should be an integer', () => {
		return VOTE_FEE.should.be.an.integer;
	});

	it('DATA_FEE should be an integer', () => {
		return DATA_FEE.should.be.an.integer;
	});

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

	it('LIVE_PORT should be a string', () => {
		return LIVE_PORT.should.be.a('string');
	});

	it('SSL_PORT should be a string', () => {
		return SSL_PORT.should.be.a('string');
	});

	it('TEST_PORT should be a string', () => {
		return TEST_PORT.should.be.a('string');
	});

	it('GET should be a string', () => {
		return GET.should.be.a('string');
	});

	it('POST should be a string', () => {
		return POST.should.be.a('string');
	});

	it('PUT should be a string', () => {
		return PUT.should.be.a('string');
	});

	it('MAINNET_NETHASH should be a string', () => {
		return MAINNET_NETHASH.should.be.a('string');
	});

	it('TESTNET_NETHASH should be a string', () => {
		return TESTNET_NETHASH.should.be.a('string');
	});
});
