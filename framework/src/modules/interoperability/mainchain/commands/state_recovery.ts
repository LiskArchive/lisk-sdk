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

import { sparseMerkleTree } from '@liskhq/lisk-tree';
import { utils } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { MainchainInteroperabilityInternalMethod } from '../internal_method';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { EMPTY_HASH } from '../../constants';
import { stateRecoveryParamsSchema } from '../../schemas';
import { StateRecoveryParams } from '../../types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { createRecoverCCMsgMethodContext } from '../../../../testing';
import { TerminatedStateStore } from '../../stores/terminated_state';

export class StateRecoveryCommand extends BaseInteroperabilityCommand<MainchainInteroperabilityInternalMethod> {
	public schema = stateRecoveryParamsSchema;

	public async verify(
		context: CommandVerifyContext<StateRecoveryParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, storeEntries, siblingHashes },
		} = context;

		try {
			validator.validate(this.schema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		const terminatedStateAccountExists = await terminatedStateSubstore.has(context, chainID);

		if (!terminatedStateAccountExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('The terminated account does not exist'),
			};
		}

		const terminatedStateAccount = await terminatedStateSubstore.get(context, chainID);

		if (!terminatedStateAccount.initialized) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('The terminated account is not initialized'),
			};
		}

		const { stateRoot } = terminatedStateAccount;
		const queryKeys = [];
		const storeQueries = [];

		for (const entry of storeEntries) {
			queryKeys.push(entry.storeKey);
			storeQueries.push({
				key: entry.storeKey,
				value: utils.hash(entry.storeValue),
				bitmap: entry.bitmap,
			});
		}

		const proofOfInclusionStores = { siblingHashes, queries: storeQueries };
		const verified = sparseMerkleTree.verify(
			queryKeys,
			proofOfInclusionStores,
			stateRoot,
			queryKeys.length,
		);

		if (!verified) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Failed to verify proof of inclusion'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<StateRecoveryParams>): Promise<void> {
		const {
			transaction,
			params: { chainID, storeEntries, module, siblingHashes },
		} = context;
		const storeQueries = [];

		// The recover function corresponding to the module applies the recovery logic
		const moduleMethod = this.interoperableCCMethods.get(module);
		if (!moduleMethod || !moduleMethod.recover) {
			throw new Error('Recovery not available for module');
		}

		for (const entry of storeEntries) {
			const recoverContext = createRecoverCCMsgMethodContext({
				terminatedChainID: chainID,
				module,
				storePrefix: entry.storePrefix,
				storeKey: entry.storeKey,
				storeValue: entry.storeValue,
				feeAddress: transaction.senderAddress,
			});
			try {
				await moduleMethod.recover(recoverContext);
			} catch (err) {
				throw new Error('Recovery failed');
			}
			storeQueries.push({
				key: entry.storeKey,
				value: EMPTY_HASH,
				bitmap: entry.bitmap,
			});
		}

		const root = sparseMerkleTree.calculateRoot(siblingHashes, storeQueries, storeEntries.length);

		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);

		const terminatedStateAccount = await terminatedStateSubstore.get(context, chainID);

		await terminatedStateSubstore.set(context, chainID, {
			...terminatedStateAccount,
			stateRoot: root,
		});
	}
}
