/*
 * Copyright © 2019 Lisk Foundation
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
import { hash } from '@liskhq/lisk-cryptography';

export const getId = (blockBytes: Buffer): string => {
	const hashedBlock = hash(blockBytes);
	const temp = Buffer.alloc(8);
	for (let i = 0; i < 8; i += 1) {
		temp[i] = hashedBlock[7 - i];
	}

	const id = temp.readBigUInt64BE().toString();

	return id;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const uniqBy = <T extends { readonly [key: string]: unknown }>(
	arr: ReadonlyArray<T>,
	property: string,
	set = new Set(),
): T[] =>
	arr.filter(element =>
		// eslint-disable-next-line
		(value => !set.has(value) && set.add(value))(element[property]),
	);
