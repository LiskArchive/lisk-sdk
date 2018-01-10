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

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

var inserts = require('../../../helpers/inserts');

describe('inserts', function () {

	describe('Inserts', function () {

		var insertsResult;
		var validRecord;
		var validValues;
		var validConcat;
		var validCoughtException;

		before(function () {
			validRecord = {
				table: 'table',
				fields: []
			};
			validValues = [];
			validConcat = null;
		});

		describe('when Inserts throws', function () {

			describe('when record = null', function () {

				before(function () {
					validRecord = null;
				});

				it('should throw "Inserts: Invalid record argument"', function () {
					expect(function () {
						inserts(validRecord, validValues, validConcat);
					}).throws('Inserts: Invalid record argument');
				});
			});

			describe('when record is defined and record.table is undefined', function () {

				before(function () {
					validRecord = {};
				});

				it('should throw "Inserts: Invalid record argument"', function () {
					expect(function () {
						inserts(validRecord, validValues, validConcat);
					}).throws('Inserts: Invalid record argument');
				});
			});

			describe('when record and record.table are defined and record.fields is undefined', function () {

				before(function () {
					validRecord = {
						table: 'table'
					};
				});

				it('should throw "Inserts: Invalid record argument"', function () {
					expect(function () {
						inserts(validRecord, validValues, validConcat);
					}).throws('Inserts: Invalid record argument');
				});
			});

			describe('when values is undefined', function () {

				before(function () {
					validRecord = {
						table: 'table',
						fields: []
					};
					validValues = null;
				});

				it('should throw "Inserts: Invalid values argument"', function () {
					expect(function () {
						inserts(validRecord, validValues, validConcat);
					}).throws('Inserts: Invalid values argument');
				});
			});
		});

		describe('when Inserts does not throw', function () {

			var insertsNamedTemplateResult;

			beforeEach(function () {
				insertsResult = new inserts(validRecord, validValues, validConcat);
				insertsNamedTemplateResult = insertsResult.namedTemplate();
			});

			describe('when inserts.namedTemplate is called', function () {

				var expectedString;

				before(function () {
					validValues = [];
					expectedString = '${field1},${field2}';
					validRecord.fields = [
						'field1',
						'field2'
					];
				});

				it('should return expected string', function () {
					expect(insertsResult._template).to.eq(expectedString);
				});

				it('should set Insert._template to the result of namedTemplate', function () {
					expect(insertsNamedTemplateResult).to.eq(expectedString);
				});
			});
		});
	});
});
