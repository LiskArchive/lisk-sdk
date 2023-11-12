/*
 * Copyright © 2023 Lisk Foundation
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

export const bitwiseXORFixtures = [
	{
		input: [Buffer.from([0, 0, 0, 0]), Buffer.from([0, 0, 0, 0])],
		output: Buffer.from([0, 0, 0, 0]),
	},
	{
		input: [Buffer.from([1, 1, 1, 1]), Buffer.from([1, 1, 1, 1])],
		output: Buffer.from([0, 0, 0, 0]),
	},
	{
		input: [Buffer.from([0, 1, 0, 0]), Buffer.from([0, 0, 1, 0])],
		output: Buffer.from([0, 1, 1, 0]),
	},
	{
		input: [Buffer.from([0, 0, 1, 1]), Buffer.from([1, 1, 0, 0])],
		output: Buffer.from([1, 1, 1, 1]),
	},
	{
		input: [
			Buffer.from([0, 0, 1, 1]),
			Buffer.from([1, 1, 0, 0]),
			Buffer.from([1, 1, 1, 0]),
			Buffer.from([1, 0, 0, 0]),
		],
		output: Buffer.from([1, 0, 0, 1]),
	},
	{
		input: [
			Buffer.from([1, 0, 1, 1]),
			Buffer.from([0, 1, 1, 0]),
			Buffer.from([1, 1, 1, 0]),
			Buffer.from([0, 0, 0, 0]),
			Buffer.from([1, 1, 1, 0]),
			Buffer.from([1, 1, 0, 1]),
		],
		output: Buffer.from([0, 0, 0, 0]),
	},
];
