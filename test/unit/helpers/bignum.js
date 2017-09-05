'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var bignum = require('../../../helpers/bignum');
/**
 * Tests required for helpers/bignum.js.
 *
 * Note that this test has no dependancies on any runtime and can be run in issolation.
 */
describe('bignum', function () {

	/**
	 * bignum.toBuffer(opts)
	 */
	describe('toBuffer', function () {

		var testbignum;

		before(function () {
			testbignum = new bignum(1234);
		});

		it('throws an unsupported Buffer representation', function () {
			var opts = 'notmpint';
			expect(testbignum.toBuffer(opts)).eq('Unsupported Buffer representation');
		});

		it('passes uses the string mpint option', function () {
			var opts = 'mpint';
			expect(testbignum.toBuffer(opts)).to.not.be.null;
		});

		it('throws an error because the number is negative', function () {
			var opts = {size:16,endian:'big'};
			var error = false;
			try {
				new bignum(-1234).toBuffer(opts);
			} catch ( err ) {
				error = true;
			}
			expect(error).to.be.true;
		});

		it('passes no options', function () {
			var buffer = testbignum.toBuffer(null);
			expect(buffer).to.not.be.null;
			expect(buffer).to.not.be.instanceof(String);
		});

		it('pass testing with size 1 and endian big', function () {
			var opts = {size:1,endian:'big'};
			var buffer = testbignum.toBuffer(opts);
			expect(buffer).to.not.be.null;
			expect(buffer).to.not.be.instanceof(String);
		});

		it('pass testing with size 1 and endian big', function () {
			var opts = {size:2,endian:'little'};
			var buffer = testbignum.toBuffer(opts);
			expect(buffer).to.not.be.null;
			expect(buffer).to.not.be.instanceof(String);
		});

		it('pass testing with size option', function () {
			var opts = {size:1};
			var buffer = testbignum.toBuffer(opts);
			expect(buffer).to.not.be.null;
			expect(buffer).to.not.be.instanceof(String);
		});

		it('pass testing with endian option', function () {
			var opts = {endian:'big'};
			var buffer = testbignum.toBuffer(opts);
			expect(buffer).to.not.be.null;
			expect(buffer).to.not.be.instanceof(String);
		});
	});

	/**
	 * bignum.fromBuffer()
	 */
	describe('fromBuffer', function () {

		var testbignum;

		before(function () {
			testbignum = new bignum('1234');
		});

		it('pass with no options passed in', function () {
			var result = bignum.fromBuffer(testbignum.toBuffer());
			expect(result).to.not.be.null;
			expect(result + '').eq('1234');
		});

		it('pass with the same options size one endian little', function () {
			var opts = {size:1,endian:'little'};
			var result = bignum.fromBuffer(testbignum.toBuffer(opts), opts);
			expect(result).to.not.be.null;
			expect(result + '').eq('1234');
		});

		it('pass with the same options size two endian big', function () {
			var opts = {size:2,endian:'big'};
			var result = bignum.fromBuffer(testbignum.toBuffer(opts), opts);
			expect(result).to.not.be.null;
			expect(result + '').eq('1234');
		});

		it('pass with just the size option', function () {
			var opts = {size:2};
			var result = bignum.fromBuffer(testbignum.toBuffer(opts), opts);
			expect(result).to.not.be.null;
			expect(result + '').eq('1234');
		});

		it('pass with just the endian option', function () {
			var opts = {endian:'big'};
			var result = bignum.fromBuffer(testbignum.toBuffer(opts), opts);
			expect(result).to.not.be.null;
			expect(result + '').eq('1234');
		});

		it('error because the from and two buffer sizes varry', function () {
			var opts = {size:3, endian:'big'};
			var error = false;
			try {
				bignum.fromBuffer(testbignum.toBuffer({size:4, endian:'big'}), opts);
			} catch ( err ) {
				error = true;
			}
			expect(error).to.be.true;
		});
	});
});
