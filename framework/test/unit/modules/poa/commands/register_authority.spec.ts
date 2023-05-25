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

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import * as testing from '../../../../../src/testing';
import { Transaction, VerifyStatus } from '../../../../../src';
import { RegisterAuthorityCommand } from '../../../../../src/modules/poa/commands/register_authority';
import { PoAModule } from '../../../../../src';
import { ValidatorsMethod } from '../../../../../dist-node/modules/pos/types';
import { FeeMethod } from '../../../../../dist-node/modules/interoperability/types';
import { COMMAND_REGISTER_AUTHORITY } from '../../../../../dist-node/modules/poa/constants';

import { registerAuthorityParamsSchema } from '../../../../../src/modules/poa/schemas';
import { RegisterAuthorityParams } from '../../../../../src/modules/poa/types';

describe('RegisterAuthority', () => {
	const poa = new PoAModule();
	let registerAuthorityCommand: RegisterAuthorityCommand;
	let mockValidatorsMethod: ValidatorsMethod;
	let mockFeeMethod: FeeMethod;

	const transactionParams = {
		name: 'max',
		blsKey: utils.getRandomBytes(48),
		proofOfPossession: utils.getRandomBytes(96),
		generatorKey: utils.getRandomBytes(32),
	};
	const publicKey = utils.getRandomBytes(32);
	const transaction = new Transaction({
		module: 'poa',
		command: COMMAND_REGISTER_AUTHORITY,
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(1000000000),
		params: codec.encode(registerAuthorityParamsSchema, transactionParams),
		signatures: [publicKey],
	});
	const chainID = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);

	beforeEach(() => {
		registerAuthorityCommand = new RegisterAuthorityCommand(poa.stores, poa.events);
		mockValidatorsMethod = {
			setValidatorGeneratorKey: jest.fn(),
			registerValidatorKeys: jest.fn(),
			registerValidatorWithoutBLSKey: jest.fn(),
			getValidatorKeys: jest.fn(),
			getGeneratorsBetweenTimestamps: jest.fn(),
			setValidatorsParams: jest.fn(),
		};
		mockFeeMethod = {
			payFee: jest.fn(),
		};
		registerAuthorityCommand.addDependencies(mockValidatorsMethod, mockFeeMethod);
	});

	describe('verify', () => {
		it('should return error when name is empty', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					chainID,
				})
				.createCommandVerifyContext<RegisterAuthorityParams>(registerAuthorityParamsSchema);
			const result = await registerAuthorityCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
		});

		it('should return error when name does not comply regex', async () => {});

		it('should return error when name already exist', async () => {});

		it('should return error when senderAddress already exist', async () => {});
	});

	describe('execute', () => {
		it('should call registerValidatorKeys', async () => {});
	});
});
