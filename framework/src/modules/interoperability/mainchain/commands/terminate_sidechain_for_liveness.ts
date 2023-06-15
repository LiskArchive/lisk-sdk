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
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { terminateSidechainForLivenessParamsSchema } from '../../schemas';
import { ChainAccountStore, ChainStatus } from '../../stores/chain_account';
import { TerminateSidechainForLivenessParams } from '../../types';
import { MainchainInteroperabilityInternalMethod } from '../internal_method';

export class TerminateSidechainForLivenessCommand extends BaseInteroperabilityCommand<MainchainInteroperabilityInternalMethod> {
	public schema = terminateSidechainForLivenessParamsSchema;

	public async verify(
		context: CommandVerifyContext<TerminateSidechainForLivenessParams>,
	): Promise<VerificationResult> {
		const { params } = context;
		const doesChainAccountExist = await this.stores
			.get(ChainAccountStore)
			.has(context, params.chainID);

		if (!doesChainAccountExist) {
			throw new Error('Chain account does not exist.');
		}
		const chainAccount = await this.stores.get(ChainAccountStore).get(context, params.chainID);

		// The commands fails if the sidechain is already terminated.
		if (chainAccount.status === ChainStatus.TERMINATED) {
			throw new Error('Sidechain is already terminated.');
		}

		// Or if the sidechain did not violate the liveness condition.
		const isChainAccountLive = await this.internalMethod.isLive(
			context,
			params.chainID,
			context.header.timestamp,
		);

		if (isChainAccountLive) {
			throw new Error('Sidechain did not violate the liveness condition.');
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(
		context: CommandExecuteContext<TerminateSidechainForLivenessParams>,
	): Promise<void> {
		const {
			params: { chainID },
		} = context;

		await this.internalMethod.terminateChainInternal(context, chainID);
	}
}
