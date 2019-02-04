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

const Bignum = require('../../../../../../src/modules/chain/helpers/bignum.js');

describe('BigNumber', async () => {
	let validBuf;
	let validOpts;
	let bignumResult;
	let validSeed;
	let validBufferSeed;
	let validBufferSeedSize2;
	let validBufferSeedMpint;

	describe('exponential values', async () => {
		it('should not return exponential value for a long number', async () => {
			const amount = '10000000000000000000000000000000000000000000000000000';
			const value = new Bignum(amount).toString();
			return expect(value.match(/[e]/i)).to.be.null;
		});
	});

	describe('fromBuffer', async () => {
		before(done => {
			validSeed = '782910138827292261791972728324982';
			validBufferSeed = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
			validBufferSeedSize2 = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
			done();
		});

		describe('when it throws an error', async () => {
			describe('when passed a buffer not divisible by the size option', async () => {
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

		describe('when it does not throw an error', async () => {
			before(done => {
				validBuf = validBufferSeed;
				validOpts = {};
				done();
			});

			beforeEach(done => {
				bignumResult = Bignum.fromBuffer(validBuf, validOpts);
				done();
			});

			describe('when opts does not have a size attribute', async () => {
				it('should set opts to an empty object', done => {
					expect(bignumResult).to.eql(new Bignum(validSeed));
					done();
				});
			});

			describe('when opts have a size attribute', async () => {
				describe('when opts.size = 2 and endian = little', async () => {
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

				describe('when opts.size = 2 and endian = big', async () => {
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

				describe('when endian = big', async () => {
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

	describe('toBuffer', async () => {
		before(done => {
			validSeed = '782910138827292261791972728324982';
			validBufferSeed = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
			validBufferSeedSize2 = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
			validBufferSeedMpint = Buffer.from('AAAADiaZtxg1iehH57OadUN2', 'base64');
			done();
		});

		describe('when it throws an error', async () => {
			describe('when opts equal an unsupported string', async () => {
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

			describe('when Bignumber is negative', async () => {
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

		describe('when it does not throw an error', async () => {
			let toBufferResult;

			before(done => {
				validSeed = '782910138827292261791972728324982';
				done();
			});

			beforeEach(done => {
				bignumResult = new Bignum(validSeed);
				toBufferResult = bignumResult.toBuffer(validOpts);
				done();
			});

			describe('when passed no options', async () => {
				before(done => {
					validOpts = null;
					done();
				});

				it('should return validBufferSeed', done => {
					expect(toBufferResult).to.eql(validBufferSeed);
					done();
				});
			});

			describe('when passed size 1 and big endian options', async () => {
				before(done => {
					validOpts = { size: 1, endian: 'big' };
					done();
				});

				it('should return validBufferSeed', done => {
					expect(toBufferResult).to.eql(validBufferSeed);
					done();
				});
			});

			describe('when passed size 2 buffer and little endian', async () => {
				before(done => {
					validOpts = { size: 2, endian: 'little' };
					done();
				});

				it('should return validBufferSeedSize2', done => {
					expect(toBufferResult).to.eql(validBufferSeedSize2);
					done();
				});
			});

			describe('when passed only a size option', async () => {
				before(done => {
					validOpts = { size: 1 };
					done();
				});

				it('should return validBufferSeed', done => {
					expect(toBufferResult).to.eql(validBufferSeed);
					done();
				});
			});

			describe('when passed only big endian option', async () => {
				before(done => {
					validOpts = { endian: 'big' };
					done();
				});

				it('should return validBufferSeed', done => {
					expect(toBufferResult).to.eql(validBufferSeed);
					done();
				});
			});

			describe('when passed only little endian option', async () => {
				before(done => {
					validOpts = { endian: 'little' };
					done();
				});

				it('should return validBufferSeed', done => {
					expect(toBufferResult).to.eql(validBufferSeed);
					done();
				});
			});

			describe('when passed a supported buffer option (mpint)', async () => {
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
