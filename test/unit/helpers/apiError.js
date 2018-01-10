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
var express = require('express');
var ApiError = require('../../../helpers/apiError.js');

describe('helpers/apiError', function () {

	var apiError;
	var validErrorMessage;
	var validErrorCode;

	beforeEach(function () {
		validErrorMessage = 'Valid error message';
		validErrorCode = 501;
		apiError = new ApiError(validErrorMessage, validErrorCode);
	});

	describe('constructor', function () {

		it('should be an Error instance', function () {
			expect(apiError).to.have.instanceOf(Error);
		});

		it('should assign field message = "Valid error message"', function () {
			expect(apiError).to.have.property('message').equal(validErrorMessage);
		});

		it('should assign field code = 501', function () {
			expect(apiError).to.have.property('code').equal(validErrorCode);
		});
	});

	describe('toJson', function () {

		it('should return Object type result', function () {
			expect(apiError.toJson()).to.be.an('Object');
		});

		it('should return result containing message = "Valid error message"', function () {
			expect(apiError.toJson()).to.have.property('message').equal(validErrorMessage);
		});
	});
});
