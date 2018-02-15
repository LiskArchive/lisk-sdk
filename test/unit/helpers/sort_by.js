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

var SortBy = require('../../../helpers/sort_by');

describe('SortBy', () => {
	var validSortFieldsArray = ['address', 'balance', 'username', 'publicKey'];

	describe('sortQueryToJsonSqlFormat', () => {
		describe('when sortQuery is not a string', () => {
			it('should return an empty object', () => {
				return expect(
					SortBy.sortQueryToJsonSqlFormat(1, validSortFieldsArray)
				).to.be.an('object').and.to.be.empty;
			});
		});

		describe('when sortQuery is a string', () => {
			it('should return an empty object when sortQuery is an empty string', () => {
				return expect(
					SortBy.sortQueryToJsonSqlFormat('', validSortFieldsArray)
				).to.be.an('object').and.to.be.empty;
			});

			it('should return {address: 1} (default sort type) when sortQuery contains member of validSortFieldsArray', () => {
				return expect(SortBy.sortQueryToJsonSqlFormat('address', validSortFieldsArray))
					.to.be.an('object')
					.eql({ address: 1 });
			});

			it('should return an empty object when sortQuery is not a member of validSortFieldsArray', () => {
				return expect(
					SortBy.sortQueryToJsonSqlFormat('unknown', validSortFieldsArray)
				).to.be.an('object').and.to.be.empty;
			});

			it('should return {address: 1} given "address:asc" ', () => {
				return expect(
					SortBy.sortQueryToJsonSqlFormat('address:asc', validSortFieldsArray)
				).eql({ address: 1 });
			});

			it('should return {address: -1} given "address:desc" ', () => {
				return expect(
					SortBy.sortQueryToJsonSqlFormat('address:desc', validSortFieldsArray)
				).eql({ address: -1 });
			});

			it('should return an empty object given "address:desc&username:asc" ', () => {
				return expect(
					SortBy.sortQueryToJsonSqlFormat(
						'address:desc&username:asc',
						validSortFieldsArray
					)
				).to.be.an('object').and.to.be.empty;
			});
		});
	});

	describe('sortBy', () => {
		describe('sort', () => {
			describe('when given as string', () => {
				it('should return empty object when sort is empty string', () => {
					return expect(SortBy.sortBy('')).to.eql({ sortField: '', sortMethod: '' });
				});

				it('should return ASC as default sort type if only key is provided', () => {
					return expect(SortBy.sortBy('address')).to.eql({
						sortField: '"address"',
						sortMethod: 'ASC',
					});
				});

				it('should return ASC as default sort type if sort type is missing', () => {
					return expect(SortBy.sortBy('address:')).to.eql({
						sortField: '"address"',
						sortMethod: 'ASC',
					});
				});

				it('should return error if sort key not present in options.sortFields', () => {
					return expect(
						SortBy.sortBy('unknownField', { sortFields: validSortFieldsArray })
					).to.eql({ error: 'Invalid sort field' });
				});

				it('should return valid sort object if provided with sort:asc', () => {
					return expect(SortBy.sortBy('address:asc')).to.eql({
						sortField: '"address"',
						sortMethod: 'ASC',
					});
				});

				it('should return valid sort object if provided with sort:desc', () => {
					return expect(SortBy.sortBy('address:desc')).to.eql({
						sortField: '"address"',
						sortMethod: 'DESC',
					});
				});

				it('should return valid sort object with default sort type provided with sort:unknown', () => {
					return expect(SortBy.sortBy('address:unknown')).to.eql({
						sortField: '"address"',
						sortMethod: 'ASC',
					});
				});
			});

			describe('when given as object', () => {
				it('should return object with empty values when sort is empty object', () => {
					return expect(SortBy.sortBy({})).to.eql({ sortField: '', sortMethod: '' });
				});

				it('should return valid sort object if a valid object given', () => {
					return expect(SortBy.sortBy({ address: 1 })).to.eql({
						sortField: '"address"',
						sortMethod: 'ASC',
					});
				});

				it('should return error when keys are not present in options.sortFields', () => {
					return expect(
						SortBy.sortBy({ unkown: 1 }, { sortFields: validSortFieldsArray })
					).to.eql({ error: 'Invalid sort field' });
				});

				it('should return object with string values if single key object is given', () => {
					var result = SortBy.sortBy({ address: 1 });

					expect(result).to.eql({ sortField: '"address"', sortMethod: 'ASC' });

					expect(result.sortField).to.a('String');
					return expect(result.sortMethod).to.a('String');
				});

				it('should return object with array values if multiple keys object is given', () => {
					var result = SortBy.sortBy({ address: 1, publicKey: -1 });

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
