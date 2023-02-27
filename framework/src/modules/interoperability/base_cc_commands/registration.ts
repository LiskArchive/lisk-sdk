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
import { CCMStatusCode, CROSS_CHAIN_COMMAND_NAME_REGISTRATION, EMPTY_BYTES } from '../constants';
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
import { BaseInteroperabilityInternalMethod } from '../base_interoperability_internal_methods';
import { getMainchainID } from '../utils';

export abstract class BaseCCRegistrationCommand<
	T extends BaseInteroperabilityInternalMethod,
> extends BaseInteroperabilityCCCommand<T> {
	public schema = registrationCCMParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_REGISTRATION;
	}

	/**
	 *
	 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#verification
	 */
	public async verify(ctx: ImmutableCrossChainMessageContext): Promise<void> {
		const { ccm, ccu } = ctx;
		if (!ccm) {
			throw new Error('CCM to execute registration cross chain command is missing.');
		}
		const ccmRegistrationParams = codec.decode<CCMRegistrationParams>(
			registrationCCMParamsSchema,
			ccm.params,
		);
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(ctx, EMPTY_BYTES);

		const chainAccount = await this.stores.get(ChainAccountStore).get(ctx, ccm.sendingChainID);
		if (!chainAccount) {
			throw new Error('Registration message must be sent from a registered chain.');
		}
		if (!ccm.sendingChainID.equals(ccu.sendingChainID)) {
			throw new Error('Registration message must be sent from a direct channel.');
		}
		if (chainAccount.status !== ChainStatus.REGISTERED) {
			throw new Error(
				`Registration message must be sent from a chain with status ${ChainStatus.REGISTERED}.`,
			);
		}

		const channel = await this.stores.get(ChannelDataStore).get(ctx, ccm.sendingChainID);
		if (channel.inbox.size !== 0) {
			throw new Error('Registration message must be the first message in the inbox.');
		}
		if (ccm.status !== CCMStatusCode.OK) {
			throw new Error(`Registration message must have status ${CCMStatusCode.OK}.`);
		}
		if (!ownChainAccount.chainID.equals(ccm.receivingChainID)) {
			throw new Error('Registration message must be sent to the chain account ID of the chain.');
		}
		if (!ownChainAccount.chainID.equals(ccmRegistrationParams.chainID)) {
			throw new Error('Registration message must contain the chain ID of the receiving chain.');
		}
		if (ownChainAccount.name !== ccmRegistrationParams.name) {
			throw new Error('Registration message must contain the name of the registered chain.');
		}
		if (!channel.messageFeeTokenID.equals(ccmRegistrationParams.messageFeeTokenID)) {
			throw new Error(
				'Registration message must contain the same message fee token ID as the channel account.',
			);
		}
		if (channel.minReturnFeePerByte !== ccmRegistrationParams.minReturnFeePerByte) {
			throw new Error(
				'Registration message must contain the same minimum return fee per byte as the channel account.',
			);
		}
		const mainchainID = getMainchainID(ctx.chainID);
		if (ownChainAccount.chainID.equals(mainchainID)) {
			if (ccm.nonce !== BigInt(0)) {
				throw new Error('Registration message must have nonce 0.');
			}
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
