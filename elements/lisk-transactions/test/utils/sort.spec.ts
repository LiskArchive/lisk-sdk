/*
 * Copyright © 2020 Lisk Foundation
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
 *
 */
import { sortUnlocking } from '../../src/utils/sort';

describe('sort', () => {
	describe('#sortUnlocking', () => {
		it('should sort unlocking object by delegateAddress, unvoteHeight and amount', () => {
			// Arrange
			const expected = [
				{
					delegateAddress: Buffer.from('14922320760863774375L', 'hex'),
					unvoteHeight: 20,
					amount: BigInt('123000000000'),
				},
				{
					delegateAddress: Buffer.from('14922320760863774375L', 'hex'),
					unvoteHeight: 20,
					amount: BigInt('100000000000'),
				},
				{
					delegateAddress: Buffer.from('14922320760863774375L', 'hex'),
					unvoteHeight: 15,
					amount: BigInt('9900000000000'),
				},
				{
					delegateAddress: Buffer.from('17900361349681048625L', 'hex'),
					unvoteHeight: 20,
					amount: BigInt('100000000000'),
				},
				{
					delegateAddress: Buffer.from('3951342159122727489L', 'hex'),
					unvoteHeight: 25,
					amount: BigInt('100000000000'),
				},
				{
					delegateAddress: Buffer.from('3951342159122727489L', 'hex'),
					unvoteHeight: 24,
					amount: BigInt('100000000000'),
				},
			];
			const copiedExpected = [...expected.map(e => ({ ...e }))];
			const shuffled = [
				copiedExpected[3],
				copiedExpected[1],
				copiedExpected[2],
				copiedExpected[0],
				copiedExpected[5],
				copiedExpected[4],
			];
			sortUnlocking(shuffled);
			expect(shuffled).toStrictEqual(expected);
		});
	});
});
