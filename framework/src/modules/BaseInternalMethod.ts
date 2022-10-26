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

import { StoreGetter, ImmutableStoreGetter } from './base_store';
import { NamedRegistry } from './named_registry';

export abstract class BaseInternalMethod {
	public readonly events: NamedRegistry;
	public readonly context: StoreGetter | ImmutableStoreGetter;
	protected readonly stores: NamedRegistry;

	public constructor(
		stores: NamedRegistry,
		events: NamedRegistry,
		context: StoreGetter | ImmutableStoreGetter,
	) {
		this.context = context;
		this.stores = stores;
		this.events = events;
	}
}
