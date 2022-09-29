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
import { utils } from '@liskhq/lisk-cryptography';
import { NotFoundError } from '@liskhq/lisk-chain';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
} from '../../../../state_machine/types';
import { CCMsg, MessageRecoveryParams } from '../../types';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { SidechainInteroperabilityStore } from '../store';
import { verifyMessageRecovery, swapReceivingAndSendingChainIDs, getCCMSize } from '../../utils';
import {
	CCM_STATUS_CODE_RECOVERED,
	COMMAND_NAME_MESSAGE_RECOVERY,
	EMPTY_FEE_ADDRESS,
} from '../../constants';
import { ccmSchema, messageRecoveryParamsSchema } from '../../schemas';
import { BaseInteroperableMethod } from '../../base_interoperable_method';
import { createCCCommandExecuteContext } from '../../context';
import { ImmutableStoreGetter, StoreGetter } from '../../../base_store';
import { TerminatedOutboxAccount } from '../../stores/terminated_outbox';

export class SidechainMessageRecoveryCommand extends BaseInteroperabilityCommand {
	public schema = messageRecoveryParamsSchema;

	public get name(): string {
		return COMMAND_NAME_MESSAGE_RECOVERY;
	}

	public async verify(
		context: CommandVerifyContext<MessageRecoveryParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, idxs, crossChainMessages, siblingHashes },
		} = context;
		const chainIdAsBuffer = chainID;
		const interoperabilityStore = this.getInteroperabilityStore(context);
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

	public async execute(context: CommandExecuteContext<MessageRecoveryParams>): Promise<void> {
		const { transaction, params, getMethodContext, logger, chainID, getStore } = context;

		const chainIdAsBuffer = params.chainID;

		const updatedCCMs: Buffer[] = [];
		const deserializedCCMs = params.crossChainMessages.map(serializedCCMsg =>
			codec.decode<CCMsg>(ccmSchema, serializedCCMsg),
		);
		for (const ccm of deserializedCCMs) {
			const methodsWithBeforeRecoverCCM = [...this.interoperableCCMethods.values()].filter(method =>
				Reflect.has(method, 'beforeRecoverCCM'),
			) as Pick<Required<BaseInteroperableMethod>, 'beforeRecoverCCM'>[];
			for (const method of methodsWithBeforeRecoverCCM) {
				await method.beforeRecoverCCM({
					ccm,
					trsSender: transaction.senderAddress,
					eventQueue: context.eventQueue,
					getMethodContext,
					logger,
					chainID,
					getStore,
					feeAddress: EMPTY_FEE_ADDRESS,
				});
			}

			const recoveryCCM: CCMsg = {
				...ccm,
				fee: BigInt(0),
				status: CCM_STATUS_CODE_RECOVERED,
			};
			const encodedUpdatedCCM = codec.encode(ccmSchema, recoveryCCM);
			updatedCCMs.push(encodedUpdatedCCM);
		}

		const interoperabilityStore = this.getInteroperabilityStore(context);

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

		const hashedUpdatedCCMs = updatedCCMs.map(ccm => utils.hash(ccm));

		const outboxRoot = regularMerkleTree.calculateRootFromUpdateData(hashedUpdatedCCMs, proof);

		await interoperabilityStore.setTerminatedOutboxAccount(chainIdAsBuffer, {
			outboxRoot,
		});

		const ownChainAccount = await interoperabilityStore.getOwnChainAccount();
		for (const ccm of deserializedCCMs) {
			const newCcm = swapReceivingAndSendingChainIDs(ccm);

			if (!ownChainAccount.chainID.equals(newCcm.receivingChainID)) {
				continue;
			}

			const ccCommands = this.ccCommands.get(newCcm.module);

			if (!ccCommands) {
				continue;
			}

			const ccCommand = ccCommands.find(command => command.name === newCcm.crossChainCommand);

			if (!ccCommand) {
				continue;
			}

			const ccCommandExecuteContext = createCCCommandExecuteContext({
				ccm: newCcm,
				ccmSize: getCCMSize(ccm),
				eventQueue: context.eventQueue,
				feeAddress: EMPTY_FEE_ADDRESS,
				getMethodContext,
				getStore,
				logger,
				chainID,
			});

			await ccCommand.execute(ccCommandExecuteContext);
		}
	}

	protected getInteroperabilityStore(
		context: StoreGetter | ImmutableStoreGetter,
	): SidechainInteroperabilityStore {
		return new SidechainInteroperabilityStore(
			this.stores,
			context,
			this.interoperableCCMethods,
			this.events,
		);
	}
}
