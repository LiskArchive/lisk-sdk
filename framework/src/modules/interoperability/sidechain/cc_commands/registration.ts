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
import { SidechainInteroperabilityStore } from '../store';
import { registrationCCMParamsSchema } from '../../schema';
import { CCCommandExecuteContext, MessageFeeTokenID } from '../../types';
import { BaseInteroperableAPI } from '../../base_interoperable_api';
import { SubStore } from '../../../../node/state_machine/types';
import { createCCMsgBeforeSendContext } from '../../context';

interface CCMRegistrationParams {
	networkID: Buffer;
	name: string;
	messageFeeTokenID: MessageFeeTokenID;
}

export class SidechainCCRegistrationCommand extends BaseCCCommand {
	public ID = CROSS_CHAIN_COMMAND_ID_REGISTRATION;
	public name = 'registration';
	public schema = registrationCCMParamsSchema;
	private readonly _interoperableCCAPIs: Map<number, BaseInteroperableAPI>;

	public constructor(moduleID: number, interoperableCCAPIs: Map<number, BaseInteroperableAPI>) {
		super(moduleID);
		this._interoperableCCAPIs = interoperableCCAPIs;
	}

	public async execute(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm } = ctx;
		const decodedParams = codec.decode<CCMRegistrationParams>(
			registrationCCMParamsSchema,
			ccm.params,
		);
		const interoperabilityStore = this._getInteroperabilityStore(ctx.getStore);
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
			!decodedParams.networkID.equals(ctx.networkIdentifier)
		) {
			const beforeSendContext = createCCMsgBeforeSendContext({
				ccm,
				eventQueue: ctx.eventQueue,
				getAPIContext: ctx.getAPIContext,
				getStore: ctx.getStore,
				logger: ctx.logger,
				networkIdentifier: ctx.networkIdentifier,
				feeAddress: ctx.feeAddress,
			});
			await interoperabilityStore.terminateChainInternal(ccm.sendingChainID, beforeSendContext);
		}
	}

	private _getInteroperabilityStore(getStore: (moduleID: number, storePrefix: number) => SubStore) {
		return new SidechainInteroperabilityStore(this.moduleID, getStore, this._interoperableCCAPIs);
	}
}
