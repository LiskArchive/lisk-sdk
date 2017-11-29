'use strict';

var expect = require('chai').expect;
var bignum = require('../../../helpers/bignum');

describe('BigNumber', function () {

	var validBuf;
	var validOpts;
	var bignumResult;
	var validSeed;
	var validBufferSeed;
	var validBufferSeedSize2;
	var validBufferSeedMpint;

	describe('fromBuffer', function () {

		before(function () {
			validSeed = '782910138827292261791972728324982';
			validBufferSeed = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
			validBufferSeedSize2 = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
		});

		describe('when it throws an error', function () {

			describe('when passed a buffer not divisible by the size option', function () {

				before(function () {
					validOpts = {
						size: 3,
						endian: 'big'
					};
					validBuf = validBufferSeed;
				});

				it('should throw RangeError', function () {
					expect(function () {
						bignum.fromBuffer(validBuf, validOpts);
					}).throws('Buffer length (14) must be a multiple of size (3)');
				});
			});
		});

		describe('when it does not throw an error', function () {

			before(function () {
				validBuf = validBufferSeed;
				validOpts = {};
			});

			beforeEach(function () {
				bignumResult = bignum.fromBuffer(validBuf, validOpts);
			});

			describe('when opts does not have a size attribute', function () {

				it('should set opts to an empty object', function () {
					expect(bignumResult).to.eql(new bignum(validSeed));
				});
			});

			describe('when opts have a size attribute', function () {

				describe('when opts.size = 2 and endian = little', function () {

					before(function () {
						validOpts = {
							size: 2,
							endian: 'little'
						};
						validBuf = validBufferSeedSize2;
					});

					it('should equal BUFFER_SEED', function () {
						expect(bignumResult).to.eql(new bignum(validSeed));
					});
				});

				describe('when opts.size = 2 and endian = big', function () {

					before(function () {
						validOpts = {
							size: 2,
							endian: 'big'
						};
						validBuf = validBufferSeed;
					});

					it('should equal BUFFER_SEED', function () {
						expect(bignumResult).to.eql(new bignum(validSeed));
					});
				});

				describe('when endian = big', function () {

					before(function () {
						validOpts = {
							endian: 'big'
						};
						validBuf = validBufferSeed;
					});

					it('should equal BUFFER_SEED', function () {
						expect(bignumResult).to.eql(new bignum(validSeed));
					});
				});
			});
		});
	});

	describe('toBuffer', function () {

		before(function () {
			validSeed = '782910138827292261791972728324982';
			validBufferSeed = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
			validBufferSeedSize2 = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
			validBufferSeedMpint = Buffer.from('AAAADiaZtxg1iehH57OadUN2', 'base64');
		});

		describe('when it throws an error', function () {

			describe('when opts equal an unsupported string', function () {

				before(function () {
					validOpts = 'notmpint';
				});

				beforeEach(function () {
					bignumResult = new bignum(validSeed);
				});

				it('should throw RangeError', function () {
					expect(bignumResult.toBuffer(validOpts)
					).to.eq('Unsupported Buffer representation');
				});
			});

			describe('when Bignumber is negative', function () {

				before(function () {
					validOpts = {};
					validSeed = '-782910138827292261791972728324982';
				});

				beforeEach(function () {
					bignumResult = new bignum(validSeed);
				});

				it('should throw Error: "Converting negative numbers to Buffers not supported yet', function () {
					expect(function () {bignumResult.toBuffer(validOpts);}).throws('Converting negative numbers to Buffers not supported yet');
				});
			});
		});

		describe('when it does not throw an error', function () {

			var toBufferResult;

			before(function () {
				validSeed = '782910138827292261791972728324982';
			});

			beforeEach(function () {
				bignumResult = new bignum(validSeed);
				toBufferResult = bignumResult.toBuffer(validOpts);
			});

			describe('when passed no options', function () {

				before(function () {
					validOpts = null;
				});

				it('should return validBufferSeed', function () {
					expect(toBufferResult).to.eql(validBufferSeed);
				});
			});

			describe('when passed size 1 and big endian options', function () {

				before(function () {
					validOpts = {size:1,endian:'big'};
				});

				it('should return validBufferSeed', function () {
					expect(toBufferResult).to.eql(validBufferSeed);
				});
			});

			describe('when passed size 2 buffer and little endian', function () {

				before(function () {
					validOpts = {size:2,endian:'little'};
				});

				it('should return validBufferSeedSize2', function () {
					expect(toBufferResult).to.eql(validBufferSeedSize2);
				});
			});

			describe('when passed only a size option', function () {

				before(function () {
					validOpts = {size:1};
				});

				it('should return validBufferSeed', function () {
					expect(toBufferResult).to.eql(validBufferSeed);
				});
			});

			describe('when passed only big endian option', function () {

				before(function () {
					validOpts = {endian:'big'};
				});

				it('should return validBufferSeed', function () {
					expect(toBufferResult).to.eql(validBufferSeed);
				});
			});

			describe('when passed only little endian option', function () {

				before(function () {
					validOpts = {endian:'little'};
				});

				it('should return validBufferSeed', function () {
					expect(toBufferResult).to.eql(validBufferSeed);
				});
			});

			describe('when passed a supported buffer option (mpint)', function () {

				before(function () {
					validOpts = 'mpint';
				});

				it('should return validBufferSeedMpint', function () {
					expect(toBufferResult).to.eql(validBufferSeedMpint);
				});
			});
		});
	});
});
