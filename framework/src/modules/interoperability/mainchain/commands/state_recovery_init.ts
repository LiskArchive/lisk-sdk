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
import { sparseMerkleTree } from '@liskhq/lisk-tree';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { ImmutableStoreGetter, StoreGetter } from '../../../base_store';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import {
	CHAIN_TERMINATED,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MAINCHAIN_ID_BUFFER,
} from '../../constants';
import { stateRecoveryInitParams } from '../../schemas';
import { chainAccountSchema, ChainAccountStore } from '../../stores/chain_account';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { TerminatedStateAccount, TerminatedStateStore } from '../../stores/terminated_state';
import { ChainAccount, StateRecoveryInitParams } from '../../types';
import { MainchainInteroperabilityInternalMethod } from '../store';

export class StateRecoveryInitializationCommand extends BaseInteroperabilityCommand {
	public schema = stateRecoveryInitParams;

	public async verify(
		context: CommandVerifyContext<StateRecoveryInitParams>,
	): Promise<VerificationResult> {
		const {
			params: { chainID, sidechainChainAccount, bitmap, siblingHashes },
		} = context;
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);

		if (chainID.equals(MAINCHAIN_ID_BUFFER) || chainID.equals(ownChainAccount.chainID)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Sidechain id is not valid`),
			};
		}

		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		const terminatedStateAccountExists = await terminatedStateSubstore.has(context, chainID);
		let terminatedStateAccount: TerminatedStateAccount;
		if (terminatedStateAccountExists) {
			terminatedStateAccount = await terminatedStateSubstore.get(context, chainID);
			if (terminatedStateAccount.initialized) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('The sidechain is already terminated on this chain'),
				};
			}
		}

		const deserializedInteropAccount = codec.decode<ChainAccount>(
			chainAccountSchema,
			sidechainChainAccount,
		);
		const mainchainAccount = await this.stores
			.get(ChainAccountStore)
			.get(context, MAINCHAIN_ID_BUFFER);
		if (
			deserializedInteropAccount.status !== CHAIN_TERMINATED &&
			mainchainAccount.lastCertificate.timestamp -
				deserializedInteropAccount.lastCertificate.timestamp <=
				LIVENESS_LIMIT
		) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'The sidechain is not terminated on the mainchain but the sidechain already violated the liveness requirement',
				),
			};
		}

		const chainStore = this.stores.get(ChainAccountStore);
		const interopAccKey = Buffer.concat([chainStore.key, chainID]);

		const query = { key: interopAccKey, value: utils.hash(sidechainChainAccount), bitmap };

		const proofOfInclusion = { siblingHashes, queries: [query] };

		if (terminatedStateAccountExists) {
			terminatedStateAccount = await terminatedStateSubstore.get(context, chainID);
			if (!terminatedStateAccount.mainchainStateRoot) {
				throw new Error('Sidechain account has missing property: mainchain state root');
			}
			const verified = sparseMerkleTree.verify(
				[interopAccKey],
				proofOfInclusion,
				terminatedStateAccount.mainchainStateRoot,
				1,
			);
			if (!verified) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Failed to verify proof of inclusion'),
				};
			}
		} else {
			const verified = sparseMerkleTree.verify(
				[interopAccKey],
				proofOfInclusion,
				mainchainAccount.lastCertificate.stateRoot,
				1,
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
			params.sidechainChainAccount,
		);

		const interoperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);

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

		await interoperabilityInternalMethod.createTerminatedStateAccount(
			context,
			params.chainID,
			sidechainChainAccount.lastCertificate.stateRoot,
		);
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
