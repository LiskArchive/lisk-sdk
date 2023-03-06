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
import { CCMStatusCode, CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED } from '../../constants';
import { sidechainTerminatedCCMParamsSchema } from '../../schemas';
import { CCCommandExecuteContext, ImmutableCrossChainMessageContext } from '../../types';
import { getMainchainID } from '../../utils';
import { SidechainInteroperabilityInternalMethod } from '../internal_method';

interface CCMSidechainTerminatedParams {
	chainID: Buffer;
	stateRoot: Buffer;
}

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
		const isLive = await this.internalMethods.isLive(context, context.params.chainID);
		if (!isLive) {
			return;
		}
		await this.internalMethods.createTerminatedStateAccount(
			context,
			context.params.chainID,
			context.params.stateRoot,
		);
	}
}
