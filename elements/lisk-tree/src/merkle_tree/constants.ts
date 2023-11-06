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
 */
import { utils } from '@liskhq/lisk-cryptography';

export const EMPTY_HASH = utils.hash(Buffer.alloc(0));
export const LEAF_PREFIX = Buffer.from('00', 'hex');
export const BRANCH_PREFIX = Buffer.from('01', 'hex');
export const LAYER_INDEX_SIZE = 1;
export const NODE_INDEX_SIZE = 8;
export const NODE_HASH_SIZE = 32;
export const PREFIX_HASH_TO_VALUE = Buffer.from([0]);
export const PREFIX_LOC_TO_HASH = Buffer.from([1]);
