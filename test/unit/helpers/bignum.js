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

var Bignum = require('../../../helpers/bignum.js');

describe('BigNumber', () => {
	var validBuf;
	var validOpts;
	var bignumResult;
	var validSeed;
	var validBufferSeed;
	var validBufferSeedSize2;
	var validBufferSeedMpint;

	describe('exponential values', () => {
		it('should not return exponential value for a long number', () => {
			const amount = '10000000000000000000000000000000000000000000000000000';
			const value = new Bignum(amount).toString();
			return expect(value.match(/[e]/i)).to.be.null;
		});
	});

	describe('fromBuffer', () => {
		before(done => {
			validSeed = '782910138827292261791972728324982';
			validBufferSeed = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
			validBufferSeedSize2 = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
			done();
		});

		describe('when it throws an error', () => {
			describe('when passed a buffer not divisible by the size option', () => {
				before(done => {
					validOpts = {
						size: 3,
						endian: 'big',
					};
					validBuf = validBufferSeed;
					done();
				});

				it('should throw RangeError', done => {
					expect(() => {
						Bignum.fromBuffer(validBuf, validOpts);
					}).throws('Buffer length (14) must be a multiple of size (3)');
					done();
				});
			});
		});

		describe('when it does not throw an error', () => {
			before(done => {
				validBuf = validBufferSeed;
				validOpts = {};
				done();
			});

			beforeEach(done => {
				bignumResult = Bignum.fromBuffer(validBuf, validOpts);
				done();
			});

			describe('when opts does not have a size attribute', () => {
				it('should set opts to an empty object', done => {
					expect(bignumResult).to.eql(new Bignum(validSeed));
					done();
				});
			});

			describe('when opts have a size attribute', () => {
				describe('when opts.size = 2 and endian = little', () => {
					before(done => {
						validOpts = {
							size: 2,
							endian: 'little',
						};
						validBuf = validBufferSeedSize2;
						done();
					});

					it('should equal BUFFER_SEED', done => {
						expect(bignumResult).to.eql(new Bignum(validSeed));
						done();
					});
				});

				describe('when opts.size = 2 and endian = big', () => {
					before(done => {
						validOpts = {
							size: 2,
							endian: 'big',
						};
						validBuf = validBufferSeed;
						done();
					});

					it('should equal BUFFER_SEED', done => {
						expect(bignumResult).to.eql(new Bignum(validSeed));
						done();
					});
				});

				describe('when endian = big', () => {
					before(done => {
						validOpts = {
							endian: 'big',
						};
						validBuf = validBufferSeed;
						done();
					});

					it('should equal BUFFER_SEED', done => {
						expect(bignumResult).to.eql(new Bignum(validSeed));
						done();
					});
				});
			});
		});
	});

	describe('toBuffer', () => {
		before(done => {
			validSeed = '782910138827292261791972728324982';
			validBufferSeed = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
			validBufferSeedSize2 = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
			validBufferSeedMpint = Buffer.from('AAAADiaZtxg1iehH57OadUN2', 'base64');
			done();
		});

		describe('when it throws an error', () => {
			describe('when opts equal an unsupported string', () => {
				before(done => {
					validOpts = 'notmpint';
					done();
				});

				beforeEach(done => {
					bignumResult = new Bignum(validSeed);
					done();
				});

				it('should throw RangeError', done => {
					expect(bignumResult.toBuffer(validOpts)).to.eq(
						'Unsupported Buffer representation'
					);
					done();
				});
			});

			describe('when Bignumber is negative', () => {
				before(done => {
					validOpts = {};
					validSeed = '-782910138827292261791972728324982';
					done();
				});

				beforeEach(done => {
					bignumResult = new Bignum(validSeed);
					done();
				});

				it('should throw Error: "Converting negative numbers to Buffers not supported yet', done => {
					expect(() => {
						bignumResult.toBuffer(validOpts);
					}).throws('Converting negative numbers to Buffers not supported yet');
					done();
				});
			});
		});

		describe('when it does not throw an error', () => {
			var toBufferResult;

			before(done => {
				validSeed = '782910138827292261791972728324982';
				done();
			});

			beforeEach(done => {
				bignumResult = new Bignum(validSeed);
				toBufferResult = bignumResult.toBuffer(validOpts);
				done();
			});

			describe('when passed no options', () => {
				before(done => {
					validOpts = null;
					done();
				});

				it('should return validBufferSeed', done => {
					expect(toBufferResult).to.eql(validBufferSeed);
					done();
				});
			});

			describe('when passed size 1 and big endian options', () => {
				before(done => {
					validOpts = { size: 1, endian: 'big' };
					done();
				});

				it('should return validBufferSeed', done => {
					expect(toBufferResult).to.eql(validBufferSeed);
					done();
				});
			});

			describe('when passed size 2 buffer and little endian', () => {
				before(done => {
					validOpts = { size: 2, endian: 'little' };
					done();
				});

				it('should return validBufferSeedSize2', done => {
					expect(toBufferResult).to.eql(validBufferSeedSize2);
					done();
				});
			});

			describe('when passed only a size option', () => {
				before(done => {
					validOpts = { size: 1 };
					done();
				});

				it('should return validBufferSeed', done => {
					expect(toBufferResult).to.eql(validBufferSeed);
					done();
				});
			});

			describe('when passed only big endian option', () => {
				before(done => {
					validOpts = { endian: 'big' };
					done();
				});

				it('should return validBufferSeed', done => {
					expect(toBufferResult).to.eql(validBufferSeed);
					done();
				});
			});

			describe('when passed only little endian option', () => {
				before(done => {
					validOpts = { endian: 'little' };
					done();
				});

				it('should return validBufferSeed', done => {
					expect(toBufferResult).to.eql(validBufferSeed);
					done();
				});
			});

			describe('when passed a supported buffer option (mpint)', () => {
				before(done => {
					validOpts = 'mpint';
					done();
				});

				it('should return validBufferSeedMpint', done => {
					expect(toBufferResult).to.eql(validBufferSeedMpint);
					done();
				});
			});
		});
	});
});
