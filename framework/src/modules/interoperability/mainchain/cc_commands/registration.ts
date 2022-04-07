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
import { BaseCCCommand } from '../../base_cross_chain_command';
import { CROSS_CHAIN_COMMAND_ID_REGISTRATION } from '../../constants';
import { MainchainInteroperabilityStore } from '../store';
import { registrationCCMParamsSchema } from '../../schema';
import { CCCommandExecuteContext, MessageFeeTokenID } from '../../types';
import { createBeforeSendCCMsgAPIContext } from '../../../../testing';

interface CCMRegistrationParams {
	networkID: Buffer;
	name: string;
	messageFeeTokenID: MessageFeeTokenID;
}

export class CCRegistrationCommand extends BaseCCCommand {
	public ID = CROSS_CHAIN_COMMAND_ID_REGISTRATION;
	public name = 'registration';
	public schema = registrationCCMParamsSchema;

	public async execute(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm } = ctx;
		const decodedParams = codec.decode<CCMRegistrationParams>(
			registrationCCMParamsSchema,
			ccm.params,
		);
		const interoperabilityStore = new MainchainInteroperabilityStore(this.moduleID, ctx.getStore);
		const sendingChainChannelAccount = await interoperabilityStore.getChannel(ccm.sendingChainID);
		const ownChainAccount = await interoperabilityStore.getOwnChainAccount();
		if (
			sendingChainChannelAccount.inbox.size !== 1 ||
			ownChainAccount.id !== ccm.receivingChainID ||
			ownChainAccount.name !== decodedParams.name ||
			(sendingChainChannelAccount.messageFeeTokenID.chainID !==
				decodedParams.messageFeeTokenID.chainID &&
				sendingChainChannelAccount.messageFeeTokenID.localID !==
					decodedParams.messageFeeTokenID.localID) ||
			!decodedParams.networkID.equals(ctx.networkIdentifier) ||
			ccm.nonce !== BigInt(0) // Only in mainchain
		) {
			const beforeSendContext = createBeforeSendCCMsgAPIContext({
				ccm,
				feeAddress: ctx.feeAddress,
				eventQueue: ctx.eventQueue,
				getAPIContext: ctx.getAPIContext,
				logger: ctx.logger,
				networkIdentifier: ctx.networkIdentifier,
			});
			await interoperabilityStore.terminateChainInternal(
				ccm.sendingChainID,
				beforeSendContext,
				ctx.interoperableModules,
			);
		}
	}
}
