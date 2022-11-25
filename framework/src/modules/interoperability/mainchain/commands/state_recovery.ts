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
import { EMPTY_BYTES, EMPTY_HASH, MODULE_NAME_INTEROPERABILITY } from '../../constants';
import { stateRecoveryParamsSchema } from '../../schemas';
import { RecoverContext, StateRecoveryParams } from '../../types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { TerminatedStateStore } from '../../stores/terminated_state';
import { computeStorePrefix } from '../../../base_store';
import { BaseCCMethod } from '../../base_cc_method';

export class StateRecoveryCommand extends BaseInteroperabilityCommand<MainchainInteroperabilityInternalMethod> {
	public schema = stateRecoveryParamsSchema;

	public async verify(
		context: CommandVerifyContext<StateRecoveryParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, storeEntries, siblingHashes, module },
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
				error: new Error('The terminated state does not exist.'),
			};
		}

		const terminatedStateAccount = await terminatedStateSubstore.get(context, chainID);

		if (!terminatedStateAccount.initialized) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('The terminated state is not initialized.'),
			};
		}

		if (module === MODULE_NAME_INTEROPERABILITY) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Interoperability module cannot be recovered.'),
			};
		}

		const moduleMethod = this.interoperableCCMethods.get(module);

		if (!moduleMethod) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Module is not registered on the chain.'),
			};
		}

		if (!moduleMethod.recover) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Module is not recoverable.'),
			};
		}

		const { stateRoot } = terminatedStateAccount;
		const queryKeys = [];
		const storeQueries = [];

		const storePrefix = computeStorePrefix(module);

		for (const entry of storeEntries) {
			if (entry.storeValue.equals(EMPTY_BYTES)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Recovered store value cannot be empty.'),
				};
			}
			queryKeys.push(entry.storeKey);
			storeQueries.push({
				key: Buffer.from([...storePrefix, ...entry.substorePrefix, ...entry.storeKey]),
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
				error: new Error('State recovery proof of inclusion is not valid.'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<StateRecoveryParams>): Promise<void> {
		const {
			params: { chainID, storeEntries, module, siblingHashes },
		} = context;
		const storeQueries = [];

		// Casting for type issue. `recover` already verified to exist in module for verify
		const moduleMethod = this.interoperableCCMethods.get(module) as BaseCCMethod & {
			recover: (ctx: RecoverContext) => Promise<void>;
		};
		const storePrefix = computeStorePrefix(module);

		for (const entry of storeEntries) {
			try {
				await moduleMethod.recover({
					...context,
					module,
					terminatedChainID: chainID,
					substorePrefix: storePrefix,
					storeKey: entry.storeKey,
					storeValue: entry.storeValue,
				});
			} catch (err) {
				throw new Error(`Recovery failed for module: ${module}`);
			}

			storeQueries.push({
				key: Buffer.from([...storePrefix, ...entry.substorePrefix, ...entry.storeKey]),
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
