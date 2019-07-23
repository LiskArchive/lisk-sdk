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
import {
	validateLifetime,
	validateMinimum,
	validateAmount,
	createErrorHandler,
	handleEPIPE,
} from '../../src/utils/helpers';
import { ValidationError } from '../../src/utils/error';

describe('helpers utils', () => {
	describe('#validateLifetime', () => {
		it('should return true for a valid lifetime', () => {
			const result = validateLifetime('1234567890');
			return expect(result).to.be.true;
		});

		it('should throw validation error with NaN', () => {
			return expect(validateLifetime.bind(null, 'NaN'))
				.to.throw()
				.and.be.customError(
					new ValidationError('Lifetime must be an integer.'),
				);
		});

		it('should throw validation error with decimals', () => {
			return expect(validateLifetime.bind(null, '123.4'))
				.to.throw()
				.and.be.customError(
					new ValidationError('Lifetime must be an integer.'),
				);
		});
	});

	describe('#validateMinimum', () => {
		it('should return true for a valid minimum number of signatures', () => {
			const result = validateMinimum('1234567890');
			return expect(result).to.be.true;
		});

		it('should throw validation error with NaN', () => {
			return expect(validateMinimum.bind(null, 'NaN'))
				.to.throw()
				.and.be.customError(
					new ValidationError(
						'Minimum number of signatures must be an integer.',
					),
				);
		});

		it('should throw validation error with too many decimals', () => {
			return expect(validateMinimum.bind(null, '123.4'))
				.to.throw()
				.and.be.customError(
					new ValidationError(
						'Minimum number of signatures must be an integer.',
					),
				);
		});
	});

	describe('#validateAmount', () => {
		it('should return true for a valid amount', () => {
			const result = validateAmount('100.123');
			return expect(result).to.be.true;
		});

		it('should throw validation error with abcedf', () => {
			return expect(validateAmount.bind(null, 'abcedf'))
				.to.throw()
				.and.be.customError(
					new ValidationError(
						'Amount must be a number with no more than 8 decimal places.',
					),
				);
		});

		it('should throw validation error with too many decimals', () => {
			return expect(validateAmount.bind(null, '10.0001000001'))
				.to.throw()
				.and.be.customError(
					new ValidationError(
						'Amount must be a number with no more than 8 decimal places.',
					),
				);
		});
	});

	describe('#createErrorHandler', () => {
		it('should return prefixed message', () => {
			const prefix = 'error prefix';
			const message = 'some error';
			const result = createErrorHandler(prefix)({ message });
			return expect(result).to.be.eql({ error: `${prefix}: ${message}` });
		});
	});

	describe('#handleEPIPE', () => {
		interface CustomError extends Error {
			errno: string | number;
		}

		it('should handle EPIPE error', () => {
			const err = new Error() as CustomError;
			err.errno = 'EPIPE';
			return expect(handleEPIPE.bind(null, err)).to.not.throw();
		});

		it('should throw a non-EPIPE error', () => {
			const message = 'some error';
			return expect(handleEPIPE.bind(null, new Error(message))).to.throw(
				message,
			);
		});
	});
});
