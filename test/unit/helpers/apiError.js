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
