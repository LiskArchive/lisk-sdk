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

import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { BaseCrossChainUpdateCommand } from '../../base_cross_chain_update_command';
import { CONTEXT_STORE_KEY_CCM_PROCESSING } from '../../constants';
import { CrossChainUpdateTransactionParams } from '../../types';
import { getIDFromCCMBytes } from '../../utils';
import { SidechainInteroperabilityInternalMethod } from '../internal_method';

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md#sidechaincrosschainupdate

export class SubmitSidechainCrossChainUpdateCommand extends BaseCrossChainUpdateCommand<SidechainInteroperabilityInternalMethod> {
	public async verify(
		context: CommandVerifyContext<CrossChainUpdateTransactionParams>,
	): Promise<VerificationResult> {
		await this.verifyCommon(context, false);

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(
		context: CommandExecuteContext<CrossChainUpdateTransactionParams>,
	): Promise<void> {
		const [decodedCCMs, ok] = await this.beforeCrossChainMessagesExecution(context, false);
		if (!ok) {
			return;
		}
		const { params } = context;

		try {
			// Update the context to indicate that now we start the CCM processing.
			context.contextStore.set(CONTEXT_STORE_KEY_CCM_PROCESSING, true);

			for (let i = 0; i < decodedCCMs.length; i += 1) {
				const ccm = decodedCCMs[i];
				const ccmBytes = params.inboxUpdate.crossChainMessages[i];
				const ccmID = getIDFromCCMBytes(ccmBytes);
				const ccmContext = {
					...context,
					ccm,
					eventQueue: context.eventQueue.getChildQueue(ccmID),
				};

				await this.apply(ccmContext);

				// We append at the very end. This implies that if the message leads to a chain termination,
				// it is still possible to recover it (because the channel terminated message
				// would refer to an inbox where the message has not been appended yet).
				await this.internalMethod.appendToInboxTree(context, params.sendingChainID, ccmBytes);
			}
		} finally {
			// Update the context to indicate that now we stop the CCM processing.
			context.contextStore.delete(CONTEXT_STORE_KEY_CCM_PROCESSING);
		}

		await this.afterCrossChainMessagesExecution(context);
	}
}
