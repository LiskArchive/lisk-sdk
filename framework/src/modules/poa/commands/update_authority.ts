/*
 * Copyright © 2023 Lisk Foundation
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

import { MAX_UINT64, validator } from '@liskhq/lisk-validator';
import { bls } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { objects as objectUtils } from '@liskhq/lisk-utils';
import { BaseCommand } from '../../base_command';
import { updateAuthorityValidatorParamsSchema, validatorSignatureMessageSchema } from '../schemas';
import {
	COMMAND_UPDATE_AUTHORITY,
	MAX_NUM_VALIDATORS,
	MESSAGE_TAG_POA,
	EMPTY_BYTES,
	UpdateAuthority,
} from '../constants';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../state_machine';
import { UpdateAuthorityValidatorParams } from '../types';
import { ChainPropertiesStore, NameStore, SnapshotStore } from '../stores';
import { ValidatorsMethod } from '../../pos/types';
import { AuthorityUpdateEvent } from '../events/authority_update';

export class updateAuthorityCommand extends BaseCommand {
	public schema = updateAuthorityValidatorParamsSchema;
	private _validatorsMethod!: ValidatorsMethod;

	public get name(): string {
		return COMMAND_UPDATE_AUTHORITY;
	}

	public addDependencies(validatorsMethod: ValidatorsMethod) {
		this._validatorsMethod = validatorsMethod;
	}

	public async verify(
		context: CommandVerifyContext<UpdateAuthorityValidatorParams>,
	): Promise<VerificationResult> {
		const { newValidators, threshold, validatorsUpdateNonce } = context.params;
		try {
			validator.validate(updateAuthorityValidatorParamsSchema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: err as Error,
			};
		}
		if (newValidators.length < 1 || newValidators.length > MAX_NUM_VALIDATORS) {
			throw new Error('Invalid number of newValidators');
		}
		if (
			!objectUtils.bufferArrayOrderByLex(newValidators.map(newValidator => newValidator.address))
		) {
			throw new Error('Addresses in newValidators are not lexicographical ordered');
		}

		let totalWeight = BigInt(0);
		for (const newValidator of newValidators) {
			const isValidatorExist = await this.stores.get(NameStore).has(context, newValidator.address);
			if (!isValidatorExist) {
				throw new Error('newValidator does not exist');
			}
			totalWeight += newValidator.weight;
		}

		if (totalWeight > MAX_UINT64) {
			throw new Error('totalWeight out of range');
		}

		if (threshold < totalWeight / BigInt(3) + BigInt(1) || threshold > totalWeight) {
			throw new Error('Invalid threshold');
		}

		const chainProperties = await this.stores.get(ChainPropertiesStore).get(context, EMPTY_BYTES);
		if (validatorsUpdateNonce !== chainProperties.validatorsUpdateNonce) {
			throw new Error('Invalid validatorsUpdateNonce');
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(
		context: CommandExecuteContext<UpdateAuthorityValidatorParams>,
	): Promise<void> {
		const { newValidators, threshold, validatorsUpdateNonce, aggregationBits, signature } =
			context.params;
		const message = codec.encode(validatorSignatureMessageSchema, {
			newValidators,
			threshold,
			validatorsUpdateNonce,
		});
		const validatorInfos = [];
		const snapshotStore = await this.stores.get(SnapshotStore).get(context, Buffer.from([0]));
		for (const snapshotValidator of snapshotStore.validators) {
			const key = await this._validatorsMethod.getValidatorKeys(context, snapshotValidator.address);
			validatorInfos.push({
				key: key.blsKey,
				weight: snapshotValidator.weight,
			});
		}

		validatorInfos.sort((a, b) => a.key.compare(b.key));
		const verified = bls.verifyWeightedAggSig(
			validatorInfos.map(validatorInfo => validatorInfo.key),
			aggregationBits,
			signature,
			MESSAGE_TAG_POA,
			context.chainID,
			message,
			validatorInfos.map(validatorInfo => validatorInfo.weight),
			snapshotStore.threshold,
		);
		if (!verified) {
			this.events.get(AuthorityUpdateEvent).log(context, {
				result: UpdateAuthority.FAIL_INVALID_SIGNATURE,
			});
		}
		await this.stores.get(SnapshotStore).set(context, Buffer.from([2]), {
			validators: newValidators,
			threshold,
		});

		const chainProperties = await this.stores.get(ChainPropertiesStore).get(context, EMPTY_BYTES);
		await this.stores.get(ChainPropertiesStore).set(context, EMPTY_BYTES, {
			...chainProperties,
			validatorsUpdateNonce: chainProperties.validatorsUpdateNonce + 1,
		});

		this.events.get(AuthorityUpdateEvent).log(context, {
			result: UpdateAuthority.SUCCESS,
		});
	}
}
