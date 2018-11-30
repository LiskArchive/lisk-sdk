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
import { APIError } from '../src/errors';

describe('api errors module', () => {
	let apiError: APIError;
	const defaultMessage = 'this is an error';
	const defaultErrno = 401;

	beforeEach(() => {
		apiError = new APIError();
		return Promise.resolve();
	});

	describe('#constructor', () => {
		it('should create a new instance of APIError', () => {
			return expect(apiError)
				.to.be.an('object')
				.and.be.instanceof(APIError);
		});

		it('should set error name to `API Error`', () => {
			return expect(apiError.name).to.eql('API Error');
		});

		it('should set error message to empty string by default', () => {
			return expect(apiError.message).to.eql('');
		});

		it('should set errno to 500 by default', () => {
			return expect(apiError.errno).to.eql(500);
		});

		describe('when passed arguments', () => {
			beforeEach(() => {
				apiError = new APIError(defaultMessage, defaultErrno);
				return Promise.resolve();
			});

			it('should set error message when passed through first argument', () => {
				return expect(apiError.message).to.eql(defaultMessage);
			});

			it('should set errno when passed through second argument', () => {
				return expect(apiError.errno).to.eql(defaultErrno);
			});
		});
	});
});
