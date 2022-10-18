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

import { SidechainInteroperabilityStore } from './store';
import { ImmutableStoreGetter, StoreGetter } from '../../base_store';
import { BaseInteroperabilityMethod } from '../base_interoperability_method';

export class SidechainInteroperabilityMethod extends BaseInteroperabilityMethod<SidechainInteroperabilityStore> {
	protected getInteroperabilityStore = (
		context: StoreGetter | ImmutableStoreGetter,
	): SidechainInteroperabilityStore =>
		new SidechainInteroperabilityStore(
			this.stores,
			context,
			this.interoperableCCMethods,
			this.events,
		);
}
