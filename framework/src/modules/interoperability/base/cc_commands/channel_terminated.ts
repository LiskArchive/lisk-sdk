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

import { codec } from '@liskhq/lisk-codec';
import { BaseInteroperabilityCCCommand } from '../../base_interoperability_cc_commands';
import { channelTerminatedCCMParamsSchema } from '../../schemas';
import { CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED } from '../../constants';
import { CCCommandExecuteContext, ChannelTerminatedCCMParams } from '../../types';

export abstract class BaseCCChannelTerminatedCommand extends BaseInteroperabilityCCCommand {
	public schema = channelTerminatedCCMParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED;
	}

	public async execute(context: CCCommandExecuteContext): Promise<void> {
		const interoperabilityStore = this.getInteroperabilityStore(context);
		if (await interoperabilityStore.isLive(context.chainID, Date.now())) {
			if (!context.ccm) {
				throw new Error('CCM to execute channel terminated cross chain command is missing.');
			}
			const ccmParamsChannel = await interoperabilityStore.getChannel(context.chainID);
			const channelTerminatedCCMParams = codec.decode<ChannelTerminatedCCMParams>(
				this.schema,
				context.ccm.params,
			);
			await interoperabilityStore.createTerminatedStateAccount(
				context.ccm.sendingChainID,
				channelTerminatedCCMParams.stateRoot,
			);
			await interoperabilityStore.createTerminatedOutboxAccount(
				context.ccm.sendingChainID,
				ccmParamsChannel.outbox.root,
				ccmParamsChannel.outbox.size,
				channelTerminatedCCMParams.inboxSize,
			);
		}
	}
}
