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

import { FrameworkError } from '../../errors';

export class InvalidNonceError extends FrameworkError {
	public code = 'ERR_INVALID_NONCE';
	public actual: string;
	public expected: string;
	public constructor(message: string, actual: bigint, expected: bigint) {
		super(message);
		this.actual = actual.toString();
		this.expected = expected.toString();
	}
}
