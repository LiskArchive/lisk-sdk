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

const SortBy = require('../../../../../../../src/modules/chain/helpers/sort_by');

describe('SortBy', () => {
	const validSortFieldsArray = ['address', 'balance', 'username', 'publicKey'];

	describe('sortBy', () => {
		describe('sort', () => {
			describe('when given as string', () => {
				it('should return empty object when sort is empty string', async () =>
					expect(SortBy.sortBy('')).to.eql({
						sortField: '',
						sortMethod: '',
					}));

				it('should return ASC as default sort type if only key is provided', async () =>
					expect(SortBy.sortBy('address')).to.eql({
						sortField: '"address"',
						sortMethod: 'ASC',
					}));

				it('should return ASC as default sort type if sort type is missing', async () =>
					expect(SortBy.sortBy('address:')).to.eql({
						sortField: '"address"',
						sortMethod: 'ASC',
					}));

				it('should return error if sort key not present in options.sortFields', async () =>
					expect(
						SortBy.sortBy('unknownField', { sortFields: validSortFieldsArray })
					).to.eql({ error: 'Invalid sort field' }));

				it('should return valid sort object if provided with sort:asc', async () =>
					expect(SortBy.sortBy('address:asc')).to.eql({
						sortField: '"address"',
						sortMethod: 'ASC',
					}));

				it('should return valid sort object if provided with sort:desc', async () =>
					expect(SortBy.sortBy('address:desc')).to.eql({
						sortField: '"address"',
						sortMethod: 'DESC',
					}));

				it('should return valid sort object with default sort type provided with sort:unknown', async () =>
					expect(SortBy.sortBy('address:unknown')).to.eql({
						sortField: '"address"',
						sortMethod: 'ASC',
					}));
			});

			describe('when given as object', () => {
				it('should return object with empty values when sort is empty object', async () =>
					expect(SortBy.sortBy({})).to.eql({
						sortField: '',
						sortMethod: '',
					}));

				it('should return valid sort object if a valid object given', async () =>
					expect(SortBy.sortBy({ address: 1 })).to.eql({
						sortField: '"address"',
						sortMethod: 'ASC',
					}));

				it('should return error when keys are not present in options.sortFields', async () =>
					expect(
						SortBy.sortBy({ unkown: 1 }, { sortFields: validSortFieldsArray })
					).to.eql({ error: 'Invalid sort field' }));

				it('should return object with string values if single key object is given', async () => {
					const result = SortBy.sortBy({ address: 1 });

					expect(result).to.eql({ sortField: '"address"', sortMethod: 'ASC' });

					expect(result.sortField).to.a('String');
					return expect(result.sortMethod).to.a('String');
				});

				it('should return object with array values if multiple keys object is given', async () => {
					const result = SortBy.sortBy({ address: 1, publicKey: -1 });

					expect(result).to.eql({
						sortField: ['"address"', '"publicKey"'],
						sortMethod: ['ASC', 'DESC'],
					});

					expect(result.sortField).to.a('Array');
					return expect(result.sortMethod).to.a('Array');
				});
			});
		});
	});
});
