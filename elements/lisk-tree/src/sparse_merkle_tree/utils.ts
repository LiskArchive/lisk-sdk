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
import { LEAF_HASH_PREFIX, BRANCH_HASH_PREFIX } from './constants';

export const leafHash = (key: Buffer, value: Buffer): Buffer =>
	hash(Buffer.concat([LEAF_HASH_PREFIX, key, value]));
export const branchHash = (leftHash: Buffer, rightHash: Buffer): Buffer =>
	hash(Buffer.concat([BRANCH_HASH_PREFIX, leftHash, rightHash]));
