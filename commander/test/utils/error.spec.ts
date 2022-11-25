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
import * as chalk from 'chalk';
import { FileSystemError, ValidationError } from '../../src/utils/error';

describe('error utils', () => {
	const errorMessage = 'error message';

	describe('#FileSystemError', () => {
		let error: Error;
		beforeEach(() => {
			error = new FileSystemError(errorMessage);
		});

		it('should print the error message in red', () => {
			return expect(error.message).toEqual(chalk.red(errorMessage));
		});

		it('the error should have the name "FileSystemError"', () => {
			return expect(error.name).toBe('FileSystemError');
		});

		it('the error should be an instance of Node’s built-in Error', () => {
			return expect(error).toBeInstanceOf(Error);
		});
	});

	describe('#ValidationError', () => {
		let error: Error;
		beforeEach(() => {
			error = new ValidationError(errorMessage);
		});

		it('should print the error message in red', () => {
			return expect(error.message).toEqual(chalk.red(errorMessage));
		});

		it('the error should have the name "ValidationError"', () => {
			return expect(error.name).toBe('ValidationError');
		});

		it('the error should be an instance of Node’s built-in Error', () => {
			return expect(error).toBeInstanceOf(Error);
		});
	});
});
