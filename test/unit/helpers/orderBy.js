'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var OrderBy = require('../../../helpers/orderBy');

describe('OrderBy', function () {

	var sortFields = ['afield'];

	it('no order by option passed', function () {
		var orderBy = OrderBy(null, {sortFields: sortFields});
		expect(orderBy.sortField).to.be.null;
		expect(orderBy.sortMethod).to.be.null;
		expect(orderBy.error).to.be.undefined;
	});

	it('converts desc to uppercase', function () {
		var orderBy = OrderBy('afield:desc', {sortFields: sortFields});
		expect(orderBy.sortMethod).to.equal('DESC');
	});

	it('converts asc to uppercase', function () {
		var orderBy = OrderBy('afield:asc',{sortFields: sortFields});
		expect(orderBy.sortMethod).to.equal('ASC');
	});

	it('defaults quoteField to true', function () {
		var orderBy = OrderBy('afield:desc',{sortFields: sortFields});
		expect(orderBy.sortField).to.equal('\"afield\"');
	});

	it('sets quoteField to true', function () {
		var orderBy = OrderBy('afield:desc',{sortFields: sortFields, quoteField: true});
		expect(orderBy.sortField).to.equal('\"afield\"');
	});

	it('sets quoteField to false', function () {
		var orderBy = OrderBy('afield:desc',{sortFields: sortFields, quoteField: false});
		expect(orderBy.sortField).to.equal('afield');
	});

	it('adds field prefix b_', function () {
		var orderBy = OrderBy('afield:desc',{sortFields: sortFields,fieldPrefix: 'b_', quoteField: false});
		expect(orderBy.sortField).to.equal('b_afield');
	});

	it('adds field prefix func_ by a function', function () {
		var orderBy = OrderBy('afield:desc',
			{
				sortFields: sortFields,
				quoteField: false,
			 	fieldPrefix: function (sortfield) {return ('func_' + sortfield);}
			});
		expect(orderBy.sortField).to.equal('func_afield');
	});

	it('not valid sort field', function () {
		var orderBy = OrderBy('notvalid:desc',{sortFields: sortFields});
		expect(orderBy.error).to.equal('Invalid sort field');
	});
});
