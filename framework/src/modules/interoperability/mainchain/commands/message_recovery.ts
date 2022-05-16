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
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { hash } from '@liskhq/lisk-cryptography';
import { CCM_STATUS_OK, COMMAND_ID_MESSAGE_RECOVERY } from '../../constants';
import { ccmSchema } from '../../schema';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../node/state_machine/types';
import { CCMsg, StoreCallback, MessageRecoveryParams } from '../../types';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { MainchainInteroperabilityStore } from '../store';
import { getIDAsKeyForStore } from '../../utils';

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

		const doesTerminatedOutboxAccountExist = await interoperabilityStore.hasTerminatedOutboxAccount(
			chainIdAsBuffer,
		);
		if (!doesTerminatedOutboxAccountExist) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Terminated outbox account does not exist'),
			};
		}

		const terminatedChainOutboxAccount = await interoperabilityStore.getTerminatedOutboxAccount(
			chainIdAsBuffer,
		);
		for (const index of idxs) {
			if (index < terminatedChainOutboxAccount.partnerChainInboxSize) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Cross chain messages are still pending'),
				};
			}
		}

		const deserializedCCMs = crossChainMessages.map(serializedCcm =>
			codec.decode<CCMsg>(ccmSchema, serializedCcm),
		);
		for (const ccm of deserializedCCMs) {
			if (ccm.status !== CCM_STATUS_OK) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Cross chain message that needs to be recovered is not valid'),
				};
			}
		}

		const proof = {
			size: terminatedChainOutboxAccount.outboxSize,
			idxs,
			siblingHashes,
		};
		const hashedCCMs = crossChainMessages.map(ccm => hash(ccm));
		const isVerified = regularMerkleTree.verifyDataBlock(
			hashedCCMs,
			proof,
			terminatedChainOutboxAccount.outboxRoot,
		);
		if (!isVerified) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('The sidechain outbox root is not valid'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async execute(_context: CommandExecuteContext<MessageRecoveryParams>): Promise<void> {}

	protected getInteroperabilityStore(getStore: StoreCallback): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
