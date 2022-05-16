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

import { BaseInteroperabilityCCCommand } from '../../base_interoperability_cc_commands';
import { CROSS_CHAIN_COMMAND_ID_CHANNEL_TERMINATED } from '../../constants';
import { channelTerminatedCCMParamsSchema } from '../../schema';
import { CCCommandExecuteContext, StoreCallback } from '../../types';
import { MainchainInteroperabilityStore } from '../store';

export class MainchainCCChannelTerminatedCommand extends BaseInteroperabilityCCCommand {
	public ID = CROSS_CHAIN_COMMAND_ID_CHANNEL_TERMINATED;
	public name = 'channelTerminated';
	public schema = channelTerminatedCCMParamsSchema;

	public async execute(context: CCCommandExecuteContext): Promise<void> {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);
		if (!context.ccm) {
			throw new Error('CCM is missing to execute channel terminated cross chain command.');
		}
		await interoperabilityStore.createTerminatedStateAccount(context.ccm.sendingChainID);
	}

	protected getInteroperabilityStore(getStore: StoreCallback): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
