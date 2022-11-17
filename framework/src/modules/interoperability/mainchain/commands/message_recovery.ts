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
import { MainchainInteroperabilityInternalMethod } from '../internal_method';
import { verifyMessageRecovery, swapReceivingAndSendingChainIDs } from '../../utils';
import { EMPTY_BYTES, CCMStatusCode } from '../../constants';
import { ccmSchema, messageRecoveryParamsSchema } from '../../schemas';
import { BaseCCMethod } from '../../base_cc_method';
import { TerminatedOutboxAccount, TerminatedOutboxStore } from '../../stores/terminated_outbox';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { ChainAccountStore, ChainStatus } from '../../stores/chain_account';

export class MainchainMessageRecoveryCommand extends BaseInteroperabilityCommand<MainchainInteroperabilityInternalMethod> {
	public schema = messageRecoveryParamsSchema;

	public get name(): string {
		return 'messageRecovery';
	}

	public async verify(
		context: CommandVerifyContext<MessageRecoveryParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, idxs, crossChainMessages, siblingHashes },
		} = context;
		const chainIdAsBuffer = chainID;
		let terminatedChainOutboxAccount: TerminatedOutboxAccount | undefined;

		try {
			terminatedChainOutboxAccount = await this.stores
				.get(TerminatedOutboxStore)
				.get(context, chainIdAsBuffer);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		return verifyMessageRecovery(
			{ idxs, crossChainMessages, siblingHashes },
			terminatedChainOutboxAccount,
		);
	}

	public async execute(context: CommandExecuteContext<MessageRecoveryParams>): Promise<void> {
		const { params } = context;

		const chainIdAsBuffer = params.chainID;

		const updatedCCMs: Buffer[] = [];
		const deserializedCCMs = params.crossChainMessages.map(serializedCCMsg =>
			codec.decode<CCMsg>(ccmSchema, serializedCCMsg),
		);
		for (const ccm of deserializedCCMs) {
			const methodsWithBeforeRecoverCCM = [...this.interoperableCCMethods.values()].filter(method =>
				Reflect.has(method, 'beforeRecoverCCM'),
			) as Pick<Required<BaseCCMethod>, 'beforeRecoverCCM'>[];
			for (const method of methodsWithBeforeRecoverCCM) {
				await method.beforeRecoverCCM({ ...context, ccm });
			}

			const recoveryCCM: CCMsg = {
				...ccm,
				fee: BigInt(0),
				status: CCMStatusCode.RECOVERED,
			};
			const encodedUpdatedCCM = codec.encode(ccmSchema, recoveryCCM);
			updatedCCMs.push(encodedUpdatedCCM);
		}

		const doesTerminatedOutboxAccountExist = await this.stores
			.get(TerminatedOutboxStore)
			.has(context, chainIdAsBuffer);

		if (!doesTerminatedOutboxAccountExist) {
			throw new Error('Terminated outbox account does not exist.');
		}

		const terminatedChainOutboxAccount = await this.stores
			.get(TerminatedOutboxStore)
			.get(context, chainIdAsBuffer);
		const terminatedChainOutboxSize = terminatedChainOutboxAccount.outboxSize;

		const proof = {
			size: terminatedChainOutboxSize,
			indexes: params.idxs,
			siblingHashes: params.siblingHashes,
		};

		const hashedUpdatedCCMs = updatedCCMs.map(ccm => utils.hash(ccm));

		const outboxRoot = regularMerkleTree.calculateRootFromUpdateData(hashedUpdatedCCMs, proof);

		await this.stores.get(TerminatedOutboxStore).set(context, chainIdAsBuffer, {
			...terminatedChainOutboxAccount,
			outboxRoot,
		});

		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		for (const ccm of deserializedCCMs) {
			const newCcm = swapReceivingAndSendingChainIDs(ccm);

			if (ownChainAccount.chainID.equals(ccm.receivingChainID)) {
				const ccCommands = this.ccCommands.get(newCcm.module);

				if (!ccCommands) {
					continue;
				}

				const ccCommand = ccCommands.find(command => command.name === newCcm.crossChainCommand);

				if (!ccCommand) {
					continue;
				}

				await ccCommand.execute({ ...context, ccm: newCcm });
				continue;
			}

			const ccmChainId = newCcm.receivingChainID;
			const chainAccountExist = await this.stores.get(ChainAccountStore).has(context, ccmChainId);
			const isLive = await this.internalMethod.isLive(context, ccmChainId, Date.now());

			if (!chainAccountExist || !isLive) {
				continue;
			}

			const chainAccount = await this.stores.get(ChainAccountStore).get(context, ccmChainId);

			if (chainAccount.status !== ChainStatus.ACTIVE) {
				continue;
			}

			await this.internalMethod.addToOutbox(context, ccmChainId, newCcm);
		}
	}
}
