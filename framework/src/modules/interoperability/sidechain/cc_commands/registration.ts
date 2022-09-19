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
import { CCM_STATUS_OK, CROSS_CHAIN_COMMAND_NAME_REGISTRATION } from '../../constants';
import { registrationCCMParamsSchema } from '../../schemas';
import { CCCommandExecuteContext, MessageFeeTokenID } from '../../types';
import { createCCMsgBeforeSendContext } from '../../context';
import { BaseInteroperabilityCCCommand } from '../../base_interoperability_cc_commands';
import { SidechainInteroperabilityStore } from '../store';
import { ImmutableStoreGetter, StoreGetter } from '../../../base_store';

interface CCMRegistrationParams {
	networkID: Buffer;
	name: string;
	messageFeeTokenID: MessageFeeTokenID;
}

export class SidechainCCRegistrationCommand extends BaseInteroperabilityCCCommand {
	public schema = registrationCCMParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_REGISTRATION;
	}

	public async execute(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm } = ctx;
		if (!ccm) {
			throw new Error('CCM to execute registration cross chain command is missing.');
		}
		const decodedParams = codec.decode<CCMRegistrationParams>(
			registrationCCMParamsSchema,
			ccm.params,
		);
		const interoperabilityStore = this.getInteroperabilityStore(ctx);
		const sendingChainChannelAccount = await interoperabilityStore.getChannel(ccm.sendingChainID);
		const ownChainAccount = await interoperabilityStore.getOwnChainAccount();
		if (
			sendingChainChannelAccount.inbox.size !== 1 ||
			ccm.status !== CCM_STATUS_OK ||
			!ownChainAccount.id.equals(ccm.receivingChainID) ||
			ownChainAccount.name !== decodedParams.name ||
			(!sendingChainChannelAccount.messageFeeTokenID.chainID.equals(
				decodedParams.messageFeeTokenID.chainID,
			) &&
				!sendingChainChannelAccount.messageFeeTokenID.localID.equals(
					decodedParams.messageFeeTokenID.localID,
				)) ||
			!decodedParams.networkID.equals(ctx.chainID)
		) {
			const beforeSendContext = createCCMsgBeforeSendContext({
				ccm,
				eventQueue: ctx.eventQueue,
				getMethodContext: ctx.getMethodContext,
				getStore: ctx.getStore,
				logger: ctx.logger,
				chainID: ctx.chainID,
				feeAddress: ctx.feeAddress,
			});
			await interoperabilityStore.terminateChainInternal(ccm.sendingChainID, beforeSendContext);
		}
	}

	protected getInteroperabilityStore(
		context: StoreGetter | ImmutableStoreGetter,
	): SidechainInteroperabilityStore {
		return new SidechainInteroperabilityStore(this.stores, context, this.interoperableCCMethods);
	}
}
