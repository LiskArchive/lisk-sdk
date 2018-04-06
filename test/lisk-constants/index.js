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
	BETANET_NETHASH,
	BETANET_NODES,
	TESTNET_NETHASH,
	TESTNET_NODES,
	MAINNET_NETHASH,
	MAINNET_NODES,
} from 'lisk-constants';

describe('lisk-constants', () => {
	it('EPOCH_TIME should be a Date instance', () => {
		return expect(EPOCH_TIME).to.be.instanceOf(Date);
	});

	it('EPOCH_TIME_SECONDS should be an integer', () => {
		return expect(EPOCH_TIME_SECONDS).to.be.an.integer;
	});

	it('EPOCH_TIME_MILLISECONDS should be an integer', () => {
		return expect(EPOCH_TIME_MILLISECONDS).to.be.an.integer;
	});

	it('MAX_ADDRESS_NUMBER should be a string', () => {
		return expect(MAX_ADDRESS_NUMBER).to.be.a('string');
	});

	it('MAX_TRANSACTION_AMOUNT should be a string', () => {
		return expect(MAX_TRANSACTION_AMOUNT).to.be.a('string');
	});

	it('BETANET_NETHASH should be a string', () => {
		return expect(BETANET_NETHASH).to.be.a('string');
	});

	it('BETANET_NODES should be an array of strings', () => {
		expect(BETANET_NODES).to.be.an('array');
		return BETANET_NODES.forEach(node => expect(node).to.be.a('string'));
	});

	it('TESTNET_NETHASH should be a string', () => {
		return expect(TESTNET_NETHASH).to.be.a('string');
	});

	it('TESTNET_NODES should be an array of strings', () => {
		expect(TESTNET_NODES).to.be.an('array');
		return TESTNET_NODES.forEach(node => expect(node).to.be.a('string'));
	});

	it('MAINNET_NETHASH should be a string', () => {
		return expect(MAINNET_NETHASH).to.be.a('string');
	});

	it('MAINNET_NODES should be an array of strings', () => {
		expect(MAINNET_NODES).to.be.an('array');
		return MAINNET_NODES.forEach(node => expect(node).to.be.a('string'));
	});
});
