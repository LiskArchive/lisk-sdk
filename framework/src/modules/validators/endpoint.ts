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

import { blsPopVerify } from '@liskhq/lisk-cryptography';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { NotFoundError } from '@liskhq/lisk-db';
import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { generatorListSchema, ValidateBLSKeyRequest, validateBLSKeyRequestSchema } from './schemas';
import {
	MODULE_ID_VALIDATORS,
	STORE_PREFIX_BLS_KEYS,
	STORE_PREFIX_GENERATOR_LIST,
} from './constants';
import { GeneratorList } from './types';

export class ValidatorsEndpoint extends BaseEndpoint {
	public async getGeneratorList(ctx: ModuleEndpointContext): Promise<{ list: string[] }> {
		const generatorListSubStore = ctx.getStore(MODULE_ID_VALIDATORS, STORE_PREFIX_GENERATOR_LIST);
		const emptyKey = Buffer.alloc(0);
		const generatorList = await generatorListSubStore.getWithSchema<GeneratorList>(
			emptyKey,
			generatorListSchema,
		);

		return { list: generatorList.addresses.map(buf => buf.toString('hex')) };
	}

	public async validateBLSKey(ctx: ModuleEndpointContext): Promise<{ valid: boolean }> {
		const reqErrors = validator.validate(validateBLSKeyRequestSchema, ctx.params);
		if (reqErrors?.length) {
			throw new LiskValidationError(reqErrors);
		}

		const req = (ctx.params as unknown) as ValidateBLSKeyRequest;
		const { proofOfPossession, blsKey } = req;

		const blsKeysSubStore = ctx.getStore(MODULE_ID_VALIDATORS, STORE_PREFIX_BLS_KEYS);

		let persistedValue;

		try {
			persistedValue = await blsKeysSubStore.get(Buffer.from(blsKey, 'hex'));
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}

		if (persistedValue) {
			return { valid: false };
		}

		return {
			valid: blsPopVerify(Buffer.from(blsKey, 'hex'), Buffer.from(proofOfPossession, 'hex')),
		};
	}
}
