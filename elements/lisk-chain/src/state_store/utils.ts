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

import { hash } from '@liskhq/lisk-cryptography';

export const copyBuffer = (value: Buffer): Buffer => {
	const copiedValue = Buffer.alloc(value.length);
	value.copy(copiedValue);
	return copiedValue;
};

const SMT_PREFIX_SIZE = 6;

export const toSMTKey = (value: Buffer): Buffer =>
	Buffer.concat([value.slice(0, SMT_PREFIX_SIZE), hash(value.slice(SMT_PREFIX_SIZE))]);
