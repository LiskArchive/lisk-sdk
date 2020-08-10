/*
 * Copyright © 2018 Lisk Foundation
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

import { Validator } from '@liskhq/lisk-chain';
import { Node } from '../../../src/application/node';

export const getDelegateList = async (node: Node): Promise<ReadonlyArray<Validator>> =>
	node['_chain'].getValidators();
