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

import { BaseModule, ModuleMetadata } from '../base_module';
import { PoAMethod } from './method';
import { PoAEndpoint } from './endpoint';

export class PoAModule extends BaseModule {
	public method = new PoAMethod(this.stores, this.events);
	public endpoint = new PoAEndpoint(this.stores, this.offchainStores);

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [],
			assets: [],
		};
	}
}
