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

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { LiskValidationError } from '@liskhq/lisk-validator';
import * as testing from '../../../../../../src/testing';
import { MainchainRegistrationCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/mainchain_registration';
import {
	COMMAND_ID_MAINCHAIN_REG,
	MAX_UINT32,
	MODULE_ID_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { mainchainRegParams } from '../../../../../../src/modules/interoperability/schema';
import {
	ActiveValidators,
	MainchainRegistrationParams,
} from '../../../../../../src/modules/interoperability/types';
import { VerifyStatus, CommandVerifyContext } from '../../../../../../src/node/state_machine';
import { sortValidatorsByBLSKey } from '../../../../../../src/modules/interoperability/utils';

describe('Mainchain registration command', () => {
	const unsortedMainchainValidators: ActiveValidators[] = [];
	for (let i = 0; i < 101; i += 1) {
		unsortedMainchainValidators.push({ blsKey: getRandomBytes(48), bftWeight: BigInt(1) });
	}
	const mainchainValidators = sortValidatorsByBLSKey(unsortedMainchainValidators);
	const transactionParams: MainchainRegistrationParams = {
		ownChainID: 11,
		ownName: 'testchain',
		mainchainValidators,
		aggregationBits: Buffer.alloc(0),
		signature: Buffer.alloc(0),
	};
	const encodedTransactionParams = codec.encode(mainchainRegParams, transactionParams);
	const publicKey = getRandomBytes(32);
	const transaction = new Transaction({
		moduleID: MODULE_ID_INTEROPERABILITY,
		commandID: COMMAND_ID_MAINCHAIN_REG,
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: encodedTransactionParams,
		signatures: [publicKey],
	});
	const networkIdentifier = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);
	let mainchainRegistrationCommand: MainchainRegistrationCommand;
	let verifyContext: CommandVerifyContext<MainchainRegistrationParams>;

	beforeEach(() => {
		mainchainRegistrationCommand = new MainchainRegistrationCommand(
			MODULE_ID_INTEROPERABILITY,
			new Map(),
			new Map(),
		);
	});

	describe('verify', () => {
		beforeEach(() => {
			verifyContext = testing
				.createTransactionContext({
					transaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<MainchainRegistrationParams>(mainchainRegParams);
		});

		it('should return status OK for valid params', async () => {
			const result = await mainchainRegistrationCommand.verify(verifyContext);
			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if own chain id is greater than maximum uint32 number', async () => {
			verifyContext.params.ownChainID = MAX_UINT32 + 1;
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error).toBeInstanceOf(LiskValidationError);
		});

		it('should return error if bls key is not 48 bytes', async () => {
			verifyContext.params.mainchainValidators[1].blsKey = getRandomBytes(47);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error).toBeInstanceOf(Error);
		});

		it('should return error if name is invalid', async () => {
			verifyContext.params.ownName = '*@#&$_2';
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Sidechain name is in an unsupported format: *@#&$_2`,
			);
		});

		it('should return error if number of mainchain validators is not 101', async () => {
			verifyContext.params.mainchainValidators.pop();
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Number of mainchain validators must be equal to 101`,
			);
		});

		it('should return error if bls keys are not lexigraphically ordered', async () => {
			const temp = verifyContext.params.mainchainValidators[0].blsKey;
			verifyContext.params.mainchainValidators[0].blsKey =
				verifyContext.params.mainchainValidators[1].blsKey;
			verifyContext.params.mainchainValidators[1].blsKey = temp;
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Validators blsKeys must be unique and lexigraphically ordered',
			);
		});

		it('should return error if duplicate bls keys', async () => {
			verifyContext.params.mainchainValidators[0].blsKey =
				verifyContext.params.mainchainValidators[1].blsKey;
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Validators blsKeys must be unique and lexigraphically ordered',
			);
		});

		it('should return error if invalid bft weight', async () => {
			verifyContext.params.mainchainValidators[0].bftWeight = BigInt(5);
			const result = await mainchainRegistrationCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Validator bft weight must be equal to 1');
		});
	});
});
