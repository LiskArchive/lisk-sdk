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

import { validateTransaction } from '../../../src/utils/validation/validator';

describe('validator', () => {
	describe('when the input is empty', () => {
		it('should throw an error', () => {
			return expect(validateTransaction.bind(null)).to.throw();
		});
	});

	describe('when the input does not have correct type', () => {
		it('should throw an error when the type is not a number', () => {
			return expect(
				validateTransaction.bind(null, { type: 'newtype' }),
			).to.throw('Transaction type must be a number.');
		});

		it('should throw an error when the type is not supported', () => {
			return expect(validateTransaction.bind(null, { type: 8 })).to.throw(
				'Unsupported transaction type.',
			);
		});
	});

	describe('transaction type 0', () => {
		const validTransaction = {
			amount: '10000000000',
			recipientId: '123L',
			senderPublicKey:
				'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
			timestamp: 68223825,
			type: 0,
			fee: '10000000',
			recipientPublicKey: null,
			asset: {},
			signature:
				'fad7b3b31c337b39190d206831c1eaadc6bbf3878a3507a868a5fbb03471b383042bf3bb7cee20d9844f2f4d1bb90d08bc3589b8b7d27a538be285deec7a9504',
			id: '13241881933583824171',
		};

		it('should validate to be true without errors', () => {
			const { valid, errors } = validateTransaction(validTransaction);
			expect(errors).to.be.null;
			return expect(valid).to.be.true;
		});

		it('should validate to be false with errors when id contains non-number', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				id: '123nonnumber',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.id');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when amount is not number', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				amount: 'some number',
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.amount');
			return expect(valid).to.be.false;
		});

		it('should validate to be false with errors when data is greater than 64 bytes', () => {
			const invalidTransaction = Object.assign({}, validTransaction, {
				asset: {
					data:
						'fad7b3b31c337b39190d206831c1eaadc6bbf3878a3507a868a5fbb03471b383042bf3bb7cee20d9844f2f4d1bb90d08bc3589b8b7d27a538be285deec7a9504',
				},
			});
			const { valid, errors } = validateTransaction(invalidTransaction);
			expect(errors[0].dataPath).to.equal('.asset.data');
			return expect(valid).to.be.false;
		});
	});

	describe('transaction type 1', () => {});

	describe('transaction type 2', () => {});

	describe('transaction type 3', () => {});

	describe('transaction type 4', () => {});

	describe('transaction type 5', () => {});
});
