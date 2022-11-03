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
import { channelTerminatedCCMParamsSchema } from '../schemas';
import { CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED } from '../constants';
import { CCCommandExecuteContext } from '../types';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#channel-terminated-message-1
export abstract class BaseCCChannelTerminatedCommand extends BaseInteroperabilityCCCommand {
	public schema = channelTerminatedCCMParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED;
	}

	public async execute(context: CCCommandExecuteContext): Promise<void> {
		if (!context.ccm) {
			throw new Error(
				`CCM to execute cross chain command '${CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED}' is missing.`,
			);
		}
		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);
		if (await interoperabilityInternalMethod.isLive(context.ccm.sendingChainID, Date.now())) {
			await interoperabilityInternalMethod.createTerminatedStateAccount(
				context,
				context.ccm.sendingChainID,
			);
		}
	}
}
