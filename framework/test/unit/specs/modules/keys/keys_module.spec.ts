/*
 * Copyright © 2020 Lisk Foundation
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
import { hash } from '@liskhq/lisk-cryptography';
import { Transaction, transactionSchema } from './lisk_chain_transaction_tmp';
import { KeysModule } from '../../../../../src/modules/keys/keys_module';
import { createFakeDefaultAccount, StateStoreMock } from '../../../../utils/node';
import * as fixtures from './fixtures.json';
import { GenesisConfig } from '../../../../../src';

describe('keys module', () => {
	let decodedMultiSignature: any;
	let validTestTransaction: any;
	let targetMultisigAccount: any;
	let stateStore: any;
	let keysModule: KeysModule;
	let reducerHandler: any;
	let decodedBaseTransaction: any;

	const defualtTestCase = fixtures.testCases[0];

	const genesisConfig: GenesisConfig = {
		baseFees: [
			{
				assetType: 0,
				baseFee: BigInt(1),
				moduleType: 3,
			},
		],
		bftThreshold: 67,
		blockTime: 10,
		communityIdentifier: 'lisk',
		maxPayloadLength: 15360,
		minFeePerByte: 1,
		rewards: {
			distance: 1,
			milestones: ['milestone'],
			offset: 2,
		},
	};

	beforeEach(() => {
		keysModule = new KeysModule(genesisConfig);
		const buffer = Buffer.from(defualtTestCase.output.transaction, 'base64');
		const id = hash(buffer);
		decodedBaseTransaction = codec.decode<Transaction>(transactionSchema, buffer);
		decodedMultiSignature = {
			...decodedBaseTransaction,
			id,
		};
		validTestTransaction = new Transaction(decodedMultiSignature);

		targetMultisigAccount = createFakeDefaultAccount({
			address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
			balance: BigInt('94378900000'),
		});

		stateStore = new StateStoreMock();

		stateStore.account = {
			get: jest.fn().mockResolvedValue(targetMultisigAccount),
			getOrDefault: jest.fn().mockResolvedValue(
				createFakeDefaultAccount({
					address: Buffer.from(defualtTestCase.input.account.address, 'base64'),
				}) as never,
			),
		};

		reducerHandler = {};
	});

	describe('beforeTransactionApply', () => {
		it('should not fail to validate valid signatures', async () => {
			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: validTestTransaction,
					reducerHandler,
				}),
			).resolves.toBeUndefined();
		});

		it('should throw error if first signature is not from the sender public key', async () => {
			const invalidTransaction = {
				...validTestTransaction,
				signatures: [...validTestTransaction.signatures],
			};

			invalidTransaction.signatures[0] = Buffer.from(
				'6667778476d2d300d04cbdb8442eaa4a759999f04846d3098946f45911acbfc6592832840ef290dcc55c2b9e3e07cf5896ac5c01cd0dba740a643f0de1677f06',
				'hex',
			);

			const invalidTransactionInstance = new Transaction(invalidTransaction);

			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: invalidTransactionInstance as any,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error(
					"Failed to validate signature 'Zmd3hHbS0wDQTL24RC6qSnWZmfBIRtMJiUb0WRGsv8ZZKDKEDvKQ3MVcK54+B89YlqxcAc0NunQKZD8N4Wd/Bg==' for transaction with id '9Li6WfVUFi4WkrYYpXpxVbj/iQv9M7/8BOAFcffk/ro='",
				),
			);
		});

		it('should throw error if any of the mandatory signatures is not valid', async () => {
			const invalidTransaction = {
				...validTestTransaction,
				signatures: [...validTestTransaction.signatures],
			};

			// this is the first mandatory signature from the fixture; we change a byte
			invalidTransaction.signatures[1][10] = 10;

			const invalidTransactionInstance = new Transaction(invalidTransaction);

			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: invalidTransactionInstance as any,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error(
					"Failed to validate signature '3myu7/4VBi/m/gr/V1nXFTO80a9ndZ+7mM0lv9m81CfmJiWneNnJ5mVkaEfDcAK7g0KfkGczwUTKnzb7Wlw+BQ==' for transaction with id '0uM910NbJpiK3LgYj6STQAN09MxfJnKGjkXYjME3cRg='",
				),
			);
		});

		it('should throw error if any of the optional signatures is not valid', async () => {
			const invalidTransaction = {
				...validTestTransaction,
				signatures: [...validTestTransaction.signatures],
			};

			// this is the first optional signature from the fixture; we change a byte
			invalidTransaction.signatures[3][10] = 9;

			const invalidTransactionInstance = new Transaction(invalidTransaction);

			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: invalidTransactionInstance as any,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error(
					"Failed to validate signature 'HBBoFdFZusEi+gmRDRCRHJa5U10zkf4lc6whdaqqYnn1wjZkuc9mzIYinsREFK30q8MVpQF91HOh7/zcao1sDw==' for transaction with id 'QGBPNpD0ubTtZss+Ci5xNlDSniS3/D7P+bQxq4d4/+A='",
				),
			);
		});

		it('should throw error if signatures from sender, mandatory and optional keys are not all present', async () => {
			const invalidTransaction = {
				...validTestTransaction,
				signatures: [...validTestTransaction.signatures],
			};

			invalidTransaction.signatures.pop();

			const invalidTransactionInstance = new Transaction(invalidTransaction);

			return expect(
				keysModule.beforeTransactionApply({
					stateStore,
					transaction: invalidTransactionInstance as any,
					reducerHandler,
				}),
			).rejects.toStrictEqual(
				new Error('There are missing signatures. Expected: 5 signatures but got: 4'),
			);
		});
	});
});
