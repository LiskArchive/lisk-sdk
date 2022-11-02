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
import { BaseInteroperabilityCCCommand } from '../../base_interoperability_cc_commands';
import { CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED } from '../../constants';
import { channelTerminatedCCMParamsSchema } from '../../schemas';
import { CCCommandExecuteContext } from '../../types';
import { MainchainInteroperabilityInternalMethod } from '../store';

export class MainchainCCChannelTerminatedCommand extends BaseInteroperabilityCCCommand {
	public schema = channelTerminatedCCMParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED;
	}

	public async execute(context: CCCommandExecuteContext): Promise<void> {
		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);
		if (!context.ccm) {
			throw new Error('CCM to execute channel terminated cross chain command is missing.');
		}
		await interoperabilityInternalMethod.createTerminatedStateAccount(
			context,
			context.ccm.sendingChainID,
		);
	}

	protected getInteroperabilityInternalMethod(
		context: StoreGetter,
	): MainchainInteroperabilityInternalMethod {
		return new MainchainInteroperabilityInternalMethod(
			this.stores,
			this.events,
			context,
			this.interoperableCCMethods,
		);
	}
}
