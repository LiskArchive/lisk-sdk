/*
 * Copyright © 2022 Lisk Foundation
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

import { validNameChars } from './utils';

export class InvalidNameError extends Error {
	public constructor(name = 'name') {
		const msg = `Invalid ${name} property. It should contain only characters from the set [${validNameChars}].`;
		super(msg);

		this.name = 'InvalidNameError';
	}
}
