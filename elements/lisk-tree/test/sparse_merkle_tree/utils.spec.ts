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

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import {
	sortByBitmapAndKey,
	binaryStringToBuffer,
	bufferToBinaryString,
	areSiblingQueries,
	filterQueries,
	calculateRoot,
	leafDataBuffer,
	isLeaf,
	branchDataBuffer,
	getLeafData,
	getBranchData,
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
				key: getRandomBytes(2),
				binaryBitmap: '011',
			};

			const res2 = {
				key: getRandomBytes(2),
				binaryBitmap: '0011',
			};

			expect(sortByBitmapAndKey([res1, res2])).toEqual([res2, res1]);
		});

		it('should sort by longest bitmap breaking tie with smaller key', () => {
			const res1 = {
				key: getRandomBytes(2),
				binaryBitmap: '111',
			};

			const res2 = {
				key: getRandomBytes(1),
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

	describe('isLeaf', () => {
		const sampleKey = Buffer.from('46', 'hex');
		const sampleValue = Buffer.from(
			'f031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
			'hex',
		);
		const leafData = leafDataBuffer(sampleKey, sampleValue);
		const branchData = branchDataBuffer(sampleKey, sampleValue);

		it('Should return true when a leaf node data is passed', () =>
			expect(isLeaf(leafData)).toEqual(true));
		it('Should return false when a branch node data is passed', () =>
			expect(isLeaf(branchData)).toEqual(false));
	});

	describe('getLeafData', () => {
		const sampleKey = Buffer.from('46', 'hex');
		const sampleValue = Buffer.from(
			'f031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
			'hex',
		);
		const leafData = leafDataBuffer(sampleKey, sampleValue);

		it('Should return key value from leaf data buffer', () =>
			expect(getLeafData(leafData, 1)).toEqual({
				key: sampleKey,
				value: sampleValue,
			}));
	});

	describe('getBranchData', () => {
		const leftHash = Buffer.from(
			'2031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
			'hex',
		);
		const rightHash = Buffer.from(
			'1031efa58744e97a34555ca98621d4e8a52ceb5f20b891d5c44ccae0daaaa644',
			'hex',
		);

		const branchData = branchDataBuffer(leftHash, rightHash);

		it('Should return key value from leaf data buffer', () =>
			expect(getBranchData(branchData)).toEqual({
				leftHash,
				rightHash,
			}));
	});
});
