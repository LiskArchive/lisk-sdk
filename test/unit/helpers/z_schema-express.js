'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

var z_schema_express = require('../../../helpers/z_schema-express');

describe('z_schema.express', function () {

	it('returns true because the schema is valid', function () {
		var z_schema = {
			'validate' : function (value, schema, cb) {
				cb(null, true);
			}
		};
    
		var req = {};
		var reqcb = function () {
			req.sanitize(
				'value',
				'schema',
				function (first, isvalid, value) {
					expect(first).to.be.null;
					expect(isvalid.isValid).to.be.true;
					expect(isvalid.issues).to.be.null;
					expect(value).to.equal('value');
				}
			);
		};
		z_schema_express (z_schema)(req, {}, reqcb);
	});

	it('returns false because the schema is not valid', function () {
		var z_schema = {
			'validate' : function (value, schema, cb) {
				cb([{'message' : 'message','path': 'a/path'}], false);
			}
		};

		var req = {};
		var reqcb = function () {
			req.sanitize(
				'value',
				'schema',
				function (first, isvalid, value) {
					expect(first).to.be.null;
					expect(isvalid.isValid).to.be.false;
					expect(isvalid.issues).to.equal('message: a/path');
					expect(value).to.equal('value');
				}
			);
		};
		z_schema_express (z_schema)(req, {}, reqcb);
	});
});
