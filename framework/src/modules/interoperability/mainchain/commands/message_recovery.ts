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
import {
	CCM_STATUS_RECOVERED,
	CHAIN_ACTIVE,
	COMMAND_ID_MESSAGE_RECOVERY,
	EMPTY_FEE_ADDRESS,
} from '../../constants';
import { ccmSchema, messageRecoveryParams } from '../../schema';
import { CommandExecuteContext, VerificationResult } from '../../../../node/state_machine';
import { CCMsg, StoreCallback, MessageRecoveryParams } from '../../types';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { MainchainInteroperabilityStore } from '../store';
import { getIDAsKeyForStore, swapReceivingAndSendingChainIDs } from '../../utils';
import { BaseInteroperableAPI } from '../../base_interoperable_api';

export class MessageRecoveryCommand extends BaseInteroperabilityCommand {
	public id = COMMAND_ID_MESSAGE_RECOVERY;
	public name = 'messageRecovery';
	public schema = messageRecoveryParams;

	// TODO
	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(): Promise<VerificationResult> {
		throw new Error('Method not implemented.');
	}

	public async execute(context: CommandExecuteContext<MessageRecoveryParams>): Promise<void> {
		const { transaction, params, getAPIContext, logger, networkIdentifier, getStore } = context;
		const apiContext = getAPIContext();

		const chainIdAsBuffer = getIDAsKeyForStore(params.chainID);

		const updatedCCMs: Buffer[] = [];
		const deserializedCCMs = params.crossChainMessages.map(serializedCCMsg =>
			codec.decode<CCMsg>(ccmSchema, serializedCCMsg),
		);
		for (const ccm of deserializedCCMs) {
			const apisWithBeforeRecoverCCM = [...this.interoperableCCAPIs.values()].filter(api =>
				Reflect.has(api, 'beforeRecoverCCM'),
			) as Pick<Required<BaseInteroperableAPI>, 'beforeRecoverCCM'>[];
			for (const api of apisWithBeforeRecoverCCM) {
				await api.beforeRecoverCCM({
					ccm,
					trsSender: transaction.senderAddress,
					eventQueue: apiContext.eventQueue,
					getAPIContext,
					logger,
					networkIdentifier,
					getStore,
					feeAddress: EMPTY_FEE_ADDRESS,
				});
			}

			const recoveryCCM: CCMsg = {
				...ccm,
				fee: BigInt(0),
				status: CCM_STATUS_RECOVERED,
			};
			const encodedUpdatedCCM = codec.encode(ccmSchema, recoveryCCM);
			updatedCCMs.push(encodedUpdatedCCM);
		}

		const interoperabilityStore = this.getInteroperabilityStore(getStore);

		const doesTerminatedOutboxAccountExist = await interoperabilityStore.terminatedOutboxAccountExist(
			chainIdAsBuffer,
		);

		if (!doesTerminatedOutboxAccountExist) {
			throw new Error('Terminated outbox account does not exist.');
		}

		const terminatedChainOutboxAccount = await interoperabilityStore.getTerminatedOutboxAccount(
			chainIdAsBuffer,
		);
		const terminatedChainOutboxSize = terminatedChainOutboxAccount.outboxSize;

		const proof = {
			size: terminatedChainOutboxSize,
			indexes: params.idxs,
			siblingHashes: params.siblingHashes,
		};

		const hashedUpdatedCCMs = updatedCCMs.map(ccm => hash(ccm));

		const outboxRoot = regularMerkleTree.calculateRootFromUpdateData(hashedUpdatedCCMs, proof);

		await interoperabilityStore.setTerminatedOutboxAccount(chainIdAsBuffer, {
			outboxRoot,
		});

		for (const ccm of deserializedCCMs) {
			const newCcm = swapReceivingAndSendingChainIDs(ccm);

			const ccmChainIdAsBuffer = getIDAsKeyForStore(newCcm.receivingChainID);
			const chainAccountExist = await interoperabilityStore.chainAccountExist(ccmChainIdAsBuffer);
			const isLive = await interoperabilityStore.isLive(ccmChainIdAsBuffer, Date.now());

			if (!chainAccountExist || !isLive) {
				continue;
			}

			const chainAccount = await interoperabilityStore.getChainAccount(ccmChainIdAsBuffer);

			if (chainAccount.status !== CHAIN_ACTIVE) {
				continue;
			}

			await interoperabilityStore.addToOutbox(ccmChainIdAsBuffer, newCcm);
		}
	}

	protected getInteroperabilityStore(getStore: StoreCallback): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
