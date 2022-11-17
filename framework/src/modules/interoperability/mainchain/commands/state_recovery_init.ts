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
import { utils } from '@liskhq/lisk-cryptography';
import { SparseMerkleTree } from '@liskhq/lisk-db';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { EMPTY_BYTES, LIVENESS_LIMIT } from '../../constants';
import { stateRecoveryInitParams } from '../../schemas';
import { chainAccountSchema, ChainAccountStore, ChainStatus } from '../../stores/chain_account';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { TerminatedStateAccount, TerminatedStateStore } from '../../stores/terminated_state';
import { ChainAccount, StateRecoveryInitParams } from '../../types';
import { getMainchainID } from '../../utils';
import { MainchainInteroperabilityInternalMethod } from '../internal_method';

export class StateRecoveryInitializationCommand extends BaseInteroperabilityCommand<MainchainInteroperabilityInternalMethod> {
	public schema = stateRecoveryInitParams;

	public async verify(
		context: CommandVerifyContext<StateRecoveryInitParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, sidechainAccount, bitmap, siblingHashes },
		} = context;
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);

		const mainchainID = getMainchainID(context.params.chainID);
		if (chainID.equals(mainchainID) || chainID.equals(ownChainAccount.chainID)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Chain ID is not valid.'),
			};
		}

		// The commands fails if the sidechain is already terminated on this chain.
		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		const terminatedStateAccountExists = await terminatedStateSubstore.has(context, chainID);
		let terminatedStateAccount: TerminatedStateAccount;
		if (terminatedStateAccountExists) {
			terminatedStateAccount = await terminatedStateSubstore.get(context, chainID);
			if (terminatedStateAccount.initialized) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Sidechain is already terminated.'),
				};
			}
		}

		const deserializedInteropAccount = codec.decode<ChainAccount>(
			chainAccountSchema,
			sidechainAccount,
		);
		const mainchainAccount = await this.stores.get(ChainAccountStore).get(context, mainchainID);
		// The commands fails if the sidechain is not terminated and did not violate the liveness requirement.
		if (
			deserializedInteropAccount.status !== ChainStatus.TERMINATED &&
			mainchainAccount.lastCertificate.timestamp -
				deserializedInteropAccount.lastCertificate.timestamp <=
				LIVENESS_LIMIT
		) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Sidechain is not terminated.'),
			};
		}

		const chainStore = this.stores.get(ChainAccountStore);
		const queryKey = Buffer.concat([chainStore.key, utils.hash(chainID)]);

		const query = { key: queryKey, value: utils.hash(sidechainAccount), bitmap };

		const proofOfInclusion = { siblingHashes, queries: [query] };

		if (terminatedStateAccountExists) {
			terminatedStateAccount = await terminatedStateSubstore.get(context, chainID);
			if (!terminatedStateAccount.mainchainStateRoot) {
				throw new Error('Sidechain account has missing property: mainchain state root');
			}
			const smt = new SparseMerkleTree();
			const verified = await smt.verify(
				terminatedStateAccount.stateRoot,
				[queryKey],
				proofOfInclusion,
			);
			if (!verified) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Failed to verify proof of inclusion'),
				};
			}
		} else {
			const smt = new SparseMerkleTree();
			const verified = await smt.verify(
				mainchainAccount.lastCertificate.stateRoot,
				[queryKey],
				proofOfInclusion,
			);
			if (!verified) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Failed to verify proof of inclusion'),
				};
			}
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<StateRecoveryInitParams>): Promise<void> {
		const { params } = context;
		const sidechainChainAccount = codec.decode<ChainAccount>(
			chainAccountSchema,
			params.sidechainAccount,
		);

		const doesTerminatedStateAccountExist = await this.stores
			.get(TerminatedStateStore)
			.has(context, params.chainID);
		if (doesTerminatedStateAccountExist) {
			const newTerminatedStateAccount: TerminatedStateAccount = {
				stateRoot: sidechainChainAccount.lastCertificate.stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			};

			const store = this.stores.get(TerminatedStateStore);

			await store.set(context, params.chainID, newTerminatedStateAccount);
			return;
		}

		await this.internalMethod.createTerminatedStateAccount(
			context,
			params.chainID,
			sidechainChainAccount.lastCertificate.stateRoot,
		);
	}
}
