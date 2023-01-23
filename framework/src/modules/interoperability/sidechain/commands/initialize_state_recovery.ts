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
import { validator } from '@liskhq/lisk-validator';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { EMPTY_BYTES, EMPTY_HASH, LIVENESS_LIMIT } from '../../constants';
import { stateRecoveryInitParamsSchema } from '../../schemas';
import { chainDataSchema, ChainAccountStore, ChainStatus } from '../../stores/chain_account';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { TerminatedStateAccount, TerminatedStateStore } from '../../stores/terminated_state';
import { ChainAccount, StateRecoveryInitParams } from '../../types';
import { getMainchainID } from '../../utils';
import { MainchainInteroperabilityInternalMethod } from '../../mainchain/internal_method';

export class InitializeStateRecoveryCommand extends BaseInteroperabilityCommand<MainchainInteroperabilityInternalMethod> {
	public schema = stateRecoveryInitParamsSchema;

	// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#verification-3
	public async verify(
		context: CommandVerifyContext<StateRecoveryInitParams>,
	): Promise<VerificationResult> {
		const { params } = context;
		validator.validate<StateRecoveryInitParams>(this.schema, params);

		const { chainID, bitmap, siblingHashes, sidechainAccount } = params;

		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);

		const mainchainID = getMainchainID(ownChainAccount.chainID);
		if (chainID.equals(mainchainID) || chainID.equals(ownChainAccount.chainID)) {
			throw new Error('Chain ID is not valid.');
		}

		// The commands fails if the sidechain is already terminated on this chain.
		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		const terminatedStateAccountExists = await terminatedStateSubstore.has(context, chainID);
		let terminatedStateAccount: TerminatedStateAccount;
		if (terminatedStateAccountExists) {
			terminatedStateAccount = await terminatedStateSubstore.get(context, chainID);
			if (terminatedStateAccount.initialized) {
				throw new Error('Sidechain is already terminated.');
			}
		}

		const deserializedSidechainAccount = codec.decode<ChainAccount>(
			chainDataSchema,
			sidechainAccount,
		);
		const mainchainAccount = await this.stores.get(ChainAccountStore).get(context, mainchainID);
		// The commands fails if the sidechain is not terminated and did not violate the liveness requirement.
		if (
			deserializedSidechainAccount.status !== ChainStatus.TERMINATED &&
			mainchainAccount.lastCertificate.timestamp -
				deserializedSidechainAccount.lastCertificate.timestamp <=
				LIVENESS_LIMIT
		) {
			throw new Error('Sidechain is not terminated.');
		}

		const chainStore = this.stores.get(ChainAccountStore);
		const queryKey = Buffer.concat([chainStore.key, utils.hash(chainID)]);

		const query = { key: queryKey, value: utils.hash(sidechainAccount), bitmap };

		const proofOfInclusion = { siblingHashes, queries: [query] };

		const smt = new SparseMerkleTree();
		if (terminatedStateAccountExists) {
			terminatedStateAccount = await terminatedStateSubstore.get(context, chainID);
			if (!terminatedStateAccount.mainchainStateRoot) {
				throw new Error('Sidechain account has missing property: mainchain state root');
			}
			const verified = await smt.verify(
				terminatedStateAccount.mainchainStateRoot,
				[queryKey],
				proofOfInclusion,
			);
			if (!verified) {
				throw new Error('State recovery initialization proof of inclusion is not valid.');
			}
		} else {
			const verified = await smt.verify(
				mainchainAccount.lastCertificate.stateRoot,
				[queryKey],
				proofOfInclusion,
			);
			if (!verified) {
				throw new Error('State recovery initialization proof of inclusion is not valid.');
			}
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#execution-3
	public async execute(context: CommandExecuteContext<StateRecoveryInitParams>): Promise<void> {
		const { params } = context;
		const sidechainAccount = codec.decode<ChainAccount>(chainDataSchema, params.sidechainAccount);

		const doesTerminatedStateAccountExist = await this.stores
			.get(TerminatedStateStore)
			.has(context, params.chainID);
		if (doesTerminatedStateAccountExist) {
			const newTerminatedStateAccount: TerminatedStateAccount = {
				stateRoot: sidechainAccount.lastCertificate.stateRoot,
				mainchainStateRoot: EMPTY_HASH,
				initialized: true,
			};

			const store = this.stores.get(TerminatedStateStore);

			await store.set(context, params.chainID, newTerminatedStateAccount);
			return;
		}

		await this.internalMethod.createTerminatedStateAccount(
			context,
			params.chainID,
			sidechainAccount.lastCertificate.stateRoot,
		);
	}
}
