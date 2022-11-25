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

import { validator } from '@liskhq/lisk-validator';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { BaseCrossChainUpdateCommand } from '../../base_cross_chain_update_command';
import { CONTEXT_STORE_KEY_CCM_PROCESSING } from '../../constants';
import { crossChainUpdateTransactionParams } from '../../schemas';
import { CrossChainUpdateTransactionParams } from '../../types';
import { getMainchainID } from '../../utils';
import { SidechainInteroperabilityInternalMethod } from '../internal_method';

export class SidechainCCUpdateCommand extends BaseCrossChainUpdateCommand<SidechainInteroperabilityInternalMethod> {
	public async verify(
		context: CommandVerifyContext<CrossChainUpdateTransactionParams>,
	): Promise<VerificationResult> {
		const { params } = context;
		validator.validate<CrossChainUpdateTransactionParams>(
			crossChainUpdateTransactionParams,
			context.params,
		);

		if (!params.sendingChainID.equals(getMainchainID(context.chainID))) {
			throw new Error('Only the mainchain can send a sidechain cross-chain update.');
		}
		const isLive = await this.internalMethod.isLive(context, params.sendingChainID);
		if (!isLive) {
			throw new Error('The sending chain is not live.');
		}

		await this.verifyCommon(context);

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(
		context: CommandExecuteContext<CrossChainUpdateTransactionParams>,
	): Promise<void> {
		const [decodedCCMs, ok] = await this.executeCommon(context, false);
		if (!ok) {
			return;
		}
		const { params } = context;

		try {
			context.contextStore.set(CONTEXT_STORE_KEY_CCM_PROCESSING, true);
			for (let i = 0; i < decodedCCMs.length; i += 1) {
				const ccm = decodedCCMs[i];
				const ccmBytes = params.inboxUpdate.crossChainMessages[i];
				const ccmContext = {
					...context,
					ccm,
				};

				await this.apply(ccmContext);
				await this.internalMethod.appendToInboxTree(context, params.sendingChainID, ccmBytes);
			}
		} finally {
			context.contextStore.delete(CONTEXT_STORE_KEY_CCM_PROCESSING);
		}
	}
}
