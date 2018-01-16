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

describe('SortBy', function () {

	describe('sortQueryToJsonSqlFormat', function () {

		var validSortFieldsArray = ['address', 'balance', 'username', 'publicKey'];

		describe('when sortQuery is not a string', function () {

			it('should return an empty object', function () {
				expect(SortBy.sortQueryToJsonSqlFormat(1, validSortFieldsArray)).to.be.an('object').and.to.be.empty;
			});
		});

		describe('when sortQuery is a string', function () {

			it('should return an empty object when sortQuery is an empty string', function () {
				expect(SortBy.sortQueryToJsonSqlFormat('', validSortFieldsArray)).to.be.an('object').and.to.be.empty;
			});

			it('should return {address: 1} (default sort type) when sortQuery contains member of validSortFieldsArray', function () {
				expect(SortBy.sortQueryToJsonSqlFormat('address', validSortFieldsArray)).to.be.an('object').eql({address: 1});
			});

			it('should return an empty object when sortQuery is not a member of validSortFieldsArray', function () {
				expect(SortBy.sortQueryToJsonSqlFormat('unknown', validSortFieldsArray)).to.be.an('object').and.to.be.empty;
			});

			it('should return {address: 1} given "address:asc" ', function () {
				expect(SortBy.sortQueryToJsonSqlFormat('address:asc', validSortFieldsArray)).eql({address: 1});
			});

			it('should return {address: -1} given "address:desc" ', function () {
				expect(SortBy.sortQueryToJsonSqlFormat('address:desc', validSortFieldsArray)).eql({address: -1});
			});

			it('should return an empty object given "address:desc&username:asc" ', function () {
				expect(SortBy.sortQueryToJsonSqlFormat('address:desc&username:asc', validSortFieldsArray)).to.be.an('object').and.to.be.empty;
			});
		});
	});
});
