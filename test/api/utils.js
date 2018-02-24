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
import { toQueryString, solveURLParams } from 'api/utils';

describe('api utils module', () => {
	const defaultURL = 'http://localhost:8080/api/resources';

	describe('#toQueryString', () => {
		it('should create a query string from an object', () => {
			const queryString = toQueryString({
				key1: 'value1',
				key2: 'value2',
				key3: 'value3',
			});
			return queryString.should.be.equal('key1=value1&key2=value2&key3=value3');
		});

		it('should escape invalid special characters', () => {
			const queryString = toQueryString({
				'key:/;?': 'value:/;?',
			});
			return queryString.should.be.equal('key%3A%2F%3B%3F=value%3A%2F%3B%3F');
		});
	});

	describe('#solveURLParams', () => {
		it('should return original URL with no param', () => {
			const solvedURL = solveURLParams(defaultURL);
			return solvedURL.should.be.equal(defaultURL);
		});

		it('should throw error if url has variable but no param', () => {
			return solveURLParams
				.bind(null, `${defaultURL}/{id}`)
				.should.throw(Error('URL is not completely solved'));
		});

		it('should throw error if url has variable but not matching params', () => {
			return solveURLParams
				.bind(null, `${defaultURL}/{id}`, { accountId: '123' })
				.should.throw(Error('URL is not completely solved'));
		});

		it('should replace variable with correct id', () => {
			const solvedURL = solveURLParams(`${defaultURL}/{id}`, {
				id: '456',
				accountId: '123',
			});
			return solvedURL.should.be.equal(`${defaultURL}/456`);
		});

		it('should replace multiple variables with correct id and accountId', () => {
			const solvedURL = solveURLParams(`${defaultURL}/{accountId}/{id}`, {
				id: '456',
				accountId: '123',
			});
			return solvedURL.should.be.equal(`${defaultURL}/123/456`);
		});

		it('should replace variable with correct id and encode special characters', () => {
			const solvedURL = solveURLParams(`${defaultURL}/{id}`, {
				id: '456ß1234sd',
				accountId: '123',
			});
			return solvedURL.should.be.equal(`${defaultURL}/456%C3%9F1234sd`);
		});
	});
});
