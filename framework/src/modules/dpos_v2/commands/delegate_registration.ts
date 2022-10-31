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
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { DELEGATE_REGISTRATION_FEE, TOKEN_ID_FEE } from '../constants';
import { DelegateRegisteredEvent } from '../events/delegate_registered';
import { delegateRegistrationCommandParamsSchema } from '../schemas';
import { DelegateStore } from '../stores/delegate';
import { NameStore } from '../stores/name';
import { DelegateRegistrationParams, TokenMethod, ValidatorsMethod } from '../types';
import { isUsername } from '../utils';

export class DelegateRegistrationCommand extends BaseCommand {
	public schema = delegateRegistrationCommandParamsSchema;
	private _validatorsMethod!: ValidatorsMethod;
	private _tokenMethod!: TokenMethod;

	public addDependencies(tokenMethod: TokenMethod, validatorsMethod: ValidatorsMethod) {
		this._tokenMethod = tokenMethod;
		this._validatorsMethod = validatorsMethod;
	}

	public get name() {
		return 'registerDelegate';
	}

	public async verify(
		context: CommandVerifyContext<DelegateRegistrationParams>,
	): Promise<VerificationResult> {
		const { transaction, params } = context;

		try {
			validator.validate(delegateRegistrationCommandParamsSchema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}

		if (context.params.delegateRegistrationFee !== DELEGATE_REGISTRATION_FEE) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Invalid delegate registration fee.'),
			};
		}

		const balance = await this._tokenMethod.getAvailableBalance(
			context,
			transaction.senderAddress,
			TOKEN_ID_FEE,
		);
		if (balance < DELEGATE_REGISTRATION_FEE) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Not sufficient amount for delegate registration fee.'),
			};
		}

		if (!isUsername(params.name)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`'name' is in an unsupported format: ${params.name}`),
			};
		}

		const nameSubstore = this.stores.get(NameStore);
		const nameExists = await nameSubstore.has(context, Buffer.from(params.name, 'utf8'));
		if (nameExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Name substore must not have an entry for the store key name'),
			};
		}

		const delegateSubstore = this.stores.get(DelegateStore);
		const delegateExists = await delegateSubstore.has(context, transaction.senderAddress);
		if (delegateExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Delegate substore must not have an entry for the store key address'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<DelegateRegistrationParams>): Promise<void> {
		const {
			transaction,
			params: { name, blsKey, generatorKey, proofOfPossession, delegateRegistrationFee },
			header: { height },
		} = context;
		const methodContext = context.getMethodContext();

		const isRegistered = await this._validatorsMethod.registerValidatorKeys(
			methodContext,
			transaction.senderAddress,
			blsKey,
			generatorKey,
			proofOfPossession,
		);

		if (!isRegistered) {
			throw new Error('Failed to register validator keys');
		}

		await this._tokenMethod.burn(
			context,
			transaction.senderAddress,
			TOKEN_ID_FEE,
			delegateRegistrationFee,
		);

		const delegateSubstore = this.stores.get(DelegateStore);
		await delegateSubstore.set(context, transaction.senderAddress, {
			name,
			totalVotesReceived: BigInt(0),
			selfVotes: BigInt(0),
			lastGeneratedHeight: height,
			isBanned: false,
			pomHeights: [],
			consecutiveMissedBlocks: 0,
			// TODO: Issue #7665
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
		});

		const nameSubstore = this.stores.get(NameStore);
		await nameSubstore.set(context, Buffer.from(name, 'utf8'), {
			delegateAddress: transaction.senderAddress,
		});

		this.events.get(DelegateRegisteredEvent).log(context, {
			address: transaction.senderAddress,
			name,
		});
	}
}
