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
import { createFakeBlockHeader } from '../../../../src/testing';
import {
	areDistinctHeadersContradicting,
	getBlockBFTProperties,
} from '../../../../src/engine/bft/utils';

describe('bft utils', () => {
	const generatorAddress = utils.getRandomBytes(20);

	it('should return false when generatorAddress does not match', () => {
		const header1 = createFakeBlockHeader({
			generatorAddress,
		});
		const header2 = createFakeBlockHeader({
			generatorAddress: utils.getRandomBytes(20),
		});

		expect(areDistinctHeadersContradicting(header1, header2)).toBeFalse();
	});

	describe('areDistinctHeadersContradicting', () => {
		it('should return true when first height is equal to second height but equal maxHeightPrevoted', () => {
			const header1 = createFakeBlockHeader({
				height: 10999,
				maxHeightPrevoted: 1099,
				generatorAddress,
			});
			const header2 = createFakeBlockHeader({
				height: 10999,
				maxHeightPrevoted: 1099,
				generatorAddress,
			});

			expect(areDistinctHeadersContradicting(header1, header2)).toBeTrue();
		});

		it('should return true when first height is greater than the second height but equal maxHeightPrevoted', () => {
			const header1 = createFakeBlockHeader({
				height: 10999,
				maxHeightPrevoted: 1099,
				generatorAddress,
			});
			const header2 = createFakeBlockHeader({
				height: 11999,
				maxHeightPrevoted: 1099,
				generatorAddress,
			});

			expect(areDistinctHeadersContradicting(header1, header2)).toBeTrue();
		});

		it("should return true when height is greater than the second header's maxHeightGenerated", () => {
			const header1 = createFakeBlockHeader({
				generatorAddress,
				height: 120,
			});
			const header2 = createFakeBlockHeader({
				generatorAddress,
				height: 123,
				maxHeightGenerated: 98,
			});

			expect(areDistinctHeadersContradicting(header1, header2)).toBeTrue();
		});

		it('should return true when maxHeightPrevoted is greater than the second maxHeightPrevoted', () => {
			const header1 = createFakeBlockHeader({
				generatorAddress,
				height: 133,
				maxHeightPrevoted: 101,
			});
			const header2 = createFakeBlockHeader({
				generatorAddress,
				height: 123,
				maxHeightPrevoted: 98,
			});

			expect(areDistinctHeadersContradicting(header1, header2)).toBeTrue();
		});

		it('should return false when headers are not contradicting', () => {
			const header1 = createFakeBlockHeader({
				generatorAddress,
				height: 133,
				maxHeightGenerated: 50,
				maxHeightPrevoted: 101,
			});
			const header2 = createFakeBlockHeader({
				generatorAddress,
				height: 153,
				maxHeightPrevoted: 121,
				maxHeightGenerated: 133,
			});
			expect(areDistinctHeadersContradicting(header1, header2)).toBeFalse();
		});
	});

	describe('getBlockBFTProperties', () => {
		it('should return new bft block properties', () => {
			const header = createFakeBlockHeader();
			const bftProps = getBlockBFTProperties(header);

			expect(bftProps.generatorAddress).toEqual(header.generatorAddress);
			expect(bftProps.maxHeightGenerated).toEqual(header.maxHeightGenerated);
			expect(bftProps.maxHeightPrevoted).toEqual(header.maxHeightPrevoted);
			expect(bftProps.maxHeightPrevoted).toBe(0);
			expect(bftProps.precommitWeight).toEqual(BigInt(0));
		});
	});
});
