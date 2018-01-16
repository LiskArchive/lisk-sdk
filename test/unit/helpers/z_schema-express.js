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

var z_schema_express = require('../../../helpers/z_schema-express');

describe('z_schema.express', function () {

	var zSchemaExpressResultFunction;
	var reqSanitizeFunction;
	var reqSanitizeFunctionResult;
	var validZSchema;
	var validReq;
	var validRes;
	var validNextCb;
	var validObject;
	var validIssues;
	var validErr = null;
	var validValid = true;

	before(function () {
		validIssues = validErr ? validErr[0].message + ': ' + validErr[0].path : null;
		validObject = {
			isValid: validValid,
			issues: validIssues
		};
		validZSchema = {
			validate: sinonSandbox.stub()
		};
		validReq = {};
		validRes = null;
		validNextCb = sinonSandbox.spy();
	});

	beforeEach(function () {
		zSchemaExpressResultFunction = z_schema_express(validZSchema);
		reqSanitizeFunction = zSchemaExpressResultFunction(validReq, validRes, validNextCb);
		reqSanitizeFunctionResult = validReq.sanitize('value','schema',validNextCb);
	});

	afterEach(function () {
		validNextCb.reset();
	});

	it('should add a sanitize function to the request-object', function () {
		expect(validReq.sanitize).to.be.a('function');
	});

	it('should call callback', function () {
		expect(validNextCb.calledOnce).to.be.true;
	});

	describe('sanitize', function () {

		describe('when the schema is invalid', function () {

			before(function () {
				validErr = [{'message' : 'message','path': 'a/path'}];
				validValid = false;
				validObject = {
					isValid: false,
					issues: validErr
				};
				validZSchema.validate.returns(validObject);
			});

			it('should return invalid object', function () {
				expect(reqSanitizeFunctionResult).to.eq(validObject);
			});
		});

		describe('when the schema is valid', function () {

			before(function () {
				validErr = null;
				validValid = true;
				validObject = {
					isValid: validValid,
					issues: validIssues
				};
				validZSchema.validate.returns(validObject);
			});

			it('should return valid object', function () {
				expect(reqSanitizeFunctionResult).to.eq(validObject);
			});
		});
	});
});
