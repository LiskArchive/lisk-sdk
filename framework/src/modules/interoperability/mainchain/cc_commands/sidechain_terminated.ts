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
import {
	CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED,
	MAINCHAIN_ID_BUFFER,
} from '../../constants';
import { sidechainTerminatedCCMParamsSchema } from '../../schemas';
import { TerminatedStateStore } from '../../stores/terminated_state';
import { CrossChainMessageContext } from '../../types';
import { MainchainInteroperabilityInternalMethod } from '../internal_method';

interface CCMSidechainTerminatedParams {
	chainID: Buffer;
	stateRoot: Buffer;
}

export class MainchainCCSidechainTerminatedCommand extends BaseInteroperabilityCCCommand {
	public schema = sidechainTerminatedCCMParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_SIDECHAIN_TERMINATED;
	}

	public async execute(context: CrossChainMessageContext): Promise<void> {
		const { ccm } = context;
		if (!ccm) {
			throw new Error('CCM to execute sidechain terminated cross chain command is missing.');
		}
		const decodedParams = codec.decode<CCMSidechainTerminatedParams>(
			sidechainTerminatedCCMParamsSchema,
			ccm.params,
		);
		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod();

		if (ccm.sendingChainID.equals(MAINCHAIN_ID_BUFFER)) {
			const isTerminated = await this.stores
				.get(TerminatedStateStore)
				.has(context, decodedParams.chainID);
			if (isTerminated) {
				return;
			}
			await interoperabilityInternalMethod.createTerminatedStateAccount(
				context,
				decodedParams.chainID,
				decodedParams.stateRoot,
			);
		} else {
			await interoperabilityInternalMethod.terminateChainInternal(context, ccm.sendingChainID);
		}
	}

	protected getInteroperabilityInternalMethod(): MainchainInteroperabilityInternalMethod {
		return new MainchainInteroperabilityInternalMethod(
			this.stores,
			this.events,
			this.interoperableCCMethods,
		);
	}
}
