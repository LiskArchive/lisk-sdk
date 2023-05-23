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
import { AuthorityUpdateEvent } from './events/authority_update';
import { ChainPropertiesStore, ValidatorStore, NameStore, SnapshotStore } from './stores';

export class PoAModule extends BaseModule {
	public method = new PoAMethod(this.stores, this.events);
	public endpoint = new PoAEndpoint(this.stores, this.offchainStores);

	public constructor() {
		super();
		this.events.register(AuthorityUpdateEvent, new AuthorityUpdateEvent(this.name));
		this.stores.register(ValidatorStore, new ValidatorStore(this.name, 0));
		this.stores.register(ChainPropertiesStore, new ChainPropertiesStore(this.name, 1));
		this.stores.register(NameStore, new NameStore(this.name, 2));
		this.stores.register(SnapshotStore, new SnapshotStore(this.name, 3));
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [],
			assets: [],
		};
	}
}
