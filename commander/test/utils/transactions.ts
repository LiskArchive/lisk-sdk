/*
 * LiskHQ/lisk-commander
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
import { parseTransactionString } from '../../src/utils/transactions';
import { ValidationError } from '../../src/utils/error';

describe('transactions utils', () => {
	describe('#parseTransactionString', () => {
		const validTransactionString =
			'{"amount":"10000000000","recipientId":"100L","senderPublicKey":"a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd","timestamp":73074942,"type":0,"fee":"10000000","recipientPublicKey":null,"asset":{},"signature":"304d375ea6230eaf222da6041d8553be5214ef6e399869e686e970eb5c3d9642217e68494c778c9c7f77c11cc1cb0b92df4bd4fa25e0149e2009a225369ffc01","id":"10769065659474020955"}';

		it('should parse transaction string into a object', () => {
			return expect(parseTransactionString(validTransactionString)).to.be.an(
				'object',
			);
		});

		it('should throw a validation error when the input is not valid JSON format', () => {
			return expect(
				parseTransactionString.bind(
					null,
					'{"amount":"10000000000","recipientId":"100L"',
				),
			).to.throw(ValidationError, 'Could not parse transaction JSON.');
		});

		it('should throw a validation error when the input is empty', () => {
			return expect(parseTransactionString.bind(null, '')).to.throw(
				ValidationError,
				'Could not parse transaction JSON.',
			);
		});

		it('should throw a validation error when the input is undefined', () => {
			return expect(parseTransactionString.bind(null)).to.throw(
				ValidationError,
				'Could not parse transaction JSON.',
			);
		});
	});
});
