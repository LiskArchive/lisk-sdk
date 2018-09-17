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
 */

'use strict';

var ApiError = require('../../../helpers/api_error.js');

describe('helpers/apiError', () => {
	var apiError;
	var validErrorMessage;
	var validErrorCode;

	beforeEach(done => {
		validErrorMessage = 'Valid error message';
		validErrorCode = 501;
		apiError = new ApiError(validErrorMessage, validErrorCode);
		done();
	});

	describe('constructor', () => {
		it('should be an Error instance', done => {
			expect(apiError).to.have.instanceOf(Error);
			done();
		});

		it('should assign field message = "Valid error message"', done => {
			expect(apiError)
				.to.have.property('message')
				.equal(validErrorMessage);
			done();
		});

		it('should assign field code = 501', done => {
			expect(apiError)
				.to.have.property('code')
				.equal(validErrorCode);
			done();
		});
	});

	describe('toJson', () => {
		it('should return Object type result', done => {
			expect(apiError.toJson()).to.be.an('Object');
			done();
		});

		it('should return result containing message = "Valid error message"', done => {
			expect(apiError.toJson())
				.to.have.property('message')
				.equal(validErrorMessage);
			done();
		});
	});
});
