'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var OrderBy = require('../../../helpers/orderBy');

describe('OrderBy', function () {

	var sortFields = ['afield'];

	describe('when orderBy = null', function () {
		var orderBy = OrderBy(null, {sortFields: sortFields});
		it('should return sortField = null', function () {
			expect(orderBy.sortField).to.be.null;
		});
		it('should return sortMethod = null', function () {
			expect(orderBy.sortMethod).to.be.null;
		});
		it('should return error = undefined', function () {
			expect(orderBy.error).to.be.undefined;
		});
	});

	describe('when desc is in lowercase', function () {
		it('converts desc to uppercase', function () {
			var orderBy = OrderBy('afield:desc', {sortFields: sortFields});
			expect(orderBy.sortMethod).to.equal('DESC');
		});
	});

	describe('when asc is in lowercase', function () {
		it('converts asc to uppercase', function () {
			var orderBy = OrderBy('afield:asc',{sortFields: sortFields});
			expect(orderBy.sortMethod).to.equal('ASC');
		});
	});

	describe('quoteField', function () {
		it('defaults to true', function () {
			var orderBy = OrderBy('afield:desc',{sortFields: sortFields});
			expect(orderBy.sortField).to.equal('\"afield\"');
		});

		it('set to true', function () {
			var orderBy = OrderBy('afield:desc',{sortFields: sortFields, quoteField: true});
			expect(orderBy.sortField).to.equal('\"afield\"');
		});

		it('set to false', function () {
			var orderBy = OrderBy('afield:desc',{sortFields: sortFields, quoteField: false});
			expect(orderBy.sortField).to.equal('afield');
		});
	});

	describe('prefix search field', function () {
		it('uses string as the var', function () {
			var orderBy = OrderBy('afield:desc',{sortFields: sortFields,fieldPrefix: 'b_', quoteField: false});
			expect(orderBy.sortField).to.equal('b_afield');
		});

		it('uses a function as the var', function () {
			var orderBy = OrderBy('afield:desc',
				{
					sortFields: sortFields,
					quoteField: false,
				 	fieldPrefix: function (sortfield) {return ('func_' + sortfield);}
				});
			expect(orderBy.sortField).to.equal('func_afield');
		});
	});

	describe('invalid sort field', function () {
		it('returns an error of Invalid sort field', function () {
			var orderBy = OrderBy('notvalid:desc',{sortFields: sortFields});
			expect(orderBy.error).to.equal('Invalid sort field');
		});
	});
});
