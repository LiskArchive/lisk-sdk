'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

var inserts = require('../../../helpers/inserts');

describe('inserts', function () {

	describe('fails validation', function () {

		function standardExpect (fn, type) {
			expect(fn).to.throw('Inserts: Invalid ' + type + ' argument');
		}

		it('record var is null', function () {
			standardExpect(function () {new inserts(null, null, null);}, 'record');
		});

		it('record.table var is null', function () {
			standardExpect(function () {new inserts({}, null, null);}, 'record');
		});

		it('record.fields var is null', function () {
			standardExpect(function () {new inserts({table: 'atable'}, null, null);}, 'record');
		});

		it('values var is null', function () {
			standardExpect(function () {new inserts({table: 'atable', values: [], fields: []}, null, null);}, 'values');
		});
	});

	describe('validate the template function', function () {
		it('concatinates  = false with a single argument', function () {
			var rinserts = new inserts({table: 'atable', values:[], fields: ['id']}, [], false);
			expect(rinserts.template()).to.equal('INSERT INTO "atable"("id") VALUES (${id})');
		});
		it('concatinates = true with a single argument', function () {
			var rinserts = new inserts({table: 'atable', values:[], fields: ['id']}, [], true);
			expect(rinserts.template()).to.equal('INSERT INTO "atable"("id") VALUES $1');
		});
		it('concatinates = false with multiple argument', function () {
			var rinserts = new inserts({table: 'atable', values:[], fields: ['id', 'another']}, [], false);
			expect(rinserts.template()).to.equal('INSERT INTO "atable"("id","another") VALUES (${id},${another})');
		});
		it('concatinates = true with multiple argument', function () {
			var rinserts = new inserts({table: 'atable', values:[], fields: ['id', 'another']}, [], true);
			expect(rinserts.template()).to.equal('INSERT INTO "atable"("id","another") VALUES $1');
		});
	});

	describe('validate the formatDBType function', function () {
		it('single args', function () {
			var rinserts = new inserts({table: 'atable', values:[], fields: ['id']}, [1], false);
			expect(rinserts.formatDBType()).to.equal('(${id})');
		});
	});
});
