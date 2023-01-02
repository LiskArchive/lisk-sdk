import { NotFoundError, TAG_TRANSACTION, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { ed, address as cryptoAddress, utils, legacy, address } from '@liskhq/lisk-cryptography';
import { LiskValidationError } from '@liskhq/lisk-validator';
import { when } from 'jest-when';
import { AuthModule } from '../../../../src/modules/auth';
import {
	COMMAND_NAME_REGISTER_MULTISIGNATURE_GROUP,
	MESSAGE_TAG_MULTISIG_REG,
} from '../../../../src/modules/auth/constants';
import { AuthEndpoint } from '../../../../src/modules/auth/endpoint';
import {
	multisigRegMsgSchema,
	registerMultisignatureParamsSchema,
} from '../../../../src/modules/auth/schemas';
import { AuthAccountStore } from '../../../../src/modules/auth/stores/auth_account';
import { createTransientModuleEndpointContext } from '../../../../src/testing';

describe('AuthEndpoint', () => {
	const chainID = Buffer.from(
		'ce6b20ee7f7797e102f68d15099e7d5b0e8d4c50f98a7865ea168717539ec3aa',
		'hex',
	);

	interface Accounts {
		[key: string]: {
			passphrase: string;
			publicKey?: Buffer;
			privateKey?: Buffer;
			address?: Buffer;
		};
	}

	const accounts: Accounts = {
		targetAccount: {
			passphrase: 'inherit moon normal relief spring bargain hobby join baby flash fog blood',
		},
		mandatory1: {
			passphrase: 'trim elegant oven term access apple obtain error grain excite lawn neck',
		},
		mandatory2: {
			passphrase: 'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
		},
		optional1: {
			passphrase:
				'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
		},
		optional2: {
			passphrase: 'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
		},
	};

	for (const account of Object.values(accounts)) {
		const { publicKey, privateKey } = legacy.getPrivateAndPublicKeyFromPassphrase(
			account.passphrase,
		);
		account.address = cryptoAddress.getAddressFromPublicKey(publicKey);
		account.publicKey = publicKey;
		account.privateKey = privateKey;
	}

	// Existing is an abbr. for existing account
	const existingSenderPublicKey = accounts.targetAccount.publicKey as Buffer;
	const nonExistingSenderPublicKey = utils.getRandomBytes(32);

	const existingAddress = accounts.targetAccount.address as Buffer;
	const nonExistingAddress = cryptoAddress.getAddressFromPublicKey(nonExistingSenderPublicKey);

	const existingPrivateKey = legacy.getPrivateAndPublicKeyFromPassphrase(
		accounts.targetAccount.passphrase,
	).privateKey;

	let authEndpoint: AuthEndpoint;
	let authAccountStore: AuthAccountStore;

	beforeEach(() => {
		const authModule = new AuthModule();
		authAccountStore = authModule.stores.get(AuthAccountStore);
		authEndpoint = authModule.endpoint;

		jest.spyOn(authAccountStore, 'get').mockRejectedValue(new NotFoundError());
	});

	describe('getAuthAccount', () => {
		it('should get an auth account successfully', async () => {
			const context = createTransientModuleEndpointContext({
				params: {
					address: address.getLisk32AddressFromAddress(existingAddress),
				},
			});

			const expectedAuthAccount = {
				mandatoryKeys: [utils.getRandomBytes(64)],
				optionalKeys: [utils.getRandomBytes(64)],
				nonce: BigInt(2),
				numberOfSignatures: 1,
			};

			when(authAccountStore.get as jest.Mock)
				.calledWith(expect.anything(), existingAddress)
				.mockReturnValue({ ...expectedAuthAccount });

			const authAccount = await authEndpoint.getAuthAccount(context);
			const expectedMandatoryKeys = expectedAuthAccount.mandatoryKeys.map(key =>
				key.toString('hex'),
			);
			const expectedOptionalKeys = expectedAuthAccount.optionalKeys.map(key => key.toString('hex'));

			expect(authAccount).toHaveProperty('nonce', expectedAuthAccount.nonce.toString());
			expect(authAccount).toHaveProperty(
				'numberOfSignatures',
				expectedAuthAccount.numberOfSignatures,
			);
			expect(authAccount).toHaveProperty('mandatoryKeys', expectedMandatoryKeys);
			expect(authAccount).toHaveProperty('optionalKeys', expectedOptionalKeys);
		});

		it('should get a zero-value for non-existent auth account', async () => {
			const context = createTransientModuleEndpointContext({
				params: {
					address: address.getLisk32AddressFromAddress(nonExistingAddress),
				},
			});

			const expectedAuthAccount = {
				mandatoryKeys: [],
				optionalKeys: [],
				nonce: BigInt(0),
				numberOfSignatures: 0,
			};

			when(authAccountStore.get as jest.Mock)
				.calledWith(expect.anything(), nonExistingAddress)
				.mockRejectedValue(new NotFoundError());

			const authAccount = await authEndpoint.getAuthAccount(context);

			expect(authAccount).toHaveProperty('nonce', expectedAuthAccount.nonce.toString());
			expect(authAccount).toHaveProperty(
				'numberOfSignatures',
				expectedAuthAccount.numberOfSignatures,
			);
			expect(authAccount).toHaveProperty('mandatoryKeys', expectedAuthAccount.mandatoryKeys);
			expect(authAccount).toHaveProperty('optionalKeys', expectedAuthAccount.optionalKeys);
		});
	});

	describe('isValidSignature', () => {
		let transaction: Transaction;

		beforeEach(() => {
			transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [],
			});
		});

		describe('single-signature account', () => {
			it('should return true for a valid signature', async () => {
				const signature = ed.signDataWithPrivateKey(
					TAG_TRANSACTION,
					chainID,
					transaction.getBytes(),
					existingPrivateKey,
				);

				transaction.signatures.push(signature);

				const context = createTransientModuleEndpointContext({
					params: { transaction: transaction.getBytes().toString('hex') },
					chainID,
				});

				const receivedSignatureVerificationResult = (await authEndpoint.isValidSignature(context))
					.verified;

				expect(receivedSignatureVerificationResult).toBeTrue();
			});

			it('should return false for an invalid signature', async () => {
				transaction = new Transaction({
					module: 'token',
					command: 'transfer',
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					senderPublicKey: existingSenderPublicKey,
					params: utils.getRandomBytes(100),
					signatures: [utils.getRandomBytes(64)],
				});

				const context = createTransientModuleEndpointContext({
					params: { transaction: transaction.getBytes().toString('hex') },
					chainID,
				});

				const receivedSignatureVerificationResult = (await authEndpoint.isValidSignature(context))
					.verified;

				expect(receivedSignatureVerificationResult).toBeFalse();
			});
		});

		describe('multi-signature account', () => {
			it('should return true for 3-of-4 multisig account with 2 mandatory keys, when 2 mandatory and 1 optional signatures are present', async () => {
				transaction.signatures.push(
					ed.signDataWithPrivateKey(
						TAG_TRANSACTION,
						chainID,
						transaction.getSigningBytes(),
						accounts.mandatory1.privateKey as Buffer,
					),
				);

				transaction.signatures.push(
					ed.signDataWithPrivateKey(
						TAG_TRANSACTION,
						chainID,
						transaction.getSigningBytes(),
						accounts.mandatory2.privateKey as Buffer,
					),
				);

				transaction.signatures.push(
					ed.signDataWithPrivateKey(
						TAG_TRANSACTION,
						chainID,
						transaction.getSigningBytes(),
						accounts.optional1.privateKey as Buffer,
					),
				);

				transaction.signatures.push(Buffer.from(''));

				const context = createTransientModuleEndpointContext({
					params: {
						transaction: transaction.getBytes().toString('hex'),
					},
					chainID,
				});

				when(authAccountStore.get as jest.Mock)
					.calledWith(expect.anything(), existingAddress)
					.mockReturnValue({
						mandatoryKeys: [accounts.mandatory1.publicKey, accounts.mandatory2.publicKey],
						optionalKeys: [accounts.optional1.publicKey, accounts.optional2.publicKey],
						nonce: BigInt(0),
						numberOfSignatures: 3,
					});

				const receivedSignatureVerificationResult = (await authEndpoint.isValidSignature(context))
					.verified;

				expect(receivedSignatureVerificationResult).toBeTrue();
			});

			it('should return true for 2-of-2 multi-sig account with 2 mandatory keys, when 2 mandatory signatures are present', async () => {
				transaction.signatures.push(
					ed.signDataWithPrivateKey(
						TAG_TRANSACTION,
						chainID,
						transaction.getSigningBytes(),
						accounts.mandatory1.privateKey as Buffer,
					),
				);

				transaction.signatures.push(
					ed.signDataWithPrivateKey(
						TAG_TRANSACTION,
						chainID,
						transaction.getSigningBytes(),
						accounts.mandatory2.privateKey as Buffer,
					),
				);

				const context = createTransientModuleEndpointContext({
					params: {
						transaction: transaction.getBytes().toString('hex'),
					},
					chainID,
				});

				when(authAccountStore.get as jest.Mock)
					.calledWith(expect.anything(), existingAddress)
					.mockReturnValue({
						mandatoryKeys: [accounts.mandatory1.publicKey, accounts.mandatory2.publicKey],
						optionalKeys: [],
						nonce: BigInt(0),
						numberOfSignatures: 2,
					});

				const receivedSignatureVerificationResult = (await authEndpoint.isValidSignature(context))
					.verified;

				expect(receivedSignatureVerificationResult).toBeTrue();
			});

			it('should return true for 2-of-2 multisig account with 0 mandatory keys, when 2 optional signatures are present', async () => {
				transaction.signatures.push(
					ed.signDataWithPrivateKey(
						TAG_TRANSACTION,
						chainID,
						transaction.getSigningBytes(),
						accounts.optional1.privateKey as Buffer,
					),
				);

				transaction.signatures.push(
					ed.signDataWithPrivateKey(
						TAG_TRANSACTION,
						chainID,
						transaction.getSigningBytes(),
						accounts.optional2.privateKey as Buffer,
					),
				);

				const context = createTransientModuleEndpointContext({
					params: {
						transaction: transaction.getBytes().toString('hex'),
					},
					chainID,
				});

				when(authAccountStore.get as jest.Mock)
					.calledWith(expect.anything(), existingAddress)
					.mockReturnValue({
						mandatoryKeys: [],
						optionalKeys: [accounts.optional1.publicKey, accounts.optional2.publicKey],
						nonce: BigInt(0),
						numberOfSignatures: 2,
					});

				const receivedSignatureVerificationResult = (await authEndpoint.isValidSignature(context))
					.verified;

				expect(receivedSignatureVerificationResult).toBeTrue();
			});

			it('should return true for 2-of-4 multisig account with 0 mandatory keys, when 2 optional signatures are present', async () => {
				transaction.signatures.push(
					ed.signDataWithPrivateKey(
						TAG_TRANSACTION,
						chainID,
						transaction.getSigningBytes(),
						accounts.optional1.privateKey as Buffer,
					),
				);

				transaction.signatures.push(
					ed.signDataWithPrivateKey(
						TAG_TRANSACTION,
						chainID,
						transaction.getSigningBytes(),
						accounts.optional2.privateKey as Buffer,
					),
				);

				transaction.signatures.push(Buffer.from(''), Buffer.from(''));

				const context = createTransientModuleEndpointContext({
					params: {
						transaction: transaction.getBytes().toString('hex'),
					},
					chainID,
				});

				when(authAccountStore.get as jest.Mock)
					.calledWith(expect.anything(), existingAddress)
					.mockReturnValue({
						mandatoryKeys: [],
						optionalKeys: [
							accounts.optional1.publicKey,
							accounts.optional2.publicKey,
							utils.getRandomBytes(32),
							utils.getRandomBytes(32),
						],
						nonce: BigInt(0),
						numberOfSignatures: 2,
					});

				const receivedSignatureVerificationResult = (await authEndpoint.isValidSignature(context))
					.verified;

				expect(receivedSignatureVerificationResult).toBeTrue();
			});

			it('should return true for register multisignature group command with 4 valid signatures', async () => {
				const decodedTxParams = {
					numberOfSignatures: 3,
					mandatoryKeys: [accounts.mandatory1.publicKey, accounts.mandatory2.publicKey],
					optionalKeys: [accounts.optional1.publicKey, accounts.optional2.publicKey],
					signatures: [] as Buffer[],
				};
				const transactionParams = codec.encode(registerMultisignatureParamsSchema, decodedTxParams);

				const rawTx = {
					module: 'auth',
					command: COMMAND_NAME_REGISTER_MULTISIGNATURE_GROUP,
					nonce: BigInt('0'),
					fee: BigInt('100000000'),
					senderPublicKey: existingSenderPublicKey,
					params: transactionParams,
					signatures: [] as Buffer[],
				};

				const message = codec.encode(multisigRegMsgSchema, {
					address: existingAddress,
					nonce: rawTx.nonce,
					numberOfSignatures: decodedTxParams.numberOfSignatures,
					mandatoryKeys: decodedTxParams.mandatoryKeys,
					optionalKeys: decodedTxParams.optionalKeys,
				});

				decodedTxParams.signatures.push(
					ed.signDataWithPrivateKey(
						MESSAGE_TAG_MULTISIG_REG,
						chainID,
						message,
						accounts.mandatory1.privateKey as Buffer,
					),
				);

				decodedTxParams.signatures.push(
					ed.signDataWithPrivateKey(
						MESSAGE_TAG_MULTISIG_REG,
						chainID,
						message,
						accounts.mandatory2.privateKey as Buffer,
					),
				);

				decodedTxParams.signatures.push(
					ed.signDataWithPrivateKey(
						MESSAGE_TAG_MULTISIG_REG,
						chainID,
						message,
						accounts.optional1.privateKey as Buffer,
					),
				);

				decodedTxParams.signatures.push(
					ed.signDataWithPrivateKey(
						MESSAGE_TAG_MULTISIG_REG,
						chainID,
						message,
						accounts.optional2.privateKey as Buffer,
					),
				);

				const encodedTransactionParams = codec.encode(
					registerMultisignatureParamsSchema,
					decodedTxParams,
				);

				const signedTransaction = new Transaction({ ...rawTx, params: encodedTransactionParams });

				signedTransaction.signatures.push(
					ed.signDataWithPrivateKey(
						TAG_TRANSACTION,
						chainID,
						signedTransaction.getSigningBytes(),
						existingPrivateKey,
					),
				);

				const context = createTransientModuleEndpointContext({
					params: {
						transaction: signedTransaction.getBytes().toString('hex'),
					},
					chainID,
				});

				const receivedSignatureVerificationResult = (await authEndpoint.isValidSignature(context))
					.verified;

				expect(receivedSignatureVerificationResult).toBeTrue();
			});
		});
	});

	describe('isValidNonce', () => {
		it('should verify equal transaction nonce and account nonce', async () => {
			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt('2'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [utils.getRandomBytes(64)],
			});

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transaction.getBytes().toString('hex'),
				},
			});

			when(authAccountStore.get as jest.Mock)
				.calledWith(expect.anything(), existingAddress)
				.mockReturnValue({
					mandatoryKeys: [],
					optionalKeys: [],
					nonce: BigInt(2),
					numberOfSignatures: 0,
				});

			const receivedNonceVerificationResult = (await authEndpoint.isValidNonce(context)).verified;

			expect(receivedNonceVerificationResult).toBeTrue();
		});

		it('should fail to verify greater transaction nonce than account nonce', async () => {
			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt('3'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [utils.getRandomBytes(64)],
			});

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transaction.getBytes().toString('hex'),
				},
			});

			when(authAccountStore.get as jest.Mock)
				.calledWith(expect.anything(), existingAddress)
				.mockReturnValue({
					mandatoryKeys: [],
					optionalKeys: [],
					nonce: BigInt(2),
					numberOfSignatures: 0,
				});

			const isValidNonceResponse = (await authEndpoint.isValidNonce(context)).verified;

			expect(isValidNonceResponse).toBeFalse();
		});

		it('should fail to verify lower transaction nonce than account nonce', async () => {
			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt('1'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [utils.getRandomBytes(64)],
			});

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transaction.getBytes().toString('hex'),
				},
			});

			when(authAccountStore.get as jest.Mock)
				.calledWith(expect.anything(), existingAddress)
				.mockReturnValue({
					mandatoryKeys: [],
					optionalKeys: [],
					nonce: BigInt(2),
					numberOfSignatures: 0,
				});

			const isValidNonceResponse = (await authEndpoint.isValidNonce(context)).verified;

			expect(isValidNonceResponse).toBeFalse();
		});

		it('should return true when account does not exist in AuthAccountStore and transaction nonce is 0', async () => {
			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt(0),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [utils.getRandomBytes(64)],
			});

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transaction.getBytes().toString('hex'),
				},
			});

			const receivedNonceVerificationResult = (await authEndpoint.isValidNonce(context)).verified;

			expect(receivedNonceVerificationResult).toBeTrue();
		});

		it('should return false when account does not exist in AuthAccountStore and transaction nonce is greater than 0', async () => {
			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt(8),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [utils.getRandomBytes(64)],
			});

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transaction.getBytes().toString('hex'),
				},
			});

			const receivedNonceVerificationResult = (await authEndpoint.isValidNonce(context)).verified;

			expect(receivedNonceVerificationResult).toBeFalse();
		});
	});

	describe('getMultiSigRegMsgSchema', () => {
		it('should return multiSigRegMsgSchema from the endpoint', async () => {
			const context = createTransientModuleEndpointContext({});

			const result = await authEndpoint.getMultiSigRegMsgSchema(context);

			expect(result.schema).toEqual(multisigRegMsgSchema);
		});
	});

	describe('sortMultisignatureGroup', () => {
		it('should sort signatures when provided mandatory and optional keys', () => {
			const inputData = {
				mandatory: [
					{
						publicKey: '3333333333333333333333333333333333333333333333333333333333333333',
						signature:
							'22222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222',
					},
					{
						publicKey: '0000000000000000000000000000000000000000000000000000000000000000',
						signature:
							'11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111',
					},
					{
						publicKey: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
						signature:
							'00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
					},
				],
				optional: [
					{
						publicKey: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
						signature: '',
					},
					{
						publicKey: '2222222222222222222222222222222222222222222222222222222222222222',
						signature:
							'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
					},
				],
			};

			const context = createTransientModuleEndpointContext({ params: inputData });

			const sortedSignatures = authEndpoint.sortMultisignatureGroup(context);

			expect(sortedSignatures.signatures[0]).toEqual(inputData.mandatory[1].signature);
			expect(sortedSignatures.signatures[1]).toEqual(inputData.mandatory[0].signature);
			expect(sortedSignatures.signatures[2]).toEqual(inputData.mandatory[2].signature);
			expect(sortedSignatures.signatures[3]).toEqual(inputData.optional[1].signature);
			expect(sortedSignatures.signatures[4]).toEqual(inputData.optional[0].signature);
		});

		it('should throw a validation error when provided invalid request', () => {
			const inputData = {
				mandatory: [
					// left empty to trigger the error test case
				],
				optional: [
					{
						publicKey: 'invalid public key', // invalid public key to trigger the error test case
						signature: '',
					},
				],
			};

			const context = createTransientModuleEndpointContext({ params: inputData });

			expect(() => authEndpoint.sortMultisignatureGroup(context)).toThrow(LiskValidationError);
		});
	});
});
