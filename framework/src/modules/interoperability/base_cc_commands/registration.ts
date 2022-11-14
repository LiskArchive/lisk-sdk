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
import {
	CCMStatusCode,
	MAINCHAIN_ID_BUFFER,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	EMPTY_BYTES,
} from '../constants';
import { registrationCCMParamsSchema } from '../schemas';
import {
	CCMRegistrationParams,
	CrossChainMessageContext,
	ImmutableCrossChainMessageContext,
} from '../types';
import { BaseInteroperabilityCCCommand } from '../base_interoperability_cc_commands';
import { ChainAccountUpdatedEvent } from '../events/chain_account_updated';
import { OwnChainAccountStore } from '../stores/own_chain_account';
import { ChannelDataStore } from '../stores/channel_data';
import { ChainAccountStore, ChainStatus } from '../stores/chain_account';

export abstract class BaseCCRegistrationCommand extends BaseInteroperabilityCCCommand {
	public schema = registrationCCMParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_REGISTRATION;
	}

	public async verify(ctx: ImmutableCrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		if (!ccm) {
			throw new Error('CCM to execute registration cross chain command is missing.');
		}
		const ccmRegistrationParams = codec.decode<CCMRegistrationParams>(
			registrationCCMParamsSchema,
			ccm.params,
		);
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(ctx, EMPTY_BYTES);

		const channel = await this.stores.get(ChannelDataStore).get(ctx, ccm.sendingChainID);
		if (channel.inbox.size !== 0) {
			throw new Error('Registration message must be the first message in the inbox.');
		}
		if (ccm.status !== CCMStatusCode.OK) {
			throw new Error('Registration message must have status OK.');
		}
		if (!ownChainAccount.chainID.equals(ccm.receivingChainID)) {
			throw new Error('Registration message must be sent to the chain account ID of the chain.');
		}
		if (ownChainAccount.name !== ccmRegistrationParams.name) {
			throw new Error('Registration message must contain the name of the registered chain.');
		}
		if (!channel.messageFeeTokenID.equals(ccmRegistrationParams.messageFeeTokenID)) {
			throw new Error(
				'Registration message must contain the same message fee token ID as the chain account.',
			);
		}
		if (ownChainAccount.chainID.equals(MAINCHAIN_ID_BUFFER)) {
			if (ccm.nonce !== BigInt(0)) {
				throw new Error('Registration message must have nonce 0.');
			}
		} else if (!ccm.sendingChainID.equals(MAINCHAIN_ID_BUFFER)) {
			throw new Error('Registration message must be sent from the mainchain.');
		}
	}

	public async execute(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		if (!ccm) {
			throw new Error('CCM to execute registration cross chain command is missing.');
		}
		const chainAccount = await this.stores.get(ChainAccountStore).get(ctx, ccm.sendingChainID);
		chainAccount.status = ChainStatus.ACTIVE;
		await this.stores.get(ChainAccountStore).set(ctx, ccm.sendingChainID, chainAccount);

		this.events.get(ChainAccountUpdatedEvent).log(ctx, ccm.sendingChainID, chainAccount);
	}
}
