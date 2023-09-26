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
import { SMT_PREFIX_SIZE } from '../constants';

export const copyBuffer = (value: Buffer): Buffer => {
	const copiedValue = Buffer.alloc(value.length);
	value.copy(copiedValue);
	return copiedValue;
};

export const toSMTKey = (value: Buffer): Buffer =>
	// First byte is the DB prefix
	Buffer.concat([
		value.subarray(1, SMT_PREFIX_SIZE + 1),
		utils.hash(value.subarray(SMT_PREFIX_SIZE + 1)),
	]);
