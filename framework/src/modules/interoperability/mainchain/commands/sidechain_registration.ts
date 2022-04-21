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

import { hash } from '@liskhq/lisk-cryptography';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { BaseCommand } from '../../../base_command';
import {
	COMMAND_ID_SIDECHAIN_REG,
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_REGISTERED_NETWORK_IDS,
	STORE_PREFIX_REGISTERED_NAMES,
	MAX_UINT64,
} from '../../constants';
import { sidechainRegParams } from '../../schema';
import { SidechainRegistrationParams } from '../../types';
import { isValidName } from '../../utils';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../../node/state_machine/types';

export class SidechainRegistrationCommand extends BaseCommand {
	public id = COMMAND_ID_SIDECHAIN_REG;
	public name = 'sidechainRegistration';
	public schema = sidechainRegParams;

	public async verify(
		context: CommandVerifyContext<SidechainRegistrationParams>,
	): Promise<VerificationResult> {
		const {
			transaction,
			params: { certificateThreshold, initValidators, genesisBlockID, name },
		} = context;
		const errors = validator.validate(sidechainRegParams, context.params);

		if (errors.length > 0) {
			return {
				status: VerifyStatus.FAIL,
				error: new LiskValidationError(errors),
			};
		}

		// 	The sidechain name property has to contain only characters from the set [a-z0-9!@$&_.]
		if (!isValidName(name)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Sidechain name is in an unsupported format: ${name}`),
			};
		}

		// 	The sidechain name has to be unique with respect to the set of already registered sidechain names in the blockchain state
		const nameSubstore = context.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_REGISTERED_NAMES,
		);
		const nameExists = await nameSubstore.has(Buffer.from(name, 'utf8'));

		if (nameExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Name substore must not have an entry for the store key name'),
			};
		}

		const netID = hash(Buffer.concat([genesisBlockID, transaction.senderAddress]));

		// 	netId has to be unique with respect to the set of already registered sidechain network IDs in the blockchain state.
		const networkIDSubstore = context.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_REGISTERED_NETWORK_IDS,
		);
		const networkIDExists = await networkIDSubstore.has(netID);

		if (networkIDExists) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Network ID substore must not have an entry for the store key netID'),
			};
		}

		let totalBftWeight = BigInt(0);
		for (let i = 0; i < initValidators.length; i += 1) {
			const currentValidator = initValidators[i];

			// The blsKeys must be lexigraphically ordered and unique within the array.
			if (
				initValidators[i + 1] &&
				currentValidator.blsKey.compare(initValidators[i + 1].blsKey) > -1
			) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validators blsKeys must be unique and lexigraphically ordered'),
				};
			}

			if (currentValidator.bftWeight <= BigInt(0)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Validator bft weight must be greater than 0'),
				};
			}

			totalBftWeight += currentValidator.bftWeight;
		}

		if (totalBftWeight > MAX_UINT64) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Validator bft weight must not exceed ${MAX_UINT64}`),
			};
		}

		// Minimum certificateThreshold value: floor(1/3 * totalWeight) + 1
		// Note: BigInt truncates to floor
		if (certificateThreshold < totalBftWeight / BigInt(3) + BigInt(1)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Certificate threshold below minimum bft weight '),
			};
		}

		// Maximum certificateThreshold value: total bft weight
		if (certificateThreshold > totalBftWeight) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Certificate threshold above maximum bft weight'),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	// TODO
	// eslint-disable-next-line @typescript-eslint/require-await
	public async execute(
		_context: CommandExecuteContext<SidechainRegistrationParams>,
	): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
