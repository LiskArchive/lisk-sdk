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
import { ChainAccountStore, ChainStatus } from '../../stores/chain_account';
import { ChainValidatorsStore } from '../../stores/chain_validators';
import { CrossChainUpdateTransactionParams } from '../../types';
import {
	emptyActiveValidatorsUpdate,
	getIDFromCCMBytes,
	getMainchainID,
	isInboxUpdateEmpty,
} from '../../utils';
import { SidechainInteroperabilityInternalMethod } from '../internal_method';

export class SubmitSidechainCrossChainUpdateCommand extends BaseCrossChainUpdateCommand<SidechainInteroperabilityInternalMethod> {
	public async verify(
		context: CommandVerifyContext<CrossChainUpdateTransactionParams>,
	): Promise<VerificationResult> {
		const { params } = context;

		if (params.certificate.length === 0 && isInboxUpdateEmpty(params.inboxUpdate)) {
			throw new Error(
				'A cross-chain update must contain a non-empty certificate and/or a non-empty inbox update.',
			);
		}

		if (!params.sendingChainID.equals(getMainchainID(context.chainID))) {
			throw new Error('Only the mainchain can send a sidechain cross-chain update.');
		}

		const sendingChainExist = await this.stores
			.get(ChainAccountStore)
			.has(context, params.sendingChainID);
		if (!sendingChainExist) {
			throw new Error('The mainchain is not registered.');
		}

		const isLive = await this.internalMethod.isLive(context, params.sendingChainID);
		if (!isLive) {
			throw new Error('The sending chain is not live.');
		}

		const sendingChainAccount = await this.stores
			.get(ChainAccountStore)
			.get(context, params.sendingChainID);
		if (sendingChainAccount.status === ChainStatus.REGISTERED && params.certificate.length === 0) {
			throw new Error(
				'Cross-chain updates from chains with status CHAIN_STATUS_REGISTERED must contain a non-empty certificate.',
			);
		}
		if (params.certificate.length > 0) {
			await this.internalMethod.verifyCertificate(context, params, context.header.timestamp);
		}
		const sendingChainValidators = await this.stores
			.get(ChainValidatorsStore)
			.get(context, params.sendingChainID);
		if (
			!emptyActiveValidatorsUpdate(params.activeValidatorsUpdate) ||
			params.certificateThreshold !== sendingChainValidators.certificateThreshold
		) {
			await this.internalMethod.verifyValidatorsUpdate(context, params);
		}

		if (!isInboxUpdateEmpty(params.inboxUpdate)) {
			this.internalMethod.verifyOutboxRootWitness(context, params);
		}

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

		await this.afterExecuteCommon(context);
	}
}
