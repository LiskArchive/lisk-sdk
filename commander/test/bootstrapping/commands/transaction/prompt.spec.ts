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
import * as inquirer from 'inquirer';
import { getParamsFromPrompt } from '../../../../src/utils/reader';
import { castValidationSchema } from '../../../helpers/transactions';

describe('getParamsFromPrompt', () => {
	it('should cast uint64, sint64 types to BigInt and uint32, sint32 to Number', async () => {
		const uInt64 = '12312321';
		const sInt64 = '-12321312';
		const uInt32 = '10';
		const sInt32 = '-10';
		jest
			.spyOn(inquirer, 'prompt')
			.mockResolvedValueOnce({
				uInt64,
			})
			.mockResolvedValueOnce({
				sInt64,
			})
			.mockResolvedValueOnce({
				uInt32,
			})
			.mockResolvedValueOnce({
				sInt32,
			})
			.mockResolvedValueOnce({
				uInt64Array: `${uInt64},${uInt64}`,
			})
			.mockResolvedValueOnce({
				sInt64Array: `${sInt64},${sInt64}`,
			})
			.mockResolvedValueOnce({
				uInt32Array: `${uInt32},${uInt32}`,
			})
			.mockResolvedValueOnce({
				sInt32Array: `${sInt32},${sInt32}`,
			})
			.mockResolvedValueOnce({
				nested: `${uInt64},${sInt64},${uInt32},${sInt32}`,
			})
			.mockResolvedValue({
				askAgain: false,
			});

		await expect(getParamsFromPrompt(castValidationSchema)).resolves.toEqual({
			uInt64: BigInt(uInt64),
			sInt64: BigInt(sInt64),
			uInt32: Number(uInt32),
			sInt32: Number(sInt32),
			uInt64Array: [BigInt(uInt64), BigInt(uInt64)],
			sInt64Array: [BigInt(sInt64), BigInt(sInt64)],
			uInt32Array: [Number(uInt32), Number(uInt32)],
			sInt32Array: [Number(sInt32), Number(sInt32)],
			nested: [
				{
					uInt64: BigInt(uInt64),
					sInt64: BigInt(sInt64),
					uInt32: Number(uInt32),
					sInt32: Number(sInt32),
				},
			],
		});
	});
});
