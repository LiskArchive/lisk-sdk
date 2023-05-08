/*
 * Copyright © 2023 Lisk Foundation
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

import { ModuleConfig } from './types';
import { BaseEndpoint } from '../base_endpoint';

export class NFTEndpoint extends BaseEndpoint {
	// @ts-expect-error TODO: unused error. Remove when implementing.
	private _moduleConfig!: ModuleConfig;

	public init(moduleConfig: ModuleConfig) {
		this._moduleConfig = moduleConfig;
	}
}
