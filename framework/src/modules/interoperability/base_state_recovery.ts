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

import { objects as objectUtils } from '@liskhq/lisk-utils';
import { SparseMerkleTree } from '@liskhq/lisk-db';
import { utils } from '@liskhq/lisk-cryptography';
import { BaseInteroperabilityCommand } from './base_interoperability_command';
import { EMPTY_BYTES, EMPTY_HASH } from './constants';
import { stateRecoveryParamsSchema } from './schemas';
import { RecoverContext, StateRecoveryParams } from './types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../state_machine';
import { TerminatedStateStore } from './stores/terminated_state';
import { computeStorePrefix } from '../base_store';
import { BaseCCMethod } from './base_cc_method';
import { BaseInteroperabilityInternalMethod } from './base_interoperability_internal_methods';
import { InvalidSMTVerification } from './events/invalid_smt_verification';

export class BaseStateRecoveryCommand<
	T extends BaseInteroperabilityInternalMethod,
> extends BaseInteroperabilityCommand<T> {
	public schema = stateRecoveryParamsSchema;

	public async verify(
		context: CommandVerifyContext<StateRecoveryParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, storeEntries, module },
		} = context;

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

		const queryKeys = [];
		// For efficiency, only subStorePrefix+storeKey is enough to check for pairwise distinct keys in verification
		for (const entry of storeEntries) {
			if (entry.storeValue.equals(EMPTY_BYTES)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Recovered store value cannot be empty.'),
				};
			}
			const queryKey = Buffer.concat([entry.substorePrefix, entry.storeKey]);
			queryKeys.push(queryKey);
		}

		// Check that all keys are pariwise distinct, meaning that we are not trying to recover the same entry twice.
		if (!objectUtils.bufferArrayUniqueItems(queryKeys)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Recovered store keys are not pairwise distinct.'),
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
		const storeQueriesVerify = [];
		const queryKeys = [];
		const storePrefix = computeStorePrefix(module);

		for (const entry of storeEntries) {
			const queryKey = Buffer.concat([
				storePrefix,
				entry.substorePrefix,
				utils.hash(entry.storeKey),
			]);
			queryKeys.push(queryKey);
			storeQueriesVerify.push({
				key: queryKey,
				value: utils.hash(entry.storeValue),
				bitmap: entry.bitmap,
			});
		}
		const terminatedStateAccount = await this.stores
			.get(TerminatedStateStore)
			.get(context, chainID);

		const sparseMerkleTree = new SparseMerkleTree();
		const proofOfInclusionStores = { siblingHashes, queries: storeQueriesVerify };
		// The SMT verification step is computationally expensive. Therefore,
		// it is done in the execution step such that the transaction fee must be paid.
		const smtVerified = await sparseMerkleTree.verify(
			terminatedStateAccount.stateRoot,
			queryKeys,
			proofOfInclusionStores,
		);

		if (!smtVerified) {
			this.events.get(InvalidSMTVerification).error(context);
			throw new Error('State recovery proof of inclusion is not valid.');
		}

		// Casting for type issue. `recover` already verified to exist in module for verify
		const moduleMethod = this.interoperableCCMethods.get(module) as BaseCCMethod & {
			recover: (ctx: RecoverContext) => Promise<void>;
		};
		const storeQueriesUpdate = [];
		for (const entry of storeEntries) {
			try {
				// The recover function corresponding to trsParams.module applies the recovery logic.
				await moduleMethod.recover({
					...context,
					module,
					terminatedChainID: chainID,
					substorePrefix: entry.substorePrefix,
					storeKey: entry.storeKey,
					storeValue: entry.storeValue,
				});
				storeQueriesUpdate.push({
					key: Buffer.concat([storePrefix, entry.substorePrefix, utils.hash(entry.storeKey)]),
					value: EMPTY_HASH,
					bitmap: entry.bitmap,
				});
			} catch (err) {
				throw new Error(`Recovery failed for module: ${module}`);
			}
		}

		const root = await sparseMerkleTree.calculateRoot({
			queries: storeQueriesUpdate,
			siblingHashes,
		});

		await this.stores.get(TerminatedStateStore).set(context, chainID, {
			...terminatedStateAccount,
			stateRoot: root,
		});
	}
}
