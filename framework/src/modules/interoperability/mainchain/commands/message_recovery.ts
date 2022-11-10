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
import { MainchainInteroperabilityInternalMethod } from '../store';
import { verifyMessageRecovery, swapReceivingAndSendingChainIDs } from '../../utils';
import { CCMStatusCode, EMPTY_BYTES, EMPTY_FEE_ADDRESS } from '../../constants';
import { ccmSchema, messageRecoveryParamsSchema } from '../../schemas';
import { BaseInteroperableMethod } from '../../base_interoperable_method';
import { TerminatedOutboxAccount, TerminatedOutboxStore } from '../../stores/terminated_outbox';
import { StoreGetter, ImmutableStoreGetter } from '../../../base_store';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { ChainAccountStore, ChainStatus } from '../../stores/chain_account';

export class MainchainMessageRecoveryCommand extends BaseInteroperabilityCommand {
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
		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);
		let terminatedChainOutboxAccount: TerminatedOutboxAccount | undefined;

		try {
			terminatedChainOutboxAccount = await interoperabilityInternalMethod.getTerminatedOutboxAccount(
				chainIdAsBuffer,
			);
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
				status: CCMStatusCode.RECOVERED,
			};
			const encodedUpdatedCCM = codec.encode(ccmSchema, recoveryCCM);
			updatedCCMs.push(encodedUpdatedCCM);
		}

		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);

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

				// TODO: Fix in #7727
				// const ccCommandExecuteContext = createCCCommandExecuteContext({
				// 	ccm: newCcm,
				// 	ccmSize: getCCMSize(ccm),
				// 	eventQueue: context.eventQueue,
				// 	feeAddress: EMPTY_FEE_ADDRESS,
				// 	getMethodContext,
				// 	getStore,
				// 	logger,
				// 	chainID,
				// });

				// await ccCommand.execute(ccCommandExecuteContext);
				continue;
			}

			const ccmChainId = newCcm.receivingChainID;
			const chainAccountExist = await this.stores.get(ChainAccountStore).has(context, ccmChainId);
			const isLive = await interoperabilityInternalMethod.isLive(ccmChainId, Date.now());

			if (!chainAccountExist || !isLive) {
				continue;
			}

			const chainAccount = await this.stores.get(ChainAccountStore).get(context, ccmChainId);

			if (chainAccount.status !== ChainStatus.ACTIVE) {
				continue;
			}

			await interoperabilityInternalMethod.addToOutbox(ccmChainId, newCcm);
		}
	}

	protected getInteroperabilityInternalMethod(
		context: StoreGetter | ImmutableStoreGetter,
	): MainchainInteroperabilityInternalMethod {
		return new MainchainInteroperabilityInternalMethod(
			this.stores,
			this.events,
			context,
			this.interoperableCCMethods,
		);
	}
}
