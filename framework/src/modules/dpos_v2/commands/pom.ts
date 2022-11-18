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
	POM_LIMIT_BANNED,
	LOCKING_PERIOD_SELF_VOTES,
} from '../constants';
import { pomCommandParamsSchema } from '../schemas';
import {
	PomCommandDependencies,
	PomTransactionParams,
	TokenMethod,
	TokenID,
	ValidatorsMethod,
} from '../types';
import { getDelegateWeight, getPunishmentPeriod } from '../utils';
import { ValidationError } from '../../../errors';
import { areDistinctHeadersContradicting } from '../../../engine/bft/utils';
import { DelegateStore } from '../stores/delegate';
import { DelegatePunishedEvent } from '../events/delegate_punished';
import { DelegateBannedEvent } from '../events/delegate_banned';
import { EligibleDelegatesStore } from '../stores/eligible_delegates';

export class ReportMisbehaviorCommand extends BaseCommand {
	public schema = pomCommandParamsSchema;
	private _tokenMethod!: TokenMethod;
	private _validatorsMethod!: ValidatorsMethod;
	private _governanceTokenID!: TokenID;
	private _factorSelfVotes!: number;

	public addDependencies(args: PomCommandDependencies) {
		this._tokenMethod = args.tokenMethod;
		this._validatorsMethod = args.validatorsMethod;
	}

	public init(args: { governanceTokenID: TokenID; factorSelfVotes: number }) {
		this._governanceTokenID = args.governanceTokenID;
		this._factorSelfVotes = args.factorSelfVotes;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<PomTransactionParams>,
	): Promise<VerificationResult> {
		const { chainID, getMethodContext, params, header } = context;

		try {
			validator.validate(this.schema, params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		const currentHeight = header.height;
		const header1 = BlockHeader.fromBytes(params.header1);
		const header2 = BlockHeader.fromBytes(params.header2);

		if (!header1.generatorAddress.equals(header2.generatorAddress)) {
			throw new Error('Different generator address never contradict to each other.');
		}

		const delegateAddress = header1.generatorAddress;
		const delegateSubStore = this.stores.get(DelegateStore);
		const delegateAccount = await delegateSubStore.get(context, delegateAddress);

		const { generatorKey } = await this._validatorsMethod.getValidatorKeys(
			getMethodContext(),
			header1.generatorAddress,
		);

		header1.validateSignature(generatorKey, chainID);
		header2.validateSignature(generatorKey, chainID);

		const maxPunishableHeight = Math.max(
			Math.abs(header1.height - currentHeight),
			Math.abs(header2.height - currentHeight),
		);

		if (maxPunishableHeight >= LOCKING_PERIOD_SELF_VOTES) {
			throw new Error('Locking period has expired.');
		}

		if (
			getPunishmentPeriod(
				delegateAddress,
				delegateAddress,
				delegateAccount.pomHeights,
				header.height,
			) > 0
		) {
			throw new Error('Delegate is already punished.');
		}

		if (delegateAccount.isBanned) {
			throw new Error('Delegate is already banned.');
		}

		/* Checking if the two headers are the same or not. */
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
		const { getMethodContext, params, transaction, header } = context;

		const currentHeight = header.height;
		const header1 = BlockHeader.fromBytes(params.header1);

		const punishedAddress = header1.generatorAddress;
		const delegateSubStore = this.stores.get(DelegateStore);
		const delegateAccount = await delegateSubStore.get(context, punishedAddress);

		const delegateAccountBalance = await this._tokenMethod.getAvailableBalance(
			getMethodContext(),
			punishedAddress,
			this._governanceTokenID,
		);

		delegateAccount.pomHeights.push(currentHeight);

		this.events.get(DelegatePunishedEvent).log(context, {
			address: punishedAddress,
			height: currentHeight,
		});

		if (delegateAccount.pomHeights.length === POM_LIMIT_BANNED) {
			delegateAccount.isBanned = true;

			this.events.get(DelegateBannedEvent).log(context, {
				address: punishedAddress,
				height: currentHeight,
			});
		}

		const currentWeight = getDelegateWeight(
			BigInt(this._factorSelfVotes),
			delegateAccount.selfVotes,
			delegateAccount.totalVotesReceived,
		);

		const eligibleDelegateStore = this.stores.get(EligibleDelegatesStore);
		await eligibleDelegateStore.update(context, punishedAddress, currentWeight, delegateAccount);

		await delegateSubStore.set(context, punishedAddress, delegateAccount);

		const reward =
			REPORTING_PUNISHMENT_REWARD > delegateAccountBalance
				? delegateAccountBalance
				: REPORTING_PUNISHMENT_REWARD;

		if (reward > BigInt(0)) {
			await this._tokenMethod.transfer(
				getMethodContext(),
				punishedAddress,
				transaction.senderAddress,
				this._governanceTokenID,
				reward,
			);
		}
	}
}
