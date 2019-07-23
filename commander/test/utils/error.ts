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
import chalk from 'chalk';
import { FileSystemError, ValidationError } from '../../src/utils/error';

describe('error utils', () => {
	const errorMessage = 'error message';

	describe('#FileSystemError', () => {
		let error: Error;
		beforeEach(() => {
			error = new FileSystemError(errorMessage);
			return Promise.resolve();
		});

		it('should print the error message in red', () => {
			return expect(error.message).to.equal(chalk.red(errorMessage));
		});

		it('the error should have the name "FileSystemError"', () => {
			return expect(error.name).to.be.equal('FileSystemError');
		});

		it('the error should be an instance of Node’s built-in Error', () => {
			return expect(error).to.be.an('Error');
		});
	});

	describe('#ValidationError', () => {
		let error: Error;
		beforeEach(() => {
			error = new ValidationError(errorMessage);
			return Promise.resolve();
		});

		it('should print the error message in red', () => {
			return expect(error.message).to.equal(chalk.red(errorMessage));
		});

		it('the error should have the name "ValidationError"', () => {
			return expect(error.name).to.be.equal('ValidationError');
		});

		it('the error should be an instance of Node’s built-in Error', () => {
			return expect(error).to.be.an('Error');
		});
	});
});
