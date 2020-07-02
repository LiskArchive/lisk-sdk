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

import { BaseTypes } from '../types';

export const getDefaultValue = (dataType: string): BaseTypes => {
	switch (dataType) {
		case 'string':
			return '';
		case 'boolean':
			return false;
		case 'bytes':
			return Buffer.alloc(0);
		case 'uint32':
		case 'sint32':
			return 0;
		case 'uint64':
		case 'sint64':
			return BigInt(0);
		default:
			throw new Error('Invalid data type');
	}
};
