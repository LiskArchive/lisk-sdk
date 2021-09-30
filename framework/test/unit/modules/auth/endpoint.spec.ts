import { NotFoundError, TAG_TRANSACTION, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import {
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPublicKey,
	getRandomBytes,
	signDataWithPassphrase,
} from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';
import { AuthModule } from '../../../../src/modules/auth';
import { AuthEndpoint } from '../../../../src/modules/auth/endpoint';
import { InvalidNonceError } from '../../../../src/modules/auth/errors';
import {
	authAccountSchema,
	registerMultisignatureParamsSchema,
} from '../../../../src/modules/auth/schemas';
import { createTransientModuleEndpointContext } from '../../../../src/testing';

describe('AuthEndpoint', () => {
	const subStoreMock = jest.fn();
	const storeMock = jest.fn().mockReturnValue({ getWithSchema: subStoreMock });
	const stateStore: any = {
		getStore: storeMock,
	};
	const networkIdentifier = Buffer.from(
		'ce6b20ee7f7797e102f68d15099e7d5b0e8d4c50f98a7865ea168717539ec3aa',
		'hex',
	);

	interface Accounts {
		[key: string]: {
			passphrase: string;
			publicKey?: Buffer;
			address?: Buffer;
		};
	}

	const accounts: Accounts = {
		targetAccount: {
			passphrase: 'inherit moon normal relief spring bargain hobby join baby flash fog blood',
		},
		mandatoryOne: {
			passphrase: 'trim elegant oven term access apple obtain error grain excite lawn neck',
		},
		mandatoryTwo: {
			passphrase: 'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
		},
		optionalOne: {
			passphrase:
				'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
		},
		optionalTwo: {
			passphrase: 'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
		},
	};

	for (const account of Object.values(accounts)) {
		const { address, publicKey } = getAddressAndPublicKeyFromPassphrase(account.passphrase);
		account.address = address;
		account.publicKey = publicKey;
	}

	// Existing is an abbr. for existing account
	const existingSenderPublicKey = accounts.targetAccount.publicKey as Buffer;
	const nonExistingSenderPublicKey = getRandomBytes(32);

	const existingAddress = accounts.targetAccount.address as Buffer;
	const nonExistingAddress = getAddressFromPublicKey(nonExistingSenderPublicKey);

	const existingPassphrase = accounts.targetAccount.passphrase;

	let authModule: AuthModule;
	let authEndpoint: AuthEndpoint;
	beforeEach(() => {
		authModule = new AuthModule();
		authEndpoint = authModule.endpoint;
	});

	describe('getAuthAccount', () => {
		it('should get an auth account successfuly', async () => {
			// Arrange
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: existingAddress.toString('hex'),
				},
			});

			const expectedAuthAccount = {
				mandatoryKeys: [getRandomBytes(64)],
				optionalKeys: [getRandomBytes(64)],
				nonce: BigInt(2),
				numberOfSignatures: 1,
			};

			when(subStoreMock)
				.calledWith(existingAddress, authAccountSchema)
				.mockReturnValue({ ...expectedAuthAccount });

			const authAccount = await authEndpoint.getAuthAccount(context);
			const expectedMandatoryKeys = expectedAuthAccount.mandatoryKeys.map(key =>
				key.toString('hex'),
			);
			const expectedOptionalKeys = expectedAuthAccount.optionalKeys.map(key => key.toString('hex'));

			// Assert
			expect(authAccount).toHaveProperty('nonce', expectedAuthAccount.nonce.toString());
			expect(authAccount).toHaveProperty(
				'numberOfSignatures',
				expectedAuthAccount.numberOfSignatures,
			);
			expect(authAccount).toHaveProperty('mandatoryKeys', expectedMandatoryKeys);
			expect(authAccount).toHaveProperty('optionalKeys', expectedOptionalKeys);
		});

		it('should get a zero-value for non-existent auth account', async () => {
			// Arrange
			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					address: nonExistingAddress.toString('hex'),
				},
			});

			const expectedAuthAccount = {
				mandatoryKeys: [],
				optionalKeys: [],
				nonce: BigInt(0),
				numberOfSignatures: 0,
			};

			when(subStoreMock)
				.calledWith(nonExistingAddress, authAccountSchema)
				.mockRejectedValue(new NotFoundError(Buffer.alloc(0)));

			const authAccount = await authEndpoint.getAuthAccount(context);

			// Assert
			expect(authAccount).toHaveProperty('nonce', expectedAuthAccount.nonce.toString());
			expect(authAccount).toHaveProperty(
				'numberOfSignatures',
				expectedAuthAccount.numberOfSignatures,
			);
			expect(authAccount).toHaveProperty('mandatoryKeys', expectedAuthAccount.mandatoryKeys);
			expect(authAccount).toHaveProperty('optionalKeys', expectedAuthAccount.optionalKeys);
		});
	});

	describe('verifyTransaction', () => {
		it('should verify the transaction with single signature', async () => {
			// Arrange
			const transaction = new Transaction({
				moduleID: 2,
				commandID: 0,
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: getRandomBytes(100),
				signatures: [],
			});

			const signature = signDataWithPassphrase(
				TAG_TRANSACTION,
				networkIdentifier,
				transaction.getBytes(),
				existingPassphrase,
			);

			(transaction.signatures as any).push(signature);

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					transaction: transactionAsString,
				},
				networkIdentifier,
			});

			when(subStoreMock)
				.calledWith(existingAddress, authAccountSchema)
				.mockReturnValue({
					mandatoryKeys: [],
					optionalKeys: [],
					nonce: BigInt(0),
					numberOfSignatures: 0,
				});

			// Assert
			const receivedSignatureVerificationResult = (await authEndpoint.verifySignatures(context))
				.verified;
			expect(receivedSignatureVerificationResult).toBeTrue();
		});

		it('should verify the transaction with multi-signature', async () => {
			// Arrange
			const transaction = new Transaction({
				moduleID: 2,
				commandID: 0,
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: getRandomBytes(100),
				signatures: [],
			});

			(transaction.signatures as any).push(
				signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.mandatoryOne.passphrase,
				),
			);

			(transaction.signatures as any).push(
				signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.mandatoryTwo.passphrase,
				),
			);

			(transaction.signatures as any).push(
				signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.optionalOne.passphrase,
				),
			);

			(transaction.signatures as any).push(Buffer.from(''));

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					transaction: transactionAsString,
				},
				networkIdentifier,
			});

			when(subStoreMock)
				.calledWith(existingAddress, authAccountSchema)
				.mockReturnValue({
					mandatoryKeys: [accounts.mandatoryOne.publicKey, accounts.mandatoryTwo.publicKey],
					optionalKeys: [accounts.optionalOne.publicKey, accounts.optionalTwo.publicKey],
					nonce: BigInt(0),
					numberOfSignatures: 3,
				});

			// Assert
			const receivedSignatureVerificationResult = (await authEndpoint.verifySignatures(context))
				.verified;
			expect(receivedSignatureVerificationResult).toBeTrue();
		});

		it('should verify the transaction of register multisignature group', async () => {
			const transactionParams = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 3,
				mandatoryKeys: [accounts.mandatoryOne.publicKey, accounts.mandatoryTwo.publicKey],
				optionalKeys: [accounts.optionalOne.publicKey, accounts.optionalTwo.publicKey],
			});

			const transaction = new Transaction({
				moduleID: 12,
				commandID: 0,
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: transactionParams,
				signatures: [],
			});

			(transaction.signatures as any).push(
				signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					existingPassphrase,
				),
			);

			(transaction.signatures as any).push(
				signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.mandatoryOne.passphrase,
				),
			);

			(transaction.signatures as any).push(
				signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.mandatoryTwo.passphrase,
				),
			);

			(transaction.signatures as any).push(
				signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.optionalOne.passphrase,
				),
			);

			(transaction.signatures as any).push(
				signDataWithPassphrase(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.optionalTwo.passphrase,
				),
			);

			when(subStoreMock)
				.calledWith(existingAddress, authAccountSchema)
				.mockReturnValue({
					mandatoryKeys: [accounts.mandatoryOne.publicKey, accounts.mandatoryTwo.publicKey],
					optionalKeys: [accounts.optionalOne.publicKey, accounts.optionalTwo.publicKey],
					nonce: BigInt(0),
					numberOfSignatures: 3,
				});

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					transaction: transactionAsString,
				},
				networkIdentifier,
			});

			// Assert
			const receivedSignatureVerificationResult = (await authEndpoint.verifySignatures(context))
				.verified;
			expect(receivedSignatureVerificationResult).toBeTrue();
		});
	});

	describe('verifyNonce', () => {
		it('should verify equal transaction nonce and account nonce', async () => {
			// Arrange
			const transaction = new Transaction({
				moduleID: 2,
				commandID: 0,
				nonce: BigInt('2'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: getRandomBytes(100),
				signatures: [getRandomBytes(64)],
			});

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					transaction: transactionAsString,
				},
			});

			when(subStoreMock)
				.calledWith(existingAddress, authAccountSchema)
				.mockReturnValue({
					mandatoryKeys: [],
					optionalKeys: [],
					nonce: BigInt(2),
					numberOfSignatures: 0,
				});

			// Assert
			const receivedNonceVerificationResult = (await authEndpoint.verifyNonce(context)).verified;
			expect(receivedNonceVerificationResult).toBeTrue();
		});

		it('should fail to verify greater transaction nonce than account nonce', async () => {
			// Arrange
			const transaction = new Transaction({
				moduleID: 2,
				commandID: 0,
				nonce: BigInt('3'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: getRandomBytes(100),
				signatures: [getRandomBytes(64)],
			});

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					transaction: transactionAsString,
				},
			});

			when(subStoreMock)
				.calledWith(existingAddress, authAccountSchema)
				.mockReturnValue({
					mandatoryKeys: [],
					optionalKeys: [],
					nonce: BigInt(2),
					numberOfSignatures: 0,
				});

			// Assert
			const receivedNonceVerificationResult = (await authEndpoint.verifyNonce(context)).verified;
			expect(receivedNonceVerificationResult).toBeFalse();
		});

		it('should fail to verify lower transaction nonce than account nonce', async () => {
			// Arrange
			const accountNonce = BigInt(2);

			const transaction = new Transaction({
				moduleID: 2,
				commandID: 0,
				nonce: BigInt('1'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: getRandomBytes(100),
				signatures: [getRandomBytes(64)],
			});

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				stateStore,
				params: {
					transaction: transactionAsString,
				},
			});

			when(subStoreMock).calledWith(existingAddress, authAccountSchema).mockReturnValue({
				mandatoryKeys: [],
				optionalKeys: [],
				nonce: accountNonce,
				numberOfSignatures: 0,
			});

			// Assert
			return expect(authEndpoint.verifyNonce(context)).rejects.toThrow(
				new InvalidNonceError(
					`Transaction with id:${transaction.id.toString('hex')} nonce is lower than account nonce`,
					transaction.nonce,
					accountNonce,
				),
			);
		});
	});
});
