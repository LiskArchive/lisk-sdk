'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var bignum = require('../../../helpers/bignum');

describe('bignum helper', function () {

	var SEED = '782910138827292261791972728324982';
	var BUFFER_SEED = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
	var BUFFER_SEED_SIZE_TWO = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
	var BUFFER_SEED_MPINT = Buffer.from('AAAADiaZtxg1iehH57OadUN2', 'base64');

	describe('#toBuffer', function () {

		var testbignum;

		beforeEach(function () {
			testbignum = new bignum(SEED);
		});

		function standardExpect (buffer, shouldEqual) {
			expect(buffer.equals(shouldEqual)).to.be.true;
		}

		describe('Given buffer options', function () {

			describe('When passed an unsupported buffer (notmpint)', function () {
				it('Then returns error: Unsupported Buffer Representation', function () {
					expect(testbignum.toBuffer('notmpint')).to.equal('Unsupported Buffer representation');
				});
			});

			describe('When passed a supported buffer option (mpint)', function () {
				it('Then returns a buffer equal to BUFFER_SEED_MPINT', function () {
					standardExpect(testbignum.toBuffer('mpint'), BUFFER_SEED_MPINT);
				});
			});

			describe('When passed a negative number', function () {
				it('Then returns error: Converting negative numbers to Buffers not supported yet', function () {
					expect(
						function (){new bignum('-' + SEED).toBuffer({size:16,endian:'big'});}
					).to.throw(
						Error,
						/Converting negative numbers to Buffers not supported yet/
					);
				});
			});

			describe('When passed no options', function () {
				it('Then testbignum should equal BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer(null), BUFFER_SEED);
				});
			});

			describe('When passed size 1 and big endian options', function () {
				it('Then testbignum should equal BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer({size:1,endian:'big'}), BUFFER_SEED);
				});
			});

			describe('When passed size 2 buffer and little endian', function () {
				it('Then testbignum should equal BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer({size:2,endian:'little'}), BUFFER_SEED_SIZE_TWO);
				});
			});

			describe('When passed only a size option', function () {
				it('Then testbignum should equal BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer({size:1}), BUFFER_SEED);
				});
			});

			describe('When passed only big endian option', function () {
				it('Then testbignum should equal BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer({endian:'big'}), BUFFER_SEED);
				});
			});

			describe('When passed only little endian option', function () {
				it('Then testbignum should equal BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer({endian:'little'}), BUFFER_SEED);
				});
			});
		});
	});

	describe('#fromBuffer', function () {

		function standardExpect (result) {
			expect(result.eq(new bignum(SEED))).to.be.true;
		};

		describe('Given a buffer', function () {

			describe('When passed a buffer with no options', function () {
				it('Then bignum should equal BUFFER_SEED', function () {
					standardExpect(bignum.fromBuffer(BUFFER_SEED));
				});
			});

			describe('When passed a buffer with size 2 and endian little', function () {
				it('Then bignum should equal BUFFER_SEED', function () {
					standardExpect(bignum.fromBuffer(BUFFER_SEED_SIZE_TWO, {size:2,endian:'little'}));
				});
			});

			describe('When passed a buffer with size 2 and endian big', function () {
				it('Then bignum should equal BUFFER_SEED', function () {
					standardExpect(bignum.fromBuffer(BUFFER_SEED, {size:2,endian:'big'}));
				});
			});

			describe('When passed a buffer with size 2', function () {
				it('Then bignum should equal BUFFER_SEED', function () {
					standardExpect(bignum.fromBuffer(BUFFER_SEED, {size:2}));
				});
			});

			describe('When passed a buffer with endian big', function () {
				it('Then bignum should equal BUFFER_SEED', function () {
					standardExpect(bignum.fromBuffer(BUFFER_SEED, {endian:'big'}));
				});
			});

			describe('When passed a buffer not divisible by the size option', function () {
				it('Then returns error: Buffer length (14) must be a multiple of size (3)', function () {
					expect(
						function (){bignum.fromBuffer(BUFFER_SEED, {size:3, endian:'big'});}
					).to.throw(
						Error,
						'Buffer length (14) must be a multiple of size (3)'
					);
				});
			});
		});
	});
});
