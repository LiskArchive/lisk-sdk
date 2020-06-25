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

import { hash } from '@liskhq/lisk-cryptography';
import { LEAF_PREFIX } from './constants';
import { NodeLocation, NodeSide } from './types';

export const isLeaf = (value: Buffer): boolean =>
	value.compare(Buffer.alloc(0)) !== 0 && value[0] === LEAF_PREFIX[0];
