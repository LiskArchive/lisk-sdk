'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

var OrderBy = require('../../../helpers/orderBy');

describe('OrderBy', function () {

	describe('sortQueryToJsonSqlFormat', function () {

		var validSortFieldsArray = ['address', 'balance', 'username', 'publicKey'];

		describe('when sortQuery is not a string', function () {

			it('should return an empty object', function () {
				expect(OrderBy.sortQueryToJsonSqlFormat(1, validSortFieldsArray)).to.be.an('object').and.to.be.empty;
			});
		});

		describe('when sortQuery is a string', function () {

			it('should return an empty object when sortQuery is an empty string', function () {
				expect(OrderBy.sortQueryToJsonSqlFormat('', validSortFieldsArray)).to.be.an('object').and.to.be.empty;
			});

			it('should return {address: 1} (default sort type) when sortQuery contains member of validSortFieldsArray', function () {
				expect(OrderBy.sortQueryToJsonSqlFormat('address', validSortFieldsArray)).to.be.an('object').eql({address: 1});
			});

			it('should return an empty object when sortQuery is not a member of validSortFieldsArray', function () {
				expect(OrderBy.sortQueryToJsonSqlFormat('unknown', validSortFieldsArray)).to.be.an('object').and.to.be.empty;
			});

			it('should return {address: 1} given "address:asc" ', function () {
				expect(OrderBy.sortQueryToJsonSqlFormat('address:asc', validSortFieldsArray)).eql({address: 1});
			});

			it('should return {address: -1} given "address:desc" ', function () {
				expect(OrderBy.sortQueryToJsonSqlFormat('address:desc', validSortFieldsArray)).eql({address: -1});
			});

			it('should return an empty object given "address:desc&username:asc" ', function () {
				expect(OrderBy.sortQueryToJsonSqlFormat('address:desc&username:asc', validSortFieldsArray)).to.be.an('object').and.to.be.empty;
			});
		});

	});
});
