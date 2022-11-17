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
import { CCMStatusCode, CROSS_CHAIN_COMMAND_NAME_REGISTRATION, EMPTY_BYTES } from '../../constants';
import { registrationCCMParamsSchema } from '../../schemas';
import { CrossChainMessageContext } from '../../types';
import { BaseInteroperabilityCCCommand } from '../../base_interoperability_cc_commands';
import { SidechainInteroperabilityInternalMethod } from '../internal_method';
import { ChannelDataStore } from '../../stores/channel_data';
import { OwnChainAccountStore } from '../../stores/own_chain_account';

interface CCMRegistrationParams {
	chainID: Buffer;
	name: string;
	messageFeeTokenID: Buffer;
}

export class SidechainCCRegistrationCommand extends BaseInteroperabilityCCCommand<SidechainInteroperabilityInternalMethod> {
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
		const sendingChainChannelAccount = await this.stores
			.get(ChannelDataStore)
			.get(ctx, ccm.sendingChainID);
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(ctx, EMPTY_BYTES);
		if (
			sendingChainChannelAccount.inbox.size !== 1 ||
			ccm.status !== CCMStatusCode.OK ||
			!ownChainAccount.chainID.equals(ccm.receivingChainID) ||
			ownChainAccount.name !== ccmRegistrationParams.name ||
			!sendingChainChannelAccount.messageFeeTokenID.equals(
				ccmRegistrationParams.messageFeeTokenID,
			) ||
			!ccmRegistrationParams.chainID.equals(ctx.chainID)
		) {
			await this.internalMethods.terminateChainInternal(ctx, ccm.sendingChainID);
		}
	}
}
