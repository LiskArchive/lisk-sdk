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

import { FAILED_SYNC_RETRY_TIMEOUT } from './constants';

export class FailSyncError extends Error {
	public constructor(message: string) {
		super(`${message}: Attempting to sync again after ${FAILED_SYNC_RETRY_TIMEOUT} ms`);
		this.name = this.constructor.name;
	}
}
