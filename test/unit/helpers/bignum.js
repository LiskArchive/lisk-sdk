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
	 * Our seed number when creating and evaluating bignum.
	 */
	const SEED = 1234;

	/**
	 * bignum.toBuffer(opts)
	 */
	describe('toBuffer', function () {

		var testbignum;

		function standardExpect (buffer) {
			expect(buffer).to.not.be.null;
			expect(buffer).to.not.be.instanceof(String);
		}

		before(function () {
			testbignum = new bignum(SEED);
		});

		it('throws an unsupported Buffer representation', function () {
			expect(testbignum.toBuffer('notmpint')).eq('Unsupported Buffer representation');
		});

		it('passes uses the string mpint option', function () {
			expect(testbignum.toBuffer('mpint')).to.not.be.null;
		});

		it('throws an error because the number is negative', function () {
			var error = false;
			try {
				new bignum(-1234).toBuffer({size:16,endian:'big'});
			} catch ( err ) {
				error = true;
			}
			expect(error).to.be.true;
		});

		it('passes no options', function () {
			var buffer = testbignum.toBuffer(null);
			standardExpect(buffer);
		});

		it('pass testing with size 1 and endian big', function () {
			var buffer = testbignum.toBuffer({size:1,endian:'big'});
			standardExpect(buffer);
		});

		it('pass testing with size 1 and endian big', function () {
			var buffer = testbignum.toBuffer({size:2,endian:'little'});
			standardExpect(buffer);
		});

		it('pass testing with size option', function () {
			var buffer = testbignum.toBuffer({size:1});
			standardExpect(buffer);
		});

		it('pass testing with endian option', function () {
			var buffer = testbignum.toBuffer({endian:'big'});
			standardExpect(buffer);
		});
	});

	/**
	 * bignum.fromBuffer()
	 */
	describe('fromBuffer', function () {

		var testbignum;

		function standardExpect (result) {
			expect(result).to.not.be.null;
			expect(result + '').eq(SEED + '');
		}

		before(function () {
			testbignum = new bignum(SEED);
		});

		it('pass with no options passed in', function () {
			var result = bignum.fromBuffer(testbignum.toBuffer());
			standardExpect(result);
		});

		it('pass with the same options size one endian little', function () {
			var opts = {size:1,endian:'little'};
			var result = bignum.fromBuffer(testbignum.toBuffer(opts), opts);
			standardExpect(result);
		});

		it('pass with the same options size two endian big', function () {
			var opts = {size:2,endian:'big'};
			var result = bignum.fromBuffer(testbignum.toBuffer(opts), opts);
			standardExpect(result);
		});

		it('pass with just the size option', function () {
			var opts = {size:2};
			var result = bignum.fromBuffer(testbignum.toBuffer(opts), opts);
			standardExpect(result);
		});

		it('pass with just the endian option', function () {
			var opts = {endian:'big'};
			var result = bignum.fromBuffer(testbignum.toBuffer(opts), opts);
			standardExpect(result);
		});

		it('error because the from and two buffer sizes varry', function () {
			var error = false;
			try {
				bignum.fromBuffer(testbignum.toBuffer({size:4, endian:'big'}), {size:3, endian:'big'});
			} catch ( err ) {
				error = true;
			}
			expect(error).to.be.true;
		});
	});
});
