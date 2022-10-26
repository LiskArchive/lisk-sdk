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

import { StoreGetter } from '../../../base_store';
import { MainchainInteroperabilityStore } from '../store';
import { BaseCCChannelTerminatedCommand } from '../../base/cc_commands/channel_terminated';

export class MainchainCCChannelTerminatedCommand extends BaseCCChannelTerminatedCommand {
	protected getInteroperabilityStore(context: StoreGetter): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(
			this.stores,
			context,
			this.interoperableCCMethods,
			this.events,
		);
	}
}
