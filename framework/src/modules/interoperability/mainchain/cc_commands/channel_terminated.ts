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
import { BaseCCChannelTerminatedCommand } from '../../base_classes/cc_commands/channel_terminated';

// LIP-0049 https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#channel-terminated-message-1
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
