'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

var inserts = require('../../../helpers/inserts');

describe('inserts', function () {

	function standardExpect (fn, type) {
		expect(fn).to.throw('Inserts: Invalid ' + type + ' argument');
	}

	describe('when record is null', function () {

		it('should throw error');

		standardExpect(function () {new inserts(null, null, null);}, 'record');
	});

	describe('when record.table is null', function () {

		it('should throw error');

		standardExpect(function () {new inserts({}, null, null);}, 'record');
	});

	describe('when record.fields is null', function () {

		it('should throw error');

		standardExpect(function () {new inserts({table: 'atable'}, null, null);}, 'record');
	});

	describe('values var is null', function () {

		it('should throw error');

		standardExpect(function () {new inserts({table: 'atable', fields: []}, null, null);}, 'values');
	});

	describe('validate the template function', function () {

		describe('when concatinates  = false with a single argument', function () {
			var rinserts = new inserts({table: 'atable', fields: ['id']}, [], false);
			expect(rinserts.template()).to.equal('INSERT INTO "atable"("id") VALUES (${id})');
		});

		describe('when concatinates = true with a single argument', function () {
			var rinserts = new inserts({table: 'atable', fields: ['id']}, [], true);
			expect(rinserts.template()).to.equal('INSERT INTO "atable"("id") VALUES $1');
		});

		describe('when concatinates = false with multiple argument', function () {
			var rinserts = new inserts({table: 'atable', fields: ['id', 'another']}, [], false);
			expect(rinserts.template()).to.equal('INSERT INTO "atable"("id","another") VALUES (${id},${another})');
		});

		describe('when concatinates = true with multiple argument', function () {
			var rinserts = new inserts({table: 'atable', fields: ['id', 'another']}, [], true);
			expect(rinserts.template()).to.equal('INSERT INTO "atable"("id","another") VALUES $1');
		});
	});

	it('should validate the formatDBType function', function () {

		var rinserts = new inserts({table: 'atable', fields: ['id']}, [1], false);
		expect(rinserts.formatDBType()).to.equal('(${id})');
	});
});
