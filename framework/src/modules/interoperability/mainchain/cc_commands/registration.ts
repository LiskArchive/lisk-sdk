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
import { CCM_STATUS_OK, CROSS_CHAIN_COMMAND_NAME_REGISTRATION, EMPTY_BYTES } from '../../constants';
import { registrationCCMParamsSchema } from '../../schemas';
import { CrossChainMessageContext } from '../../types';
import { createCCMsgBeforeSendContext } from '../../context';
import { BaseInteroperabilityCCCommand } from '../../base_interoperability_cc_commands';
import { MainchainInteroperabilityInternalMethod } from '../store';
import { StoreGetter } from '../../../base_store';
import { ChannelDataStore } from '../../stores/channel_data';
import { OwnChainAccountStore } from '../../stores/own_chain_account';

interface CCMRegistrationParams {
	chainID: Buffer;
	name: string;
	messageFeeTokenID: Buffer;
}

export class MainchainCCRegistrationCommand extends BaseInteroperabilityCCCommand {
	public schema = registrationCCMParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_REGISTRATION;
	}

	public async execute(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		if (!ccm) {
			throw new Error('CCM to execute registration cross chain command is missing.');
		}
		const ccmRegistrationParams = codec.decode<CCMRegistrationParams>(
			registrationCCMParamsSchema,
			ccm.params,
		);
		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(ctx);
		const sendingChainChannelAccount = await this.stores
			.get(ChannelDataStore)
			.get(ctx, ccm.sendingChainID);
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(ctx, EMPTY_BYTES);

		if (
			sendingChainChannelAccount.inbox.size !== 1 ||
			ccm.status !== CCM_STATUS_OK ||
			!ownChainAccount.chainID.equals(ccm.receivingChainID) ||
			ownChainAccount.name !== ccmRegistrationParams.name ||
			!sendingChainChannelAccount.messageFeeTokenID.equals(
				ccmRegistrationParams.messageFeeTokenID,
			) ||
			!ccmRegistrationParams.chainID.equals(ctx.chainID) ||
			ccm.nonce !== BigInt(0) // Only in mainchain
		) {
			const beforeSendContext = createCCMsgBeforeSendContext({
				ccm,
				eventQueue: ctx.eventQueue,
				getMethodContext: ctx.getMethodContext,
				getStore: ctx.getStore,
				logger: ctx.logger,
				chainID: ctx.chainID,
				feeAddress: ctx.transaction.senderAddress,
			});
			await interoperabilityInternalMethod.terminateChainInternal(
				ccm.sendingChainID,
				beforeSendContext,
			);
		}
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
