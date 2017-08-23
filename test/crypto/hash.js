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
import { getTransactionHash, getSha256Hash } from '../../src/crypto/hash';

describe('hash', () => {

	describe('#getSha256Hash', () => {
		it('should be ok', () => {
			(getSha256Hash).should.be.ok();
		});
	});

	describe('#getTransactionHash', () => {
		it('should be ok', () => {
			(getTransactionHash).should.be.ok();
		});

		it('should be a function', () => {
			(getTransactionHash).should.be.type('function');
		});

		it('should return Buffer and Buffer most be 32 bytes length', () => {
			const transaction = {
				type: 0,
				amount: 1000,
				recipientId: '58191285901858109L',
				timestamp: 141738,
				asset: {},
				senderPublicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
				signature: '618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
				id: '13987348420913138422',
			};

			const result = getTransactionHash(transaction);
			(result).should.be.ok();
			(result).should.be.type('object');
			(result.length).should.be.equal(32);
		});
	});
});

