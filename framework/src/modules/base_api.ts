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

export abstract class BaseAPI {
	protected moduleID: Buffer;
	protected moduleName: string;

	public constructor(moduleName: string) {
		this.moduleID = utils.hash(Buffer.from(moduleName, 'utf-8')).slice(0, 4);
		this.moduleName = moduleName;
	}
}
