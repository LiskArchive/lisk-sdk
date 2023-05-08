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

import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { utils, ed, address as cryptoAddress } from '@liskhq/lisk-cryptography';
import * as testing from '../../../../src/testing';
import { RegisterMultisignatureCommand } from '../../../../src/modules/auth/commands/register_multisignature';
import {
	registerMultisignatureParamsSchema,
	multisigRegMsgSchema,
} from '../../../../src/modules/auth/schemas';
import { RegisterMultisignatureParams } from '../../../../src/modules/auth/types';
import { VerifyStatus } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { AuthModule } from '../../../../src/modules/auth';
import { AuthAccount, AuthAccountStore } from '../../../../src/modules/auth/stores/auth_account';
import { InvalidSignatureEvent } from '../../../../src/modules/auth/events/invalid_signature';
import { MultisignatureRegistrationEvent } from '../../../../src/modules/auth/events/multisignature_registration';
import { MESSAGE_TAG_MULTISIG_REG } from '../../../../src/modules/auth/constants';

describe('Register Multisignature command', () => {
	const keyPairsString = [
		{
			privateKey:
				'2475a8233503caade9542f2dd6c8c725f10bc03e3f809210b768f0a2320f06d50904c986211330582ef5e41ed9a2e7d6730bb7bdc59459a0caaaba55be4ec128',
			publicKey: '0904c986211330582ef5e41ed9a2e7d6730bb7bdc59459a0caaaba55be4ec128',
		},
		{
			privateKey:
				'985bc97b4b2aa91d590dde455c19c70818d97c56c7cfff790a1e0b71e3d15962557f1b9647fd2aefa357fed8bead72d1b02e5151b57d3c32d4d3f808c0705026',
			publicKey: '557f1b9647fd2aefa357fed8bead72d1b02e5151b57d3c32d4d3f808c0705026',
		},
		{
			privateKey:
				'd0b159fe5a7cc3d5f4b39a97621b514bc55b0a0f1aca8adeed2dd1899d93f103a3f96c50d0446220ef2f98240898515cbba8155730679ca35326d98dcfb680f0',
			publicKey: 'a3f96c50d0446220ef2f98240898515cbba8155730679ca35326d98dcfb680f0',
		},
		{
			privateKey:
				'03e7852c6f1c6fe5cd0c5f7e3a36e499a1e0207e867f74f5b5bc42bfcc888bc8b8d2422aa7ebf1f85031f0bac2403be1fb24e0196d3bbed33987d4769eb37411',
			publicKey: 'b8d2422aa7ebf1f85031f0bac2403be1fb24e0196d3bbed33987d4769eb37411',
		},
	];

	const keyPairs = keyPairsString.map(keyPair => ({
		privateKey: Buffer.from(keyPair.privateKey, 'hex'),
		publicKey: Buffer.from(keyPair.publicKey, 'hex'),
	}));

	let registerMultisignatureCommand: RegisterMultisignatureCommand;
	let stateStore: PrefixedStateReadWriter;
	let authAccountStore: AuthAccountStore;

	const authModule = new AuthModule();
	const chainID = Buffer.from('04000000', 'hex');

	const defaultAuthAccount: AuthAccount = {
		numberOfSignatures: 0,
		mandatoryKeys: [],
		optionalKeys: [],
		nonce: BigInt(0),
	};

	const multisigParams = {
		numberOfSignatures: 4,
		mandatoryKeys: [keyPairs[0].publicKey, keyPairs[1].publicKey],
		optionalKeys: [keyPairs[2].publicKey, keyPairs[3].publicKey],
	};

	const senderAddress = cryptoAddress.getAddressFromPublicKey(multisigParams.mandatoryKeys[0]);
	const decodedMessage = {
		address: senderAddress,
		nonce: BigInt(0),
		...multisigParams,
	};
	const encodedMessage = codec.encode(multisigRegMsgSchema, decodedMessage);

	const signatures: Buffer[] = [];

	for (const keyPair of keyPairs) {
		signatures.push(
			ed.signData(MESSAGE_TAG_MULTISIG_REG, chainID, encodedMessage, keyPair.privateKey),
		);
	}

	const decodedParams: RegisterMultisignatureParams = {
		numberOfSignatures: multisigParams.numberOfSignatures,
		mandatoryKeys: multisigParams.mandatoryKeys,
		optionalKeys: multisigParams.optionalKeys,
		signatures,
	};

	const encodedParams = codec.encode(registerMultisignatureParamsSchema, decodedParams);

	const transaction = new Transaction({
		module: 'auth',
		command: 'registerMultisignature',
		fee: BigInt('100000000'),
		params: encodedParams,
		nonce: BigInt(0),
		senderPublicKey: keyPairs[0].publicKey,
		signatures: [utils.getRandomBytes(64)],
	});

	beforeEach(() => {
		registerMultisignatureCommand = new RegisterMultisignatureCommand(
			authModule.stores,
			authModule.events,
		);
	});

	describe('verify', () => {
		it('should return status OK for valid params', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if params has numberOfSignatures > 64', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				numberOfSignatures: 100,
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toInclude('must be <= 64');
		});

		it('should return error if params has numberOfSignatures < 1', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				numberOfSignatures: 0,
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toInclude('must be >= 1');
		});

		it('should return error if params has more than 64 mandatory keys', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				mandatoryKeys: [...Array(65).keys()].map(() => utils.getRandomBytes(32)),
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toInclude('must NOT have more than 64 items');
		});

		it('should return error if params mandatory keys contains items with length bigger than 32 bytes', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				mandatoryKeys: [utils.getRandomBytes(32), utils.getRandomBytes(64)],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toInclude("Property '.mandatoryKeys.1' maxLength exceeded");
		});

		it('should return error if params mandatory keys contains items with length smaller than 32 bytes', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				mandatoryKeys: [utils.getRandomBytes(10), utils.getRandomBytes(32)],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toInclude('minLength not satisfied');
		});

		it('should return error if params optional keys contains items with length bigger than 32 bytes', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [utils.getRandomBytes(64)],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toInclude('maxLength exceeded');
		});

		it('should return error if params optional keys contains items with length smaller than 32 bytes', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [utils.getRandomBytes(31)],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toInclude('minLength not satisfied');
		});

		it('should return error if params has more than 64 optional keys', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [...Array(65).keys()].map(() => utils.getRandomBytes(32)),
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toInclude('must NOT have more than 64 items');
		});

		it('should return error when there are duplicated mandatory keys', async () => {
			const publicKey = utils.getRandomBytes(32);
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				mandatoryKeys: [publicKey, publicKey],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe('MandatoryKeys contains duplicate public keys.');
		});

		it('should return error when there are duplicated optional keys', async () => {
			const publicKey = utils.getRandomBytes(32);
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [publicKey, publicKey],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe('OptionalKeys contains duplicate public keys.');
		});

		it('should return error when numberOfSignatures is bigger than the count of all keys', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				numberOfSignatures: 5,
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
			);
		});

		it('should return error when numberOfSignatures is smaller than mandatory key count', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				numberOfSignatures: 1,
				signatures: [utils.getRandomBytes(64)],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe(
				'The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys.',
			);
		});

		it('should return error when mandatory and optional key sets are not disjointed', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [keyPairs[0].publicKey, keyPairs[2].publicKey],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe(
				'Invalid combination of Mandatory and Optional keys. Repeated keys across Mandatory and Optional were found.',
			);
		});

		it('should return error when mandatory keys set is not sorted', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				mandatoryKeys: [keyPairs[1].publicKey, keyPairs[0].publicKey],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe('Mandatory keys should be sorted lexicographically.');
		});

		it('should return error when optional keys set is not sorted', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [keyPairs[3].publicKey, keyPairs[2].publicKey],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe('Optional keys should be sorted lexicographically.');
		});

		it('should return error when the number of optional and mandatory keys is more than 64', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [...Array(65).keys()].map(() => utils.getRandomBytes(32)),
				mandatoryKeys: [...Array(65).keys()].map(() => utils.getRandomBytes(32)),
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toInclude('must NOT have more than 64 item');
		});

		it('should return error when no keys are provided', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				optionalKeys: [],
				mandatoryKeys: [],
				numberOfSignatures: 0,
				signatures: [],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toInclude('must be >= 1');
		});
	});

	describe('execute', () => {
		const eventQueueMock: any = { add: jest.fn() };

		beforeEach(() => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			authAccountStore = authModule.stores.get(AuthAccountStore);
		});

		it('should not throw when registering for the first time and signatures are valid', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandExecuteContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			await authAccountStore.set(context, transaction.senderAddress, defaultAuthAccount);

			context.eventQueue = eventQueueMock;
			jest.spyOn(authModule.events.get(MultisignatureRegistrationEvent), 'log');

			await expect(registerMultisignatureCommand.execute(context)).resolves.toBeUndefined();

			const authAccount = await authAccountStore.get(context, transaction.senderAddress);

			expect(authAccount.numberOfSignatures).toBe(decodedParams.numberOfSignatures);
			expect(authAccount.mandatoryKeys).toEqual(decodedParams.mandatoryKeys);
			expect(authAccount.optionalKeys).toEqual(decodedParams.optionalKeys);
			expect(authModule.events.get(MultisignatureRegistrationEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				transaction.senderAddress,
				{
					numberOfSignatures: context.params.numberOfSignatures,
					mandatoryKeys: context.params.mandatoryKeys,
					optionalKeys: context.params.optionalKeys,
				},
			);
		});

		it('should throw when the signature is incorrect', async () => {
			const invalidSignature = utils.getRandomBytes(64);
			decodedParams.signatures[0] = invalidSignature;

			const invalidTransaction = new Transaction({
				...transaction.toObject(),
				params: codec.encode(registerMultisignatureParamsSchema, decodedParams),
			});

			const context = testing
				.createTransactionContext({
					stateStore,
					transaction: invalidTransaction,
					chainID,
				})
				.createCommandExecuteContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			await authAccountStore.set(context, transaction.senderAddress, defaultAuthAccount);
			context.eventQueue = eventQueueMock;
			jest.spyOn(authModule.events.get(InvalidSignatureEvent), 'error');

			await expect(registerMultisignatureCommand.execute(context)).rejects.toThrow(
				`Invalid signature for public key ${context.params.mandatoryKeys[0].toString('hex')}.`,
			);

			expect(authModule.events.get(InvalidSignatureEvent).error).toHaveBeenCalledWith(
				expect.anything(),
				invalidTransaction.senderAddress,
				{
					numberOfSignatures: context.params.numberOfSignatures,
					mandatoryKeys: context.params.mandatoryKeys,
					optionalKeys: context.params.optionalKeys,
					failingPublicKey: context.params.mandatoryKeys[0],
					failingSignature: invalidSignature,
				},
			);
		});
	});
});
