'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var bignum = require('../../../helpers/bignum');

describe('bignum', function () {

	var SEED = '782910138827292261791972728324982';
	var BUFFER_SEED = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
	var BUFFER_SEED_SIZE_TWO = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
	var BUFFER_SEED_MPINT = Buffer.from('AAAADiaZtxg1iehH57OadUN2', 'base64');

	describe('toBuffer', function () {

		var testbignum;

		function standardExpect (buffer, shouldEqual) {
			expect(buffer.equals(shouldEqual)).to.be.true;
		}

		beforeEach(function () {
			testbignum = new bignum(SEED);
		});

		it('throws an unsupported Buffer representation', function () {
			expect(testbignum.toBuffer('notmpint')).to.equal('Unsupported Buffer representation');
		});

		it('passes uses the string mpint option', function () {
			standardExpect(testbignum.toBuffer('mpint'), BUFFER_SEED_MPINT);
		});

		it('throws an error because the number is negative', function () {
			expect(
				function (){new bignum('-' + SEED).toBuffer({size:16,endian:'big'});}
			).to.throw(
				Error,
				/Converting negative numbers to Buffers not supported yet/
			);
		});

		it('passes without passing any options', function () {
			standardExpect(testbignum.toBuffer(null), BUFFER_SEED);
		});

		it('pass testing with size 1 and endian big', function () {
			standardExpect(testbignum.toBuffer({size:1,endian:'big'}), BUFFER_SEED);
		});

		it('pass testing with size 2 and endian little', function () {
			standardExpect(testbignum.toBuffer({size:2,endian:'little'}), BUFFER_SEED_SIZE_TWO);
		});

		it('pass testing with size only option', function () {
			standardExpect(testbignum.toBuffer({size:1}), BUFFER_SEED);
		});

		it('pass testing with endian only option big', function () {
			standardExpect(testbignum.toBuffer({endian:'big'}), BUFFER_SEED);
		});

		it('pass testing with endian only option little', function () {
			standardExpect(testbignum.toBuffer({endian:'little'}), BUFFER_SEED);
		});
	});

	describe('fromBuffer', function () {

		function standardExpect (result) {
			expect(result.eq(new bignum(SEED))).to.be.true;
		}

		it('passes without passing any options', function () {
			standardExpect(bignum.fromBuffer(BUFFER_SEED));
		});

		it('pass with the same options of size two and endian little', function () {
			standardExpect(bignum.fromBuffer(BUFFER_SEED_SIZE_TWO, {size:2,endian:'little'}));
		});

		it('pass with the same options of size two and endian big', function () {
			standardExpect(bignum.fromBuffer(BUFFER_SEED, {size:2,endian:'big'}));
		});

		it('pass with the size option only', function () {
			standardExpect(bignum.fromBuffer(BUFFER_SEED, {size:2}));
		});

		it('pass with the endian option only', function () {
			standardExpect(bignum.fromBuffer(BUFFER_SEED, {endian:'big'}));
		});

		it('throw an error if the options provide an incorrect size', function () {
			expect(
				function (){bignum.fromBuffer(BUFFER_SEED, {size:3, endian:'big'});}
			).to.throw(
				Error,
				'Buffer length (14) must be a multiple of size (3)'
			);
		});
	});
});
