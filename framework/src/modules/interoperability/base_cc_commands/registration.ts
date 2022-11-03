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
	CCM_STATUS_OK,
	CHAIN_ACTIVE,
	CHAIN_ID_MAINCHAIN,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
} from '../constants';
import { registrationCCMParamsSchema } from '../schemas';
import { CCCommandExecuteContext, CCMRegistrationParams } from '../types';
import { BaseInteroperabilityCCCommand } from '../base_interoperability_cc_commands';
import { ChainAccountUpdatedEvent } from '../events/chain_account_updated';

export abstract class BaseCCRegistrationCommand extends BaseInteroperabilityCCCommand {
	public schema = registrationCCMParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_REGISTRATION;
	}

	public async verify(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm } = ctx;
		if (!ccm) {
			throw new Error('CCM to execute registration cross chain command is missing.');
		}
		const ccmRegistrationParams = codec.decode<CCMRegistrationParams>(
			registrationCCMParamsSchema,
			ccm.params,
		);
		const interoperabilityStore = this.getInteroperabilityStore(ctx);
		const ownChainAccount = await interoperabilityStore.getOwnChainAccount();

		const channel = await interoperabilityStore.getChannel(ccm.sendingChainID);
		if (channel.inbox.size !== 0) {
			throw new Error('Registration message must be the first message in the inbox.');
		}
		if (ccm.status !== CCM_STATUS_OK) {
			throw new Error('Registration message must have status OK.');
		}
		if (ownChainAccount.chainID !== ccm.receivingChainID) {
			throw new Error('Registration message must be sent to the chain account ID of the chain.');
		}
		if (ownChainAccount.name !== ccmRegistrationParams.name) {
			throw new Error('Registration message must contain the name of the registered chain.');
		}
		if (channel.messageFeeTokenID !== ccmRegistrationParams.messageFeeTokenID) {
			throw new Error(
				'Registration message must contain the same message fee token ID as the chain account.',
			);
		}
		if (ownChainAccount.chainID === CHAIN_ID_MAINCHAIN) {
			if (ccm.nonce !== BigInt(0)) {
				throw new Error('Registration message must have nonce 0.');
			}
		} else if (ccm.sendingChainID !== CHAIN_ID_MAINCHAIN) {
			throw new Error('Registration message must be sent from the mainchain.');
		}
	}

	public async execute(ctx: CCCommandExecuteContext): Promise<void> {
		const { ccm } = ctx;
		if (!ccm) {
			throw new Error('CCM to execute registration cross chain command is missing.');
		}
		const interoperabilityStore = this.getInteroperabilityStore(ctx);
		const chainAccount = await interoperabilityStore.getChainAccount(ccm.sendingChainID);
		chainAccount.status = CHAIN_ACTIVE;

		this.events.get(ChainAccountUpdatedEvent).log(ctx, ccm.sendingChainID, chainAccount);
	}
}
