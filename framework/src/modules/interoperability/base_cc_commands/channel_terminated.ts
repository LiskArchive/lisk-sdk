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

import { BaseInteroperabilityCCCommand } from '../base_interoperability_cc_commands';
import { CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED } from '../constants';
import { CCCommandExecuteContext } from '../types';
import { BaseInteroperabilityInternalMethod } from '../base_interoperability_internal_methods';
import { TerminatedStateStore } from '../stores/terminated_state';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#channel-terminated-message-1
export abstract class BaseCCChannelTerminatedCommand<
	T extends BaseInteroperabilityInternalMethod,
> extends BaseInteroperabilityCCCommand<T> {
	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED;
	}

	public async execute(context: CCCommandExecuteContext<void>): Promise<void> {
		if (!context.ccm) {
			throw new Error(
				`CCM to execute cross chain command '${CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED}' is missing.`,
			);
		}

		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		const terminatedStateAccountExists = await terminatedStateSubstore.has(
			context,
			context.ccm.sendingChainID,
		);

		if (terminatedStateAccountExists) {
			return;
		}

		await this.internalMethods.createTerminatedStateAccount(context, context.ccm.sendingChainID);
	}
}
