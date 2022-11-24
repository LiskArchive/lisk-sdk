/*
 * Copyright © 2021 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';
import {
	sortByBitmapAndKey,
	binaryStringToBuffer,
	bufferToBinaryString,
	areSiblingQueries,
	filterQueries,
	calculateRoot,
	getOverlappingStr,
	verify,
	leafData,
	isLeaf,
	branchData,
	parseBranchData,
	parseLeafData,
	binaryExpansion,
} from '../../src/sparse_merkle_tree/utils';

const binarySampleData = [
	{ str: '101', buf: '05' },
	{ str: '11111111', buf: 'FF' },
	{ str: '11111111', buf: 'FF' },
	{ str: '100000000', buf: '0100' },
	{ str: '10101001101100', buf: '2A6C' },
	{ str: '1111110010101001101100', buf: '3F2A6C' },
];

const createQueryObject = ({
	key,
	value,
	bitmap,
}: {
	key: string;
	value: string;
	bitmap: string;
}) => ({
	key: Buffer.from(key, 'hex'),
	value: Buffer.from(value, 'hex'),
	bitmap: Buffer.from(bitmap, 'hex'),
	binaryBitmap: bufferToBinaryString(Buffer.from(bitmap, 'hex')),
});

describe('utils', () => {
	describe('sortByBitmapAndKey', () => {
		it('should sort by longest bitmap', () => {
			const res1 = {
				key: utils.getRandomBytes(2),
				binaryBitmap: '011',
			};

			const res2 = {
				key: utils.getRandomBytes(2),
				binaryBitmap: '0011',
			};

			expect(sortByBitmapAndKey([res1, res2])).toEqual([res2, res1]);
		});

		it('should sort by longest bitmap breaking tie with smaller key', () => {
			const res1 = {
				key: utils.getRandomBytes(2),
				binaryBitmap: '111',
			};

			const res2 = {
				key: utils.getRandomBytes(1),
				binaryBitmap: '111',
			};

			expect(sortByBitmapAndKey([res1, res2])).toEqual([res2, res1]);
		});
	});

	describe('areSiblingQueries', () => {
		it('should return true for valid sibling queries', () => {
			// These values are generate from inclusion proof tree diagram for keys "11101101" and "11100001"
			expect(
				areSiblingQueries(
					createQueryObject({ key: 'ed', value: 'f3df1f9c', bitmap: '17' }),
					createQueryObject({ key: 'e1', value: 'f031efa5', bitmap: '17' }),
					1,
				),
			).toBeTrue();
		});

		it('should return true for valid sibling queries even if swapped', () => {
			// These values are generate from inclusion proof tree diagram for keys "11101101" and "11100001"
			expect(
				areSiblingQueries(
					createQueryObject({ key: 'e1', value: 'f031efa5', bitmap: '17' }),
					createQueryObject({ key: 'ed', value: 'f3df1f9c', bitmap: '17' }),
					1,
				),
			).toBeTrue();
		});

		it('should return false for invalid sibling queries', () => {
			// These values are generate from inclusion proof tree diagram for keys "00110011" and "01101100"
			expect(
				areSiblingQueries(
					createQueryObject({ key: '33', value: '4e074085', bitmap: '17' }),
					createQueryObject({ key: '6c', value: 'acac86c0', bitmap: '1f' }),
					1,
				),
			).toBeFalse();
		});

		it('should return false for invalid sibling queries even if swapped', () => {
			// These values are generate from inclusion proof tree diagram for keys "00110011" and "01101100"
			expect(
				areSiblingQueries(
					createQueryObject({ key: '6c', value: 'acac86c0', bitmap: '1f' }),
					createQueryObject({ key: '33', value: '4e074085', bitmap: '17' }),
					1,
				),
			).toBeFalse();
		});
	});

	describe('filterQueries', () => {
		it('should remove queries which are merged together', () => {
			// These values are generate from inclusion proof tree diagram
			// for keys "01111110", "01110110", "01110111", "01011010"
			const q1 = createQueryObject({ key: '7e', value: '7ace431c', bitmap: '1f' });
			const q2 = createQueryObject({ key: '76', value: '4c94485e', bitmap: '1f' });
			const q3 = createQueryObject({ key: '76', value: '4c94485e', bitmap: '1f' });
			const q4 = createQueryObject({ key: '5a', value: 'bbeebd87', bitmap: '07' });

			expect(filterQueries([q1, q2, q3, q4], 1)).toEqual([q1, q2, q4]);
		});
	});

	describe('calculateRoot', () => {
		it('should calculate correct root hash for single proof', () => {
			const siblingHashes = [
				'e6fa536eaac055d524e29fb4682893e3111bf3a027f7cd5ba312aec56460eb1b',
				'63a154f88e6f5898bada58cbcb0dfcfa84e18cd5d50783e6703d904bef8be36b',
				'da7f3bd33f419f025fc34ada50e26bc0094a7f0018f91fa7e51b66c88c6a7e78',
				'ed9b2d408363d6edec46b055de68e67b37091f5b7dece4415200082ba01bc73e',
			].map(h => Buffer.from(h, 'hex'));
			const queries = [
				createQueryObject({
					key: 'e1',
					value: 'f031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
					bitmap: '17',
				}),
			];
			const rootHash = '21ecda9db382eff32c9ec899fc7090cf58858e8c22a2af82510cd4d9c9a42c2f';

			expect(calculateRoot(siblingHashes, queries, 1).toString('hex')).toEqual(rootHash);
		});

		it('should calculate correct root hash for multi proof', () => {
			const siblingHashes = [
				'b2157891142f7416efc259560b181fcbb52d95abe326409f55754b7f453455b4',
				'c5368d8ea5128f897a723662ea8ca092ee30029175f193e9fe37d3e7f6641264',
				'e6fa536eaac055d524e29fb4682893e3111bf3a027f7cd5ba312aec56460eb1b',
				'ecb4e7940250348fcbd38c3eb7982ce7d0a748fd832f48a0154b4ff7ded6fe04',
				'63a154f88e6f5898bada58cbcb0dfcfa84e18cd5d50783e6703d904bef8be36b',
				'99b0161609748a131c16d46c72ff79ffbfa85e9e2694c52ee665635c4d48ecae',
				'da7f3bd33f419f025fc34ada50e26bc0094a7f0018f91fa7e51b66c88c6a7e78',
			].map(h => Buffer.from(h, 'hex'));

			const queries = [
				createQueryObject({
					key: 'e1',
					value: 'f031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
					bitmap: '17',
				}),
				createQueryObject({
					key: '60',
					value: '8d33f520a3c4cef80d2453aef81b612bfe1cb44c8b2025630ad38662763f13d3',
					bitmap: '1f',
				}),
				createQueryObject({
					key: '7e',
					value: '7ace431cb61584cb9b8dc7ec08cf38ac0a2d649660be86d349fb43108b542fa4',
					bitmap: '1f',
				}),
			];
			const rootHash = '21ecda9db382eff32c9ec899fc7090cf58858e8c22a2af82510cd4d9c9a42c2f';

			expect(calculateRoot(siblingHashes, queries, 1).toString('hex')).toEqual(rootHash);
		});

		it('should calculate correct root hash for single proof of exclusion', () => {
			const siblingHashes = [
				'c4d5a0ec88593441501521e1217be34f8875d1a2f8d2d882f6a411debaa7467e',
				'508e7ce32a2dfb6c39123ad6daaea8dde3bbcb096dd255bea05bea9b717898c3',
				'ecb4e7940250348fcbd38c3eb7982ce7d0a748fd832f48a0154b4ff7ded6fe04',
				'99b0161609748a131c16d46c72ff79ffbfa85e9e2694c52ee665635c4d48ecae',
				'7ef9d01187c522f5d7198874a28cdb495abefe4fc5b3fa4fb235ba21633928a6',
			].map(h => Buffer.from(h, 'hex'));

			const queries = [
				createQueryObject({
					key: '76',
					value: '4c94485e0c21ae6c41ce1dfe7b6bfaceea5ab68e40a2476f50208e526f506080',
					bitmap: '1f',
				}),
			];
			const rootHash = '21ecda9db382eff32c9ec899fc7090cf58858e8c22a2af82510cd4d9c9a42c2f';

			expect(calculateRoot(siblingHashes, queries, 1).toString('hex')).toEqual(rootHash);
		});

		it('should calculate correct root hash for multi proof of exclusion', () => {
			const siblingHashes = [
				'60a8e2b790e91ca7e05c6eb758a694e42635772b2fa23c0706df4c3423d92a11',
				'c4d5a0ec88593441501521e1217be34f8875d1a2f8d2d882f6a411debaa7467e',
				'ecb4e7940250348fcbd38c3eb7982ce7d0a748fd832f48a0154b4ff7ded6fe04',
				'99b0161609748a131c16d46c72ff79ffbfa85e9e2694c52ee665635c4d48ecae',
				'7ef9d01187c522f5d7198874a28cdb495abefe4fc5b3fa4fb235ba21633928a6',
			].map(h => Buffer.from(h, 'hex'));

			const queries = [
				createQueryObject({
					key: '76',
					value: '4c94485e0c21ae6c41ce1dfe7b6bfaceea5ab68e40a2476f50208e526f506080',
					bitmap: '1f',
				}),
				createQueryObject({
					key: '6c',
					value: 'acac86c0e609ca906f632b0e2dacccb2b77d22b0621f20ebece1a4835b93f6f0',
					bitmap: '1f',
				}),
			];
			const rootHash = '21ecda9db382eff32c9ec899fc7090cf58858e8c22a2af82510cd4d9c9a42c2f';

			expect(calculateRoot(siblingHashes, queries, 1).toString('hex')).toEqual(rootHash);
		});

		it('should calculate correct root hash for mix proof of inclusion and exclusion', () => {
			const siblingHashes = [
				'60a8e2b790e91ca7e05c6eb758a694e42635772b2fa23c0706df4c3423d92a11',
				'ae63f64dd16496628e978c8f8f8659f65de41850be64db2a54ec24f4d5893ffd',
				'ecb4e7940250348fcbd38c3eb7982ce7d0a748fd832f48a0154b4ff7ded6fe04',
				'7ef9d01187c522f5d7198874a28cdb495abefe4fc5b3fa4fb235ba21633928a6',
			].map(h => Buffer.from(h, 'hex'));

			const queries = [
				createQueryObject({
					key: '76',
					value: '4c94485e0c21ae6c41ce1dfe7b6bfaceea5ab68e40a2476f50208e526f506080',
					bitmap: '1f',
				}),
				createQueryObject({
					key: '7e',
					value: '7ace431cb61584cb9b8dc7ec08cf38ac0a2d649660be86d349fb43108b542fa4',
					bitmap: '1f',
				}),
				createQueryObject({
					key: '6c',
					value: 'acac86c0e609ca906f632b0e2dacccb2b77d22b0621f20ebece1a4835b93f6f0',
					bitmap: '1f',
				}),
				createQueryObject({
					key: '1b',
					value: '77adfc95029e73b173f60e556f915b0cd8850848111358b1c370fb7c154e61fd',
					bitmap: '07',
				}),
			];
			const rootHash = '21ecda9db382eff32c9ec899fc7090cf58858e8c22a2af82510cd4d9c9a42c2f';

			expect(calculateRoot(siblingHashes, queries, 1).toString('hex')).toEqual(rootHash);
		});
	});

	describe('binaryStringToBuffer', () => {
		it.each(binarySampleData)('should convert binary string "%o" to correct buffer value', data => {
			expect(binaryStringToBuffer(data.str)).toEqual(Buffer.from(data.buf, 'hex'));
		});
	});

	describe('bufferToBinaryString', () => {
		it.each(binarySampleData)('should convert buffer "%o" to correct binary string', data => {
			expect(bufferToBinaryString(Buffer.from(data.buf, 'hex'))).toEqual(data.str);
		});
	});

	describe('getOverlappingStr', () => {
		it('returns valid overlapping strings', () => {
			expect(getOverlappingStr('12356', '123456')).toEqual('123');
			expect(getOverlappingStr('1010110', '1010010')).toEqual('1010');
		});

		it('returns empty string if no overlapping strings found', () => {
			expect(getOverlappingStr('12356', '2356')).toEqual('');
			expect(getOverlappingStr('0110011', '110011')).toEqual('');
		});
	});

	describe('verify', () => {
		it('should return false if number of query keys are not same as proof', () => {
			const queryKeys = ['01111110', '01101101', '00011011'].map(binaryStringToBuffer);
			const proof = {
				siblingHashes: [
					'e6fa536eaac055d524e29fb4682893e3111bf3a027f7cd5ba312aec56460eb1b',
					'63a154f88e6f5898bada58cbcb0dfcfa84e18cd5d50783e6703d904bef8be36b',
					'da7f3bd33f419f025fc34ada50e26bc0094a7f0018f91fa7e51b66c88c6a7e78',
					'ed9b2d408363d6edec46b055de68e67b37091f5b7dece4415200082ba01bc73e',
				].map(h => Buffer.from(h, 'hex')),
				queries: [
					createQueryObject({
						key: 'e1',
						value: 'f031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
						bitmap: '17',
					}),
				],
			};
			const merkleRoot = Buffer.from(
				'21ecda9db382eff32c9ec899fc7090cf58858e8c22a2af82510cd4d9c9a42c2f',
				'hex',
			);

			expect(verify(queryKeys, proof, merkleRoot, 1)).toBeFalse();
		});

		it('should return false if queries does not match and proof does not provide inclusion proof of one of query key', () => {
			const queryKeys = ['00110011', '01100000'].map(binaryStringToBuffer);
			const proof = {
				siblingHashes: [
					'8c221b658e18c43d92b10f8080163db3126af55c093f0cd0d982343388fb7d94',
					'e6fa536eaac055d524e29fb4682893e3111bf3a027f7cd5ba312aec56460eb1b',
					'3c51615213470ea985d3d8622117b3495bd0642d89e0f5816516958229169279',
					'63a154f88e6f5898bada58cbcb0dfcfa84e18cd5d50783e6703d904bef8be36b',
					'5577aaf6e0896ee04e13a5f06004ba763d20a668a815b7b39f8cfd6748373406',
					'da7f3bd33f419f025fc34ada50e26bc0094a7f0018f91fa7e51b66c88c6a7e78',
				].map(h => Buffer.from(h, 'hex')),
				queries: [
					createQueryObject({
						key: '33', // 00110011
						value: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
						bitmap: '17',
					}),
					createQueryObject({
						key: 'e1', // 11100001
						value: 'f031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
						bitmap: '17',
					}),
				],
			};
			const merkleRoot = Buffer.from(
				'21ecda9db382eff32c9ec899fc7090cf58858e8c22a2af82510cd4d9c9a42c2f',
				'hex',
			);

			expect(verify(queryKeys, proof, merkleRoot, 1)).toBeFalse();
		});

		it('should return true if queries do not match but response query object provides a matching/valid merkle root', () => {
			const queryKeys = ['01011010', '10101000'].map(binaryStringToBuffer);
			const proof = {
				siblingHashes: [
					'e041e1c0e364cc015af04118c1cd5a6554a7b357727ed937aac49436f0fbbf9c',
					'6400721efe3b54db24f248b0d8c93c0aa21eee1eebca058a143da44abeeea0e3',
					'99b0161609748a131c16d46c72ff79ffbfa85e9e2694c52ee665635c4d48ecae',
					'3c32b1317e5021885cda1625d28d8f90c44a1338f60ef476f5a7992d35c765e2',
				].map(h => Buffer.from(h, 'hex')),
				queries: [
					createQueryObject({
						key: '5a', // 01011010
						value: 'bbeebd879e1dff6918546dc0c179fdde505f2a21591c9a9c96e36b054ec5af83',
						bitmap: '07',
					}),
					createQueryObject({
						key: 'a9', // 10101001
						value: '9e8e8c37a53bac77a653d590b783b2508e8ed2fed040a278bf4f4703bbd5d82d',
						bitmap: '07',
					}),
				],
			};
			const merkleRoot = Buffer.from(
				'21ecda9db382eff32c9ec899fc7090cf58858e8c22a2af82510cd4d9c9a42c2f',
				'hex',
			);

			expect(verify(queryKeys, proof, merkleRoot, 1)).toBeTrue();
		});

		it('should return true for matching queries and root', () => {
			const queryKeys = ['01011010', '10101001'].map(binaryStringToBuffer);
			const proof = {
				siblingHashes: [
					'e041e1c0e364cc015af04118c1cd5a6554a7b357727ed937aac49436f0fbbf9c',
					'6400721efe3b54db24f248b0d8c93c0aa21eee1eebca058a143da44abeeea0e3',
					'99b0161609748a131c16d46c72ff79ffbfa85e9e2694c52ee665635c4d48ecae',
					'3c32b1317e5021885cda1625d28d8f90c44a1338f60ef476f5a7992d35c765e2',
				].map(h => Buffer.from(h, 'hex')),
				queries: [
					createQueryObject({
						key: '5a', // 01011010
						value: 'bbeebd879e1dff6918546dc0c179fdde505f2a21591c9a9c96e36b054ec5af83',
						bitmap: '07',
					}),
					createQueryObject({
						key: 'a9', // 10101001
						value: '9e8e8c37a53bac77a653d590b783b2508e8ed2fed040a278bf4f4703bbd5d82d',
						bitmap: '07',
					}),
				],
			};
			const merkleRoot = Buffer.from(
				'21ecda9db382eff32c9ec899fc7090cf58858e8c22a2af82510cd4d9c9a42c2f',
				'hex',
			);

			expect(verify(queryKeys, proof, merkleRoot, 1)).toBeTrue();
		});
	});

	describe('binaryExpansion', () => {
		const sampleData = [
			{
				str: '00010010',
				buf: Buffer.from('12', 'hex'),
				keyLength: 1,
			},
			{
				str: '00111100',
				buf: Buffer.from('3c', 'hex'),
				keyLength: 1,
			},
			{
				str: '1110011101111011100110101001101011101001111000110000101100001101101111011011011011110101000100001010001001100100111011111001110111100111100000010101000000011101011110110110101110010010101011101000100111101011000001011001110001011010101101110100001111011011',
				buf: Buffer.from('e77b9a9ae9e30b0dbdb6f510a264ef9de781501d7b6b92ae89eb059c5ab743db', 'hex'),
				keyLength: 32,
			},
			{
				str: '0000100001001111111011010000100010111001011110001010111101001101011111010001100101101010011101000100011010101000011010110101100000000000100111100110001101101011011000010001110110110001011000100001000110110110010110101001101010101101111111110010100111000101',
				buf: Buffer.from('084fed08b978af4d7d196a7446a86b58009e636b611db16211b65a9aadff29c5', 'hex'),
				keyLength: 32,
			},
			{
				str: '1101101100010011101111100000000100111100101000011011000011100111000100110010100000001111100110111100011000110000000101111111001010100011010001010010001110010001111010011000101100000001100010010011010111100000000010110110010110111010010101011001101100100101001001111101100010010010010100001110000111000000',
				buf: Buffer.from(
					'db13be013ca1b0e713280f9bc63017f2a3452391e98b018935e00b65ba559b2527d89250e1c0',
					'hex',
				),
				keyLength: 38,
			},
			{
				str: '0110010101001101100110110101111000110011111000101000000101101001111101110001000001101000100111010100001000000010110000111101111111010000011010000001000011110000101110000111101101110010010010001100111110000000001010011011101101110101011100111101110100110110110001010001111001010111101110111011100110110100',
				buf: Buffer.from(
					'654d9b5e33e28169f710689d4202c3dfd06810f0b87b7248cf8029bb7573dd36c51e57bbb9b4',
					'hex',
				),
				keyLength: 38,
			},
		];

		for (const data of sampleData) {
			it(`should return correct binary string for ${data.keyLength} byte size`, () =>
				expect(data.str).toEqual(binaryExpansion(data.buf, data.keyLength)));
		}
	});

	describe('isLeaf', () => {
		const sampleKey = Buffer.from('46', 'hex');
		const sampleValue = Buffer.from(
			'f031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
			'hex',
		);
		const leafDataBuffer = leafData(sampleKey, sampleValue);
		const branchDataBuffer = branchData(sampleKey, sampleValue);

		it('Should return true when a leaf node data is passed', () =>
			expect(isLeaf(leafDataBuffer)).toEqual(true));
		it('Should return false when a branch node data is passed', () =>
			expect(isLeaf(branchDataBuffer)).toEqual(false));
	});

	describe('parseLeaf', () => {
		const sampleKey = Buffer.from('46', 'hex');
		const sampleValue = Buffer.from(
			'f031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
			'hex',
		);
		const leafDataBuffer = leafData(sampleKey, sampleValue);

		it('Should return key value from leaf data buffer', () =>
			expect(parseLeafData(leafDataBuffer, 1)).toEqual({
				key: sampleKey,
				value: sampleValue,
			}));

		it('should get key value of 38 bytes from leaf data buffer', () => {
			const key38Bytes = utils.getRandomBytes(38);
			const leafDataWith38ByteKey = leafData(key38Bytes, sampleValue);

			expect(parseLeafData(leafDataWith38ByteKey, key38Bytes.byteLength)).toEqual({
				key: key38Bytes,
				value: sampleValue,
			});
		});
	});

	describe('parseBranch', () => {
		const leftHash = Buffer.from(
			'2031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
			'hex',
		);
		const rightHash = Buffer.from(
			'1031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
			'hex',
		);

		const branchDataBuffer = branchData(leftHash, rightHash);

		it('Should return key value from leaf data buffer', () =>
			expect(parseBranchData(branchDataBuffer)).toEqual({
				leftHash,
				rightHash,
			}));
	});
});
