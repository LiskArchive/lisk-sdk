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
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED,
	EMPTY_HASH,
} from '../../constants';
import { sidechainTerminatedCCMParamsSchema } from '../../schemas';
import { CCCommandExecuteContext, ImmutableCrossChainMessageContext } from '../../types';
import { getMainchainID } from '../../utils';
import { SidechainInteroperabilityInternalMethod } from '../internal_method';
import { TerminatedStateStore } from '../../stores/terminated_state';

interface CCMSidechainTerminatedParams {
	chainID: Buffer;
	stateRoot: Buffer;
}

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#sidechain-terminated-message-1
export class SidechainCCSidechainTerminatedCommand extends BaseInteroperabilityCCCommand<SidechainInteroperabilityInternalMethod> {
	public schema = sidechainTerminatedCCMParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(ctx: ImmutableCrossChainMessageContext): Promise<void> {
		if (ctx.ccm.status !== CCMStatusCode.OK) {
			throw new Error('Sidechain terminated message must have status OK.');
		}
		if (!ctx.ccm.sendingChainID.equals(getMainchainID(ctx.chainID))) {
			throw new Error('Sidechain terminated message must be sent from the mainchain.');
		}
	}

	public async execute(
		context: CCCommandExecuteContext<CCMSidechainTerminatedParams>,
	): Promise<void> {
		const { chainID, stateRoot } = context.params;

		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		const terminatedStateAccountExists = await terminatedStateSubstore.has(context, chainID);

		if (terminatedStateAccountExists) {
			const terminatedStateAccount = await terminatedStateSubstore.get(context, chainID);
			if (terminatedStateAccount.initialized) {
				return;
			}

			await terminatedStateSubstore.set(context, chainID, {
				stateRoot,
				mainchainStateRoot: EMPTY_HASH,
				initialized: true,
			});
		} else {
			await this.internalMethods.createTerminatedStateAccount(context, chainID, stateRoot);
		}
	}
}
