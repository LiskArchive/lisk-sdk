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
import { checkTypes } from '../../../src/transactions/helpers';
import { TransactionError } from '../../../src/errors';
import { TransactionJSON } from '../../../src/transaction_types';

describe('#checkTypes', () => {
	const defaultTransaction: TransactionJSON = {
		id: '15822870279184933850',
		type: 0,
		timestamp: 79289378,
		senderPublicKey:
			'0eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243',
		senderId: '18278674964748191682L',
		recipientId: '17243547555692708431L',
		recipientPublicKey:
			'3f82af600f7507a5c95e8a1c2b69aa353b59f26906298dce1d8009a2a52c6f59',
		amount: '9312934243',
		fee: '10000000',
		signature:
			'2092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
		signatures: [],
		asset: {},
		receivedAt: new Date(),
	};

	describe('when given a transaction with valid types', () => {
		it('should return an object with valid = true', () => {
			const { valid } = checkTypes(defaultTransaction);

			return expect(valid).to.be.true;
		});
	});

	describe('when given a transaction with invalid types', () => {
		let invalidTransaction: any;
		beforeEach(() => {
			invalidTransaction = {
				...defaultTransaction,
				amount: 100,
				fee: 100,
			};
		});

		it('should return an object with valid = false', () => {
			const { valid } = checkTypes(invalidTransaction);

			return expect(valid).to.be.false;
		});

		it('should return an object with transaction errors', () => {
			const { errors } = checkTypes(invalidTransaction);
			const errorsArray = errors as ReadonlyArray<TransactionError>;
			expect(errors).to.be.an('array');
			return errorsArray.forEach(error =>
				expect(error).to.be.instanceof(TransactionError),
			);
		});
	});
});
