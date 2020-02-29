/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { SignatureObject } from '../src/create_signature_object';
import { MultisignatureTransaction } from '../src/12_multisignature_transaction';
import { Account, TransactionJSON } from '../src/transaction_types';
import { Status } from '../src/response';
import { defaultAccount, StateStoreMock } from './utils/state_store_mock';
import * as multisignatureFixture from '../fixtures/transaction_network_id_and_change_order/multi_signature_transaction_validate.json';
import { validTransaction } from '../fixtures';

describe('Multisignature transaction class', () => {
	const validMultisignatureRegistrationTransaction =
		multisignatureFixture.testCases[0].output;
	const {
		signatures,
		...validMultisignatureRegistrationTransactionNoSigs
	} = validMultisignatureRegistrationTransaction;
	const validMultisignatureAccount = {
		...multisignatureFixture.testCases[0].input.account,
		membersPublicKeys: multisignatureFixture.testCases[0].input.coSigners.map(
			account => account.publicKey,
		),
		balance: BigInt('94378900000'),
		multiMin: 2,
		multiLifetime: 22,
	};
	const {
		membersPublicKeys,
		multiLifetime,
		multiMin,
		...nonMultisignatureAccount
	} = validMultisignatureAccount;
	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';
	let validTestTransaction: MultisignatureTransaction;
	let nonMultisignatureSender: Account;
	let multisignatureSender: Account;
	let store: StateStoreMock;

	beforeEach(async () => {
		validTestTransaction = new MultisignatureTransaction({
			...validMultisignatureRegistrationTransaction,
			networkIdentifier,
		});
		nonMultisignatureSender = {
			...defaultAccount,
			address:
				'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
			...nonMultisignatureAccount,
		};
		multisignatureSender = { ...defaultAccount, ...validMultisignatureAccount };

		store = new StateStoreMock([multisignatureSender, nonMultisignatureSender]);

		jest.spyOn(store.account, 'get');
		jest.spyOn(store.account, 'cache');
		jest.spyOn(store.account, 'set');
	});

	describe('#constructor', () => {
		it('should create instance of MultisignatureTransaction', async () => {
			expect(validTestTransaction).toBeInstanceOf(MultisignatureTransaction);
		});

		it('should set multisignature asset', async () => {
			expect(validTestTransaction.asset).toEqual(
				validMultisignatureRegistrationTransaction.asset,
			);
		});

		it('should set _multisignatureStatus to PENDING', async () => {
			expect(validTestTransaction).toHaveProperty('_multisignatureStatus', 2);
		});

		it('should throw TransactionMultiError when asset min is not a number', async () => {
			const invalidMultisignatureTransactionData = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					min: '2',
				},
			};
			expect(
				() =>
					new MultisignatureTransaction(invalidMultisignatureTransactionData),
			).not.toThrowError();
		});

		it('should not throw TransactionMultiError when asset lifetime is not a number', async () => {
			const invalidMultisignatureTransactionData = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					lifetime: '1',
				},
			};
			expect(
				() =>
					new MultisignatureTransaction(invalidMultisignatureTransactionData),
			).not.toThrowError();
		});
	});

	describe('#assetToBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).assetToBytes();

			expect(assetBytes).toEqual(
				Buffer.from(
					'02162b306232313166636534623631353038333730316362386138633939343037653436346232663961613466333637303935333232646531623737653566636662652b363736366365323830656239396534356432636337643963386338353237323039343064616235643639663438306538303437376139376234323535643564382b31333837643865633633303638303766666436666532376561333434333938353736356331313537393238626230393930343330373935366634366139393732',
					'hex',
				),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true with non conflicting transactions', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validTransaction,
			] as ReadonlyArray<TransactionJSON>);

			expect(errors).toHaveLength(0);
			expect(status).toBe(Status.OK);
		});

		it('should return TransactionResponse with error when other transaction from same account has the same type', async () => {
			const conflictTransaction = {
				...validTransaction,
				senderPublicKey:
					'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
				type: 12,
			};
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				conflictTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors).toHaveLength(1);
			expect(status).toBe(Status.FAIL);
		});
	});

	describe('#assetToJSON', () => {
		it('should return an object of type transfer asset', async () => {
			expect(validTestTransaction.assetToJSON()).toEqual(
				validMultisignatureRegistrationTransaction.asset,
			);
		});
	});

	describe('#prepare', () => {
		it('should call state store with correct params', async () => {
			await validTestTransaction.prepare(store);
			// Derive addresses from public keys
			const membersAddresses = validTestTransaction.asset.keysgroup
				.map(key => key.substring(1))
				.map(aKey => ({ address: getAddressFromPublicKey(aKey) }));

			expect(store.account.cache).toHaveBeenCalledWith([
				{ address: validTestTransaction.senderId },
				...membersAddresses,
			]);
		});
	});

	describe('#validateSchema', () => {
		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).validateAsset();
			expect(errors).toHaveLength(0);
		});

		it('should return error when asset min is over limit', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					min: 18,
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(1);
		});

		it('should return error when lifetime is under minimum', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					lifetime: 0,
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(1);
		});

		it('should return error when keysgroup includes invalid keys', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					keysgroup: validMultisignatureRegistrationTransaction.asset.keysgroup.map(
						(key: string) => key.replace('+', ''),
					),
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(3);
		});

		it('should return error when keysgroup has too many keys', async () => {
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				asset: {
					...validMultisignatureRegistrationTransaction.asset,
					keysgroup: [
						'+40af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
						'+d042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
						'+542fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
						'+30af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
						'+a042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
						'+442fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
						'+10af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
						'+z042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
						'+x42fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
						'+c0af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
						'+v042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
						'+b42fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
						'+80af643265a718844f3dac56ce17ae1d7d47d0a24a35a277a0a6cb0baaa1939f',
						'+n042ad3f1a5b042ddc5aa80c4267b5bfd3b4dda3a682da0a3ef7269409347adb',
						'+042fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
						'+k42fdc008964eacc580089271353268d655ab5ec2829687aadc278653fad33cf',
					],
				},
			};
			const transaction = new MultisignatureTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).toHaveLength(6);
		});
	});

	describe('#processMultisignatures', () => {
		it('should return status ok if all signatures are present', async () => {
			const transaction = new MultisignatureTransaction({
				...validTestTransaction.toJSON(),
				networkIdentifier,
			});

			const { status, errors } = await transaction.processMultisignatures(
				store,
			);

			expect(status).toBe(Status.OK);
			expect(errors).toHaveLength(0);
		});

		it('should return error with pending status when signatures does not include all keysgroup', async () => {
			// storeAccountGetStub.mockReturnValue(nonMultisignatureSender);
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				signatures: validMultisignatureRegistrationTransaction.signatures.slice(
					1,
				),
			};
			const transaction = new MultisignatureTransaction({
				...invalidTransaction,
				networkIdentifier,
			});

			const { status, errors } = await transaction.processMultisignatures(
				store,
			);
			expect(status).toBe(Status.PENDING);
			expect(errors).toHaveLength(1);
			expect(errors[0].dataPath).toBe('.signatures');
		});

		it('should return error with pending status when transaction signatures missing', async () => {
			// storeAccountGetStub.mockReturnValue(nonMultisignatureSender);
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				signatures: [],
			};
			const transaction = new MultisignatureTransaction({
				...invalidTransaction,
				networkIdentifier,
			});

			const { status, errors } = await transaction.processMultisignatures(
				store,
			);
			expect(status).toBe(Status.PENDING);
			expect(errors).toHaveLength(1);
			expect(errors[0].dataPath).toBe('.signatures');
		});

		it('should return error with fail status when transaction signatures are duplicated', async () => {
			// storeAccountGetStub.mockReturnValue(nonMultisignatureSender);
			const invalidTransaction = {
				...validMultisignatureRegistrationTransaction,
				signatures: [
					...validMultisignatureRegistrationTransaction.signatures,
					...validMultisignatureRegistrationTransaction.signatures.slice(0, 1),
				],
			};
			const transaction = new MultisignatureTransaction({
				...invalidTransaction,
				networkIdentifier,
			});

			const { status, errors } = await transaction.processMultisignatures(
				store,
			);
			expect(status).toBe(Status.FAIL);
			expect(errors).toHaveLength(1);
			expect(errors[0].dataPath).toBe('.signatures');
		});
	});

	describe('#applyAsset', () => {
		it('should call state store', async () => {
			await (validTestTransaction as any).applyAsset(store);
			expect(store.account.get).toHaveBeenCalledWith(
				validTestTransaction.senderId,
			);
			expect(store.account.set).toHaveBeenCalledWith(
				multisignatureSender.address,
				multisignatureSender,
			);
		});

		it.skip('should return no errors', async () => {
			const errors = await (validTestTransaction as any).applyAsset(store);

			expect(errors).toHaveLength(0);
		});

		it('should return error when account is already multisignature', async () => {
			// storeAccountGetStub.mockReturnValue(multisignatureSender);
			const errors = await (validTestTransaction as any).applyAsset(store);
			expect(errors).toHaveLength(1);
			expect(errors[0].dataPath).toBe('.signatures');
		});

		it('should return error when keysgroup includes sender key', async () => {
			const invalidSender = {
				...defaultAccount,
				address: '',
				...multisignatureSender,
				membersPublicKeys: [
					...(multisignatureSender as any).membersPublicKeys,
					multisignatureSender.publicKey,
				],
			};
			// storeAccountGetStub.mockReturnValue(invalidSender);
			store = new StateStoreMock([invalidSender]);

			const errors = await (validTestTransaction as any).applyAsset(store);
			expect(errors).toHaveLength(1);
			expect(errors[0].dataPath).toBe('.signatures');
		});
	});

	describe('#undoAsset', () => {
		it.skip('should call state store', async () => {
			await (validTestTransaction as any).undoAsset(store);

			expect(store.account.get).toHaveBeenCalledWith(
				validTestTransaction.senderId,
			);

			expect(store.account.set).toHaveBeenCalledWith(
				multisignatureSender.address,
				{
					...nonMultisignatureAccount,
					membersPublicKeys: [],
					multiLifetime: 0,
					multiMin: 0,
				},
			);
		});

		it('should return no errors', async () => {
			const errors = await (validTestTransaction as any).undoAsset(store);
			expect(errors).toHaveLength(0);
		});
	});

	describe.skip('#addMultisignature', () => {
		let membersSignatures: Array<SignatureObject>;
		let multisigTrs: MultisignatureTransaction;

		beforeEach(() => {
			multisigTrs = new MultisignatureTransaction({
				...validMultisignatureRegistrationTransactionNoSigs,
				networkIdentifier,
			});

			membersSignatures = [
				{
					transactionId: '13937567402168253247',
					publicKey:
						'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
					signature:
						'fd1bc70422631e936019eaa7be4f8bc886dacd6711992c62354bc27eb161648f1d454dc12d2c6c607d6d3c7f4290e8de575f4fabf46a3ea2c62c8a135b4f2304',
				},
				{
					transactionId: '13937567402168253247',
					publicKey:
						'6766ce280eb99e45d2cc7d9c8c852720940dab5d69f480e80477a97b4255d5d8',
					signature:
						'66f3ea07fca295241fa49b01ada88baf9c8f394363e1d0230d5adacfe75692fcc2e6f698f934e9509e44e88701e9faf7203f826064ab33f57683d3137de3310e',
				},
				{
					transactionId: '13937567402168253247',
					publicKey:
						'1387d8ec6306807ffd6fe27ea3443985765c1157928bb09904307956f46a9972',
					signature:
						'3b9dbe7ad5ef2cd2dc915e7230456e9d40520492eec32f46a874cad1497d9e10c42859cbd95f6e671abd708a977c6c9ecdfe326a1e24eeaa56fb28801d0de70e',
				},
			];
		});

		it('should add signature to transaction', async () => {
			const { status } = await multisigTrs.addMultisignature(
				store,
				membersSignatures[0],
			);

			expect(status).toEqual(Status.PENDING);
			expect(multisigTrs.signatures).toEqual(
				expect.arrayContaining([membersSignatures[0].signature]),
			);
		});

		it('should fail when valid signature already present and sent again', async () => {
			const { status: arrangeStatus } = await multisigTrs.addMultisignature(
				store,
				membersSignatures[0],
			);

			const { status, errors } = await multisigTrs.addMultisignature(
				store,
				membersSignatures[0],
			);
			const expectedError = 'Encountered duplicate signature in transaction';

			expect(arrangeStatus).toEqual(Status.PENDING);
			expect(status).toEqual(Status.FAIL);
			expect(errors[0].message).toEqual(expectedError);
			expect(multisigTrs.signatures).toEqual(
				expect.arrayContaining([membersSignatures[0].signature]),
			);
		});

		it('should fail to add invalid signature to transaction', async () => {
			const { status, errors } = await multisigTrs.addMultisignature(store, {
				transactionId: multisigTrs.id,
				publicKey:
					'bb7ef62be03d5c195a132efe82796420abae04638cd3f6321532a5d33031b30c',
				signature:
					'eeee799c2d30d2be6e7b70aa29b57f9b1d6f2801d3fccf5c99623ffe45526104b1f0652c2cb586c7ae201d2557d8041b41b60154f079180bb9b85f8d06b3010c',
			});

			const expectedError =
				"Public Key 'bb7ef62be03d5c195a132efe82796420abae04638cd3f6321532a5d33031b30c' is not a member.";
			expect(status).toEqual(Status.FAIL);
			expect(errors[0].message).toEqual(expectedError);
			expect(multisigTrs.signatures).toHaveLength(0);
		});

		it('should fail with valid signature not part of the group', async () => {
			const nonMemberSignature: SignatureObject = {
				transactionId: multisigTrs.id,
				publicKey:
					'cba7d88c54f3844bbab2c64b712e0ba3144921fe7a76c5f9df80b28ab702a35b',
				signature:
					'35d9bca853353906fbc44b86918b64bc0d21daf3ca16e230aa59352976624bc4ce69ac339f08b45c5e926d60cfa81276778e5858ff2bd2290e40d9da59cc5f0b',
			};

			const expectedError =
				"Public Key 'cba7d88c54f3844bbab2c64b712e0ba3144921fe7a76c5f9df80b28ab702a35b' is not a member.";

			const { status, errors } = await multisigTrs.addMultisignature(
				store,
				nonMemberSignature,
			);

			expect(status).toEqual(Status.FAIL);
			expect(errors[0].message).toEqual(expectedError);
			expect(multisigTrs.signatures).toHaveLength(0);
		});

		it('status should remain pending when invalid signature sent', async () => {
			const { status: arrangeStatus } = await multisigTrs.addMultisignature(
				store,
				membersSignatures[0],
			);

			const nonMemberSignature: SignatureObject = {
				transactionId: multisigTrs.id,
				publicKey:
					'cba7d88c54f3844bbab2c64b712e0ba3144921fe7a76c5f9df80b28ab702a35b',
				signature:
					'35d9bca853353906fbc44b86918b64bc0d21daf3ca16e230aa59352976624bc4ce69ac339f08b45c5e926d60cfa81276778e5858ff2bd2290e40d9da59cc5f0b',
			};

			multisigTrs.addMultisignature(store, nonMemberSignature);

			expect(arrangeStatus).toEqual(Status.PENDING);
			expect((multisigTrs as any)._multisignatureStatus).toEqual(
				Status.PENDING,
			);
			expect(multisigTrs.signatures.length).toEqual(1);
		});
	});
});
