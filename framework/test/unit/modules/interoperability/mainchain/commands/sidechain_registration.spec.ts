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

import { hash, getRandomBytes } from '@liskhq/lisk-cryptography';
import { StateStore, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import * as testing from '../../../../../../src/testing';
import { SidechainRegistrationCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/sidechain_registration';
import {
	COMMAND_ID_SIDECHAIN_REG,
	MAX_UINT64,
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_REGISTERED_NAMES,
	STORE_PREFIX_REGISTERED_NETWORK_IDS,
} from '../../../../../../src/modules/interoperability/constants';
import {
	nameSchema,
	chainIDSchema,
	sidechainRegParams,
} from '../../../../../../src/modules/interoperability/schema';
import { SidechainRegistrationParams } from '../../../../../../src/modules/interoperability/types';
import { VerifyStatus } from '../../../../../../src/node/state_machine';

describe('Sidechain registration command', () => {
	let sidechainRegistrationCommand: SidechainRegistrationCommand;
	let db: KVStore;
	let stateStore: StateStore;
	let nameSubstore: StateStore;
	let networkIDSubstore: StateStore;

	const transactionParams = {
		name: 'sidechain',
		genesisBlockID: Buffer.alloc(0),
		initValidators: [
			{
				blsKey: Buffer.from(
					'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
					'hex',
				),
				bftWeight: BigInt(10),
			},
			{
				blsKey: Buffer.from(
					'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
					'hex',
				),
				bftWeight: BigInt(10),
			},
		],
		certificateThreshold: BigInt(10),
	};

	const encodedTransactionParams = codec.encode(sidechainRegParams, transactionParams);
	const publicKey = getRandomBytes(32);
	const transaction = new Transaction({
		moduleID: MODULE_ID_INTEROPERABILITY,
		commandID: COMMAND_ID_SIDECHAIN_REG,
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
	const netID = hash(Buffer.concat([Buffer.alloc(0), transaction.senderAddress]));

	beforeEach(() => {
		sidechainRegistrationCommand = new SidechainRegistrationCommand(MODULE_ID_INTEROPERABILITY);
		db = new InMemoryKVStore() as never;
		stateStore = new StateStore(db);
		nameSubstore = stateStore.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_REGISTERED_NAMES);
		networkIDSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_REGISTERED_NETWORK_IDS,
		);
	});

	describe('verify', () => {
		it('should return status OK for valid params', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
			const result = await sidechainRegistrationCommand.verify(context);
			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if name is invalid', async () => {
			const invalidParams = codec.encode(sidechainRegParams, {
				...transactionParams,
				name: '*@#&$_2',
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY,
				commandID: COMMAND_ID_SIDECHAIN_REG,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
			const result = await sidechainRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Sidechain name is in an unsupported format: *@#&$_2`,
			);
		});

		it('should return error if store key name already exists in name store', async () => {
			await nameSubstore.setWithSchema(
				Buffer.from(transactionParams.name, 'utf8'),
				{ chainID: 0 },
				nameSchema,
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
			const result = await sidechainRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Name substore must not have an entry for the store key name',
			);
		});

		it('should return error if store key netID already exists in networkID store', async () => {
			await networkIDSubstore.setWithSchema(netID, { chainID: 0 }, chainIDSchema);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
			const result = await sidechainRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Network ID substore must not have an entry for the store key netID',
			);
		});

		it('should return error if bls keys are not lexigraphically ordered', async () => {
			const invalidParams = codec.encode(sidechainRegParams, {
				...transactionParams,
				initValidators: [
					{
						blsKey: Buffer.from(
							'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
							'hex',
						),
						bftWeight: BigInt(10),
					},
					{
						blsKey: Buffer.from(
							'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
							'hex',
						),
						bftWeight: BigInt(10),
					},
				],
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY,
				commandID: COMMAND_ID_SIDECHAIN_REG,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
			const result = await sidechainRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Validators blsKeys must be unique and lexigraphically ordered',
			);
		});

		it('should return error if duplicate bls keys', async () => {
			const invalidParams = codec.encode(sidechainRegParams, {
				...transactionParams,
				initValidators: [
					{
						blsKey: Buffer.from(
							'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
							'hex',
						),
						bftWeight: BigInt(10),
					},
					{
						blsKey: Buffer.from(
							'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
							'hex',
						),
						bftWeight: BigInt(10),
					},
				],
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY,
				commandID: COMMAND_ID_SIDECHAIN_REG,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
			const result = await sidechainRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Validators blsKeys must be unique and lexigraphically ordered',
			);
		});

		it('should return error if invalid bft weight', async () => {
			const invalidParams = codec.encode(sidechainRegParams, {
				...transactionParams,
				certificateThreshold: BigInt(0),
				initValidators: [
					{
						blsKey: Buffer.from(
							'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
							'hex',
						),
						bftWeight: BigInt(0),
					},
					{
						blsKey: Buffer.from(
							'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
							'hex',
						),
						bftWeight: BigInt(0),
					},
				],
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY,
				commandID: COMMAND_ID_SIDECHAIN_REG,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
			const result = await sidechainRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Validator bft weight must be greater than 0');
		});

		it(`should return error if totalBftWeight exceeds ${MAX_UINT64}`, async () => {
			const invalidParams = codec.encode(sidechainRegParams, {
				...transactionParams,
				initValidators: [
					{
						blsKey: Buffer.from(
							'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
							'hex',
						),
						bftWeight: MAX_UINT64,
					},
					{
						blsKey: Buffer.from(
							'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
							'hex',
						),
						bftWeight: BigInt(10),
					},
				],
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY,
				commandID: COMMAND_ID_SIDECHAIN_REG,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
			const result = await sidechainRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Validator bft weight must not exceed ${MAX_UINT64}`);
		});

		it('should return error if certificate theshold below minimum weight', async () => {
			const invalidParams = codec.encode(sidechainRegParams, {
				...transactionParams,
				certificateThreshold: BigInt(1),
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY,
				commandID: COMMAND_ID_SIDECHAIN_REG,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
			const result = await sidechainRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Certificate threshold below minimum bft weight');
		});

		it('should return error if certificate theshold exceeds maximum weight', async () => {
			const invalidParams = codec.encode(sidechainRegParams, {
				...transactionParams,
				certificateThreshold: BigInt(1000),
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY,
				commandID: COMMAND_ID_SIDECHAIN_REG,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<SidechainRegistrationParams>(sidechainRegParams);
			const result = await sidechainRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Certificate threshold exceeds total bft weight');
		});
	});
});
