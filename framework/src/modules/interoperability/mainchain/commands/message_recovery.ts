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

import { NotFoundError } from '@liskhq/lisk-chain';
import { COMMAND_ID_MESSAGE_RECOVERY } from '../../constants';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
} from '../../../../node/state_machine/types';
import { StoreCallback, MessageRecoveryParams, TerminatedOutboxAccount } from '../../types';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { MainchainInteroperabilityStore } from '../store';
import { getIDAsKeyForStore, verifyMessageRecovery } from '../../utils';

export class MessageRecoveryCommand extends BaseInteroperabilityCommand {
	public id = COMMAND_ID_MESSAGE_RECOVERY;
	public name = 'messageRecovery';

	public async verify(
		context: CommandVerifyContext<MessageRecoveryParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, idxs, crossChainMessages, siblingHashes },
			getStore,
		} = context;
		const chainIdAsBuffer = getIDAsKeyForStore(chainID);
		const interoperabilityStore = this.getInteroperabilityStore(getStore);
		let terminatedChainOutboxAccount: TerminatedOutboxAccount;

		try {
			terminatedChainOutboxAccount = await interoperabilityStore.getTerminatedOutboxAccount(
				chainIdAsBuffer,
			);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return verifyMessageRecovery({ idxs, crossChainMessages, siblingHashes });
		}

		return verifyMessageRecovery(
			{ idxs, crossChainMessages, siblingHashes },
			terminatedChainOutboxAccount,
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async execute(_context: CommandExecuteContext<MessageRecoveryParams>): Promise<void> {}

	protected getInteroperabilityStore(getStore: StoreCallback): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
