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

var bignum = require('../../../helpers/bignum');

describe('BigNumber', () => {
	var validBuf;
	var validOpts;
	var bignumResult;
	var validSeed;
	var validBufferSeed;
	var validBufferSeedSize2;
	var validBufferSeedMpint;

	describe('fromBuffer', () => {
		before(() => {
			validSeed = '782910138827292261791972728324982';
			validBufferSeed = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
			validBufferSeedSize2 = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
		});

		describe('when it throws an error', () => {
			describe('when passed a buffer not divisible by the size option', () => {
				before(() => {
					validOpts = {
						size: 3,
						endian: 'big',
					};
					validBuf = validBufferSeed;
				});

				it('should throw RangeError', () => {
					expect(() => {
						bignum.fromBuffer(validBuf, validOpts);
					}).throws('Buffer length (14) must be a multiple of size (3)');
				});
			});
		});

		describe('when it does not throw an error', () => {
			before(() => {
				validBuf = validBufferSeed;
				validOpts = {};
			});

			beforeEach(() => {
				bignumResult = bignum.fromBuffer(validBuf, validOpts);
			});

			describe('when opts does not have a size attribute', () => {
				it('should set opts to an empty object', () => {
					expect(bignumResult).to.eql(new bignum(validSeed));
				});
			});

			describe('when opts have a size attribute', () => {
				describe('when opts.size = 2 and endian = little', () => {
					before(() => {
						validOpts = {
							size: 2,
							endian: 'little',
						};
						validBuf = validBufferSeedSize2;
					});

					it('should equal BUFFER_SEED', () => {
						expect(bignumResult).to.eql(new bignum(validSeed));
					});
				});

				describe('when opts.size = 2 and endian = big', () => {
					before(() => {
						validOpts = {
							size: 2,
							endian: 'big',
						};
						validBuf = validBufferSeed;
					});

					it('should equal BUFFER_SEED', () => {
						expect(bignumResult).to.eql(new bignum(validSeed));
					});
				});

				describe('when endian = big', () => {
					before(() => {
						validOpts = {
							endian: 'big',
						};
						validBuf = validBufferSeed;
					});

					it('should equal BUFFER_SEED', () => {
						expect(bignumResult).to.eql(new bignum(validSeed));
					});
				});
			});
		});
	});

	describe('toBuffer', () => {
		before(() => {
			validSeed = '782910138827292261791972728324982';
			validBufferSeed = Buffer.from('Jpm3GDWJ6Efns5p1Q3Y=', 'base64');
			validBufferSeedSize2 = Buffer.from('mSYYt4k1R+iz53WadkM=', 'base64');
			validBufferSeedMpint = Buffer.from('AAAADiaZtxg1iehH57OadUN2', 'base64');
		});

		describe('when it throws an error', () => {
			describe('when opts equal an unsupported string', () => {
				before(() => {
					validOpts = 'notmpint';
				});

				beforeEach(() => {
					bignumResult = new bignum(validSeed);
				});

				it('should throw RangeError', () => {
					expect(bignumResult.toBuffer(validOpts)).to.eq(
						'Unsupported Buffer representation'
					);
				});
			});

			describe('when Bignumber is negative', () => {
				before(() => {
					validOpts = {};
					validSeed = '-782910138827292261791972728324982';
				});

				beforeEach(() => {
					bignumResult = new bignum(validSeed);
				});

				it('should throw Error: "Converting negative numbers to Buffers not supported yet', () => {
					expect(() => {
						bignumResult.toBuffer(validOpts);
					}).throws('Converting negative numbers to Buffers not supported yet');
				});
			});
		});

		describe('when it does not throw an error', () => {
			var toBufferResult;

			before(() => {
				validSeed = '782910138827292261791972728324982';
			});

			beforeEach(() => {
				bignumResult = new bignum(validSeed);
				toBufferResult = bignumResult.toBuffer(validOpts);
			});

			describe('when passed no options', () => {
				before(() => {
					validOpts = null;
				});

				it('should return validBufferSeed', () => {
					expect(toBufferResult).to.eql(validBufferSeed);
				});
			});

			describe('when passed size 1 and big endian options', () => {
				before(() => {
					validOpts = { size: 1, endian: 'big' };
				});

				it('should return validBufferSeed', () => {
					expect(toBufferResult).to.eql(validBufferSeed);
				});
			});

			describe('when passed size 2 buffer and little endian', () => {
				before(() => {
					validOpts = { size: 2, endian: 'little' };
				});

				it('should return validBufferSeedSize2', () => {
					expect(toBufferResult).to.eql(validBufferSeedSize2);
				});
			});

			describe('when passed only a size option', () => {
				before(() => {
					validOpts = { size: 1 };
				});

				it('should return validBufferSeed', () => {
					expect(toBufferResult).to.eql(validBufferSeed);
				});
			});

			describe('when passed only big endian option', () => {
				before(() => {
					validOpts = { endian: 'big' };
				});

				it('should return validBufferSeed', () => {
					expect(toBufferResult).to.eql(validBufferSeed);
				});
			});

			describe('when passed only little endian option', () => {
				before(() => {
					validOpts = { endian: 'little' };
				});

				it('should return validBufferSeed', () => {
					expect(toBufferResult).to.eql(validBufferSeed);
				});
			});

			describe('when passed a supported buffer option (mpint)', () => {
				before(() => {
					validOpts = 'mpint';
				});

				it('should return validBufferSeedMpint', () => {
					expect(toBufferResult).to.eql(validBufferSeedMpint);
				});
			});
		});
	});
});
