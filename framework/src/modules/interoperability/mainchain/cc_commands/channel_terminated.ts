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

import { MainchainInteroperabilityInternalMethod } from '../internal_method';
import { BaseCCChannelTerminatedCommand } from '../../base_cc_commands/channel_terminated';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#channel-terminated-message-1
export class MainchainCCChannelTerminatedCommand extends BaseCCChannelTerminatedCommand {
	protected getInteroperabilityInternalMethod(): MainchainInteroperabilityInternalMethod {
		return new MainchainInteroperabilityInternalMethod(
			this.stores,
			this.events,
			this.interoperableCCMethods,
		);
	}
}
