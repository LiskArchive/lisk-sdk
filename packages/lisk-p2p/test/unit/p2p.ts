/*
 * Copyright © 2018 Lisk Foundation
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
import { P2P } from '../../src';

describe('p2p', () => {
	describe('#constructor', () => {
		const lisk = new P2P();
		it('should be an object', () => {
			return expect(lisk).to.be.an('object');
		});
		it('should be an instance of P2P blockchain', () => {
			return expect(lisk)
				.to.be.an('object')
				.and.be.instanceof(P2P);
		});
	});
});
