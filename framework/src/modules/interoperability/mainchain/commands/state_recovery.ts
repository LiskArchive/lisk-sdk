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
import { hash } from '@liskhq/lisk-cryptography';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { MainchainInteroperabilityStore } from '../store';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import {
	EMPTY_HASH,
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_TERMINATED_STATE,
	COMMAND_ID_STATE_RECOVERY,
} from '../../constants';
import { stateRecoveryParamsSchema, terminatedStateSchema } from '../../schema';
import { StateRecoveryParams, TerminatedStateAccount, StoreCallback } from '../../types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../node/state_machine/types';
import { createRecoverCCMsgAPIContext } from '../../../../testing';
import { BaseInteroperableAPI } from '../../base_interoperable_api';
import { getIDAsKeyForStore } from '../../utils';

export class StateRecoveryCommand extends BaseInteroperabilityCommand {
	public id = COMMAND_ID_STATE_RECOVERY;
	public name = 'stateRecovery';
	public schema = stateRecoveryParamsSchema;

	public async verify(
		context: CommandVerifyContext<StateRecoveryParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, storeEntries, siblingHashes },
		} = context;
		const chainIDBuffer = getIDAsKeyForStore(chainID);
		const errors = validator.validate(this.schema, context.params);

		if (errors.length > 0) {
			return {
				status: VerifyStatus.FAIL,
				error: new LiskValidationError(errors),
			};
		}

		const terminatedStateSubstore = context.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_STATE,
		);
		const terminatedStateAccountExists = await terminatedStateSubstore.has(chainIDBuffer);

		if (!terminatedStateAccountExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('The terminated account does not exist'),
			};
		}

		const terminatedStateAccount = await terminatedStateSubstore.getWithSchema<TerminatedStateAccount>(
			chainIDBuffer,
			terminatedStateSchema,
		);

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
				value: hash(entry.storeValue),
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
			params: { chainID, storeEntries, moduleID, siblingHashes },
		} = context;
		const chainIDBuffer = getIDAsKeyForStore(chainID);
		const storeQueries = [];

		for (const entry of storeEntries) {
			const moduleApisWithRecover = [...this.interoperableCCAPIs.values()].filter(
				api => api.moduleID === moduleID && Reflect.has(api, 'recover'),
			) as Pick<Required<BaseInteroperableAPI>, 'recover'>[];
			// The recover function corresponding to the module ID applies the recovery logic
			for (const api of moduleApisWithRecover) {
				const recoverContext = createRecoverCCMsgAPIContext({
					terminatedChainID: chainID,
					moduleID,
					storePrefix: entry.storePrefix,
					storeKey: entry.storeKey.readUInt32BE(0),
					storeValue: entry.storeValue,
					feeAddress: transaction.senderAddress,
				});
				try {
					await api.recover(recoverContext);
				} catch (err) {
					throw new Error('Recovery failed');
				}
			}

			storeQueries.push({
				key: entry.storeKey,
				value: EMPTY_HASH,
				bitmap: entry.bitmap,
			});
		}

		const root = sparseMerkleTree.calculateRoot(siblingHashes, storeQueries, storeEntries.length);

		const terminatedStateSubstore = context.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_STATE,
		);

		const terminatedStateAccount = await terminatedStateSubstore.getWithSchema<TerminatedStateAccount>(
			chainIDBuffer,
			terminatedStateSchema,
		);

		await terminatedStateSubstore.setWithSchema(
			chainIDBuffer,
			{ ...terminatedStateAccount, stateRoot: root },
			terminatedStateSchema,
		);
	}

	protected getInteroperabilityStore(getStore: StoreCallback): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
