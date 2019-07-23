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
import { GET, POST, PUT, TESTNET_NODES, MAINNET_NODES } from '../src/constants';

describe('api constants module', () => {
	it('GET should be a string', () => {
		return expect(GET).to.be.a('string');
	});

	it('POST should be a string', () => {
		return expect(POST).to.be.a('string');
	});

	it('PUT should be a string', () => {
		return expect(PUT).to.be.a('string');
	});

	it('TESTNET_NODES should be an array of strings', () => {
		expect(TESTNET_NODES).to.be.an('array');
		return TESTNET_NODES.forEach(node => expect(node).to.be.a('string'));
	});

	it('MAINNET_NODES should be an array of strings', () => {
		expect(MAINNET_NODES).to.be.an('array');
		return MAINNET_NODES.forEach(node => expect(node).to.be.a('string'));
	});
});
