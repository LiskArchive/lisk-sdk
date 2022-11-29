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
import { COMMISSION } from '../constants';
import { ValidatorRegisteredEvent } from '../events/validator_registered';
import { validatorRegistrationCommandParamsSchema } from '../schemas';
import { ValidatorStore } from '../stores/validator';
import { NameStore } from '../stores/name';
import { ValidatorRegistrationParams, ValidatorsMethod, FeeMethod } from '../types';
import { isUsername } from '../utils';

export class RegisterValidatorCommand extends BaseCommand {
	public schema = validatorRegistrationCommandParamsSchema;
	private _validatorsMethod!: ValidatorsMethod;
	private _feeMethod!: FeeMethod;
	private _validatorRegistrationFee!: bigint;

	public addDependencies(validatorsMethod: ValidatorsMethod, feeMethod: FeeMethod) {
		this._validatorsMethod = validatorsMethod;
		this._feeMethod = feeMethod;
	}

	public init(args: { validatorRegistrationFee: bigint }) {
		this._validatorRegistrationFee = args.validatorRegistrationFee;
	}

	public async verify(
		context: CommandVerifyContext<ValidatorRegistrationParams>,
	): Promise<VerificationResult> {
		const { transaction, params } = context;

		try {
			validator.validate(validatorRegistrationCommandParamsSchema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
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

		const validatorSubstore = this.stores.get(ValidatorStore);
		const validatorExists = await validatorSubstore.has(context, transaction.senderAddress);
		if (validatorExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Validator substore must not have an entry for the store key address'),
			};
		}

		if (transaction.fee < this._validatorRegistrationFee) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Insufficient transaction fee.'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<ValidatorRegistrationParams>): Promise<void> {
		const {
			transaction,
			params: { name, blsKey, generatorKey, proofOfPossession },
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

		this._feeMethod.payFee(context, this._validatorRegistrationFee);

		const validatorSubstore = this.stores.get(ValidatorStore);
		await validatorSubstore.set(context, transaction.senderAddress, {
			name,
			totalStakeReceived: BigInt(0),
			selfStake: BigInt(0),
			lastGeneratedHeight: height,
			isBanned: false,
			pomHeights: [],
			consecutiveMissedBlocks: 0,
			commission: COMMISSION,
			lastCommissionIncreaseHeight: height,
			sharingCoefficients: [],
		});

		const nameSubstore = this.stores.get(NameStore);
		await nameSubstore.set(context, Buffer.from(name, 'utf8'), {
			validatorAddress: transaction.senderAddress,
		});

		this.events.get(ValidatorRegisteredEvent).log(context, {
			address: transaction.senderAddress,
			name,
		});
	}
}
