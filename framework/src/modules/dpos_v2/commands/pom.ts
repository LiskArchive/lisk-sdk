/*
 * Copyright © 2021 Lisk Foundation
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

import { validator } from '@liskhq/lisk-validator';
import { BlockHeader } from '@liskhq/lisk-chain';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import {
	REPORTING_PUNISHMENT_REWARD,
	MAX_POM_HEIGHTS,
	MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE,
} from '../constants';
import { pomCommandParamsSchema } from '../schemas';
import {
	PomCommandDependencies,
	PomTransactionParams,
	TokenMethod,
	TokenIDDPoS,
	ValidatorsMethod,
} from '../types';
import { getPunishmentPeriod } from '../utils';
import { ValidationError } from '../../../errors';
import { areDistinctHeadersContradicting } from '../../../engine/bft/utils';
import { DelegateStore } from '../stores/delegate';

export class ReportDelegateMisbehaviorCommand extends BaseCommand {
	public schema = pomCommandParamsSchema;
	private _tokenMethod!: TokenMethod;
	private _validatorsMethod!: ValidatorsMethod;
	private _tokenIDDPoS!: TokenIDDPoS;

	public addDependencies(args: PomCommandDependencies) {
		this._tokenMethod = args.tokenMethod;
		this._validatorsMethod = args.validatorsMethod;
	}

	public init(args: { tokenIDDPoS: TokenIDDPoS }) {
		this._tokenIDDPoS = args.tokenIDDPoS;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<PomTransactionParams>,
	): Promise<VerificationResult> {
		try {
			validator.validate(this.schema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		const header1 = BlockHeader.fromBytes(context.params.header1);
		header1.validate();

		const header2 = BlockHeader.fromBytes(context.params.header2);
		header2.validate();

		// Check for BFT violations:
		if (header1.id.equals(header2.id) || !areDistinctHeadersContradicting(header1, header2)) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError(
					'BlockHeaders are not contradicting as per BFT violation rules.',
					'',
				),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async execute(context: CommandExecuteContext<PomTransactionParams>): Promise<void> {
		const { chainID, getMethodContext, params, transaction, header } = context;
		const currentHeight = header.height;
		const header1 = BlockHeader.fromBytes(params.header1);
		const header2 = BlockHeader.fromBytes(params.header2);
		/*
			|header1.height - h| >= 260,000.
			|header2.height - h| >= 260,000.
		*/

		if (Math.abs(header1.height - currentHeight) >= MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE) {
			throw new Error(
				`Difference between header1.height and current height must be less than ${MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE.toString()}.`,
			);
		}

		if (Math.abs(header2.height - currentHeight) >= MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE) {
			throw new Error(
				`Difference between header2.height and current height must be less than ${MAX_PUNISHABLE_BLOCK_HEIGHT_DIFFERENCE.toString()}.`,
			);
		}

		/*
			Check if delegate is eligible to be punished
		*/
		const delegateAddress = header1.generatorAddress;
		const delegateSubStore = this.stores.get(DelegateStore);
		const delegateAccount = await delegateSubStore.get(context, delegateAddress);

		if (delegateAccount.isBanned) {
			throw new Error('Cannot apply proof-of-misbehavior. Delegate is already banned.');
		}

		if (
			getPunishmentPeriod(
				delegateAddress,
				delegateAddress,
				delegateAccount.pomHeights,
				header.height,
			) > 0
		) {
			throw new Error('Cannot apply proof-of-misbehavior. Delegate is already punished.');
		}

		if (!header1.generatorAddress.equals(header2.generatorAddress)) {
			throw new Error('Different generator address never contradict to each other');
		}

		const { generatorKey } = await this._validatorsMethod.getValidatorAccount(
			getMethodContext(),
			header1.generatorAddress,
		);
		/*
			Check block signatures validity
		*/
		header1.validateSignature(generatorKey, chainID);
		header2.validateSignature(generatorKey, chainID);

		/*
			Update sender account
		*/
		const delegateAccountBalance = await this._tokenMethod.getAvailableBalance(
			getMethodContext(),
			delegateAddress,
			this._tokenIDDPoS,
		);

		const reward =
			REPORTING_PUNISHMENT_REWARD > delegateAccountBalance
				? delegateAccountBalance
				: REPORTING_PUNISHMENT_REWARD;

		delegateAccount.pomHeights.push(currentHeight);

		if (delegateAccount.pomHeights.length >= MAX_POM_HEIGHTS) {
			delegateAccount.isBanned = true;
		}
		await delegateSubStore.set(context, delegateAddress, delegateAccount);

		if (reward > BigInt(0)) {
			await this._tokenMethod.transfer(
				getMethodContext(),
				delegateAddress,
				transaction.senderAddress,
				this._tokenIDDPoS,
				reward,
			);
		}
	}
}
