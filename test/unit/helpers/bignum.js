'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var bignum = require('../../../helpers/bignum');

describe('bignum helper', function () {

	var SEED = '782910138827292261791972728324982';
	var BUFFER_SEED = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
	var BUFFER_SEED_SIZE_TWO = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
	var BUFFER_SEED_MPINT = Buffer.from('AAAADiaZtxg1iehH57OadUN2', 'base64');

	describe('toBuffer', function () {

		var testbignum;

		beforeEach(function () {
			testbignum = new bignum(SEED);
		});

		function standardExpect (buffer, shouldEqual) {
			expect(buffer.equals(shouldEqual)).to.be.true;
		}

		describe('when type of opts = string', function () {

			describe('when opts != mpint"', function () {

				it('should return "Unsupported Buffer Representation"', function () {
					expect(testbignum.toBuffer('notmpint')).to.equal('Unsupported Buffer representation');
				});
			});

			describe('when opts = mpint', function () {

				it('should return a buffer = BUFFER_SEED_MPINT', function () {
					standardExpect(testbignum.toBuffer('mpint'), BUFFER_SEED_MPINT);
				});
			});

			describe('when Bignumber is a negative number', function () {

				it('should throw error with "Converting negative numbers to Buffers not supported yet"', function () {
					expect(
						function () {
							new bignum('-' + SEED).toBuffer({size: 16, endian: 'big'});
						}
					).to.throw(
						Error,
						/Converting negative numbers to Buffers not supported yet/);
				});
			});

			describe('when opts = undefined', function () {

				it('should return a buffer = BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer(null), BUFFER_SEED);
				});
			});

			describe('when passed opts.size = 1 and opts.endian = big', function () {

				it('should return a buffer = BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer({size: 1, endian: 'big'}), BUFFER_SEED);
				});
			});

			describe('when passed opts.size = 2 and opts.endian = little', function () {

				it('should return a buffer = BUFFER_SEED_SIZE_TWO', function () {
					standardExpect(testbignum.toBuffer({size: 2, endian: 'little'}), BUFFER_SEED_SIZE_TWO);
				});
			});

			describe('when passed only opts.size', function () {

				it('should return a buffer = BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer({size: 1}), BUFFER_SEED);
				});
			});

			describe('when passed only opts.endian = big', function () {

				it('should return a buffer = BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer({endian: 'big'}), BUFFER_SEED);
				});
			});

			describe('when passed only opts.endian = little', function () {

				it('should return a buffer = BUFFER_SEED', function () {
					standardExpect(testbignum.toBuffer({endian: 'little'}), BUFFER_SEED);
				});
			});
		});
	});

	describe('fromBuffer', function () {

		function standardExpect (result) {
			expect(result.eq(new bignum(SEED))).to.be.true;
		}

		describe('when passed a buffer with opts = undefined', function () {

			it('should return a bignum = BUFFER_SEED', function () {
				standardExpect(bignum.fromBuffer(BUFFER_SEED));
			});
		});

		describe('when passed a buffer with opts = {}', function () {

			it('should return a bignum = BUFFER_SEED', function () {
				standardExpect(bignum.fromBuffer(BUFFER_SEED));
			});
		});

		describe('when passed a buffer not divisible by the size option', function () {

			it('should return error = "Buffer length (14) must be a multiple of size (3)"', function () {
				expect(
					function () {
						bignum.fromBuffer(BUFFER_SEED, {size: 3, endian: 'big'});
					}
				).to.throw(
					Error,
					'Buffer length (14) must be a multiple of size (3)'
				);
			});
		});

		describe('when passed a buffer opts.size = 2 and opts.endian = little', function () {

			it('should return a bignum = BUFFER_SEED', function () {
				standardExpect(bignum.fromBuffer(BUFFER_SEED_SIZE_TWO, {size: 2, endian: 'little'}));
			});
		});

		describe('when passed a buffer with size = 2 and endian = big', function () {

			it('should return a bignum = BUFFER_SEED', function () {
				standardExpect(bignum.fromBuffer(BUFFER_SEED, {size: 2, endian: 'big'}));
			});
		});

		describe('when passed a buffer with size = 2', function () {

			it('should return a bignum = BUFFER_SEED', function () {
				standardExpect(bignum.fromBuffer(BUFFER_SEED, {size: 2}));
			});
		});

		describe('when passed a buffer with endian = big', function () {

			it('should return a bignum = BUFFER_SEED', function () {
				standardExpect(bignum.fromBuffer(BUFFER_SEED, {endian: 'big'}));
			});
		});
	});
});
