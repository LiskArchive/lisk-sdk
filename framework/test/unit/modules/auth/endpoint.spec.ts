import { NotFoundError, TAG_TRANSACTION, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { ed, address as cryptoAddress, utils, legacy, address } from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';
import { AuthModule } from '../../../../src/modules/auth';
import { COMMAND_NAME_REGISTER_MULTISIGNATURE_GROUP } from '../../../../src/modules/auth/constants';
import { AuthEndpoint } from '../../../../src/modules/auth/endpoint';
import { InvalidNonceError } from '../../../../src/modules/auth/errors';
import { registerMultisignatureParamsSchema } from '../../../../src/modules/auth/schemas';
import { AuthAccountStore } from '../../../../src/modules/auth/stores/auth_account';
import { createTransientModuleEndpointContext } from '../../../../src/testing';

describe('AuthEndpoint', () => {
	const networkIdentifier = Buffer.from(
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
		it('should get an auth account successfuly', async () => {
			// Arrange
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
				module: 'token',
				command: 'transfer',
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [],
			});

			const signature = ed.signDataWithPrivateKey(
				TAG_TRANSACTION,
				networkIdentifier,
				transaction.getBytes(),
				existingPrivateKey,
			);

			(transaction.signatures as any).push(signature);

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transactionAsString,
				},
				networkIdentifier,
			});

			when(authAccountStore.get as jest.Mock)
				.calledWith(expect.anything(), existingAddress)
				.mockReturnValue({
					mandatoryKeys: [],
					optionalKeys: [],
					nonce: BigInt(0),
					numberOfSignatures: 0,
				});

			// Assert
			const receivedSignatureVerificationResult = (await authEndpoint.isValidSignature(context))
				.verified;
			expect(receivedSignatureVerificationResult).toBeTrue();
		});

		it('should verify the transaction with multi-signature', async () => {
			// Arrange
			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [],
			});

			(transaction.signatures as any).push(
				ed.signDataWithPrivateKey(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.mandatoryOne.privateKey as Buffer,
				),
			);

			(transaction.signatures as any).push(
				ed.signDataWithPrivateKey(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.mandatoryTwo.privateKey as Buffer,
				),
			);

			(transaction.signatures as any).push(
				ed.signDataWithPrivateKey(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.optionalOne.privateKey as Buffer,
				),
			);

			(transaction.signatures as any).push(Buffer.from(''));

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transactionAsString,
				},
				networkIdentifier,
			});

			when(authAccountStore.get as jest.Mock)
				.calledWith(expect.anything(), existingAddress)
				.mockReturnValue({
					mandatoryKeys: [accounts.mandatoryOne.publicKey, accounts.mandatoryTwo.publicKey],
					optionalKeys: [accounts.optionalOne.publicKey, accounts.optionalTwo.publicKey],
					nonce: BigInt(0),
					numberOfSignatures: 3,
				});

			// Assert
			const receivedSignatureVerificationResult = (await authEndpoint.isValidSignature(context))
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
				module: 'auth',
				command: COMMAND_NAME_REGISTER_MULTISIGNATURE_GROUP,
				nonce: BigInt('0'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: transactionParams,
				signatures: [],
			});

			(transaction.signatures as any).push(
				ed.signDataWithPrivateKey(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					existingPrivateKey,
				),
			);

			(transaction.signatures as any).push(
				ed.signDataWithPrivateKey(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.mandatoryOne.privateKey as Buffer,
				),
			);

			(transaction.signatures as any).push(
				ed.signDataWithPrivateKey(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.mandatoryTwo.privateKey as Buffer,
				),
			);

			(transaction.signatures as any).push(
				ed.signDataWithPrivateKey(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.optionalOne.privateKey as Buffer,
				),
			);

			(transaction.signatures as any).push(
				ed.signDataWithPrivateKey(
					TAG_TRANSACTION,
					networkIdentifier,
					transaction.getSigningBytes(),
					accounts.optionalTwo.privateKey as Buffer,
				),
			);

			when(authAccountStore.get as jest.Mock)
				.calledWith(expect.anything(), existingAddress)
				.mockReturnValue({
					mandatoryKeys: [accounts.mandatoryOne.publicKey, accounts.mandatoryTwo.publicKey],
					optionalKeys: [accounts.optionalOne.publicKey, accounts.optionalTwo.publicKey],
					nonce: BigInt(0),
					numberOfSignatures: 3,
				});

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transactionAsString,
				},
				networkIdentifier,
			});

			// Assert
			const receivedSignatureVerificationResult = (await authEndpoint.isValidSignature(context))
				.verified;
			expect(receivedSignatureVerificationResult).toBeTrue();
		});
	});

	describe('isValidNonce', () => {
		it('should verify equal transaction nonce and account nonce', async () => {
			// Arrange
			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt('2'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [utils.getRandomBytes(64)],
			});

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transactionAsString,
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

			// Assert
			const receivedNonceVerificationResult = (await authEndpoint.isValidNonce(context)).verified;
			expect(receivedNonceVerificationResult).toBeTrue();
		});

		it('should fail to verify greater transaction nonce than account nonce', async () => {
			// Arrange
			const accountNonce = BigInt(2);

			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt('3'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [utils.getRandomBytes(64)],
			});

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transactionAsString,
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

			// Assert
			return expect(authEndpoint.isValidNonce(context)).rejects.toThrow(
				new InvalidNonceError(
					`Transaction with id:${transaction.id.toString(
						'hex',
					)} nonce is not equal to account nonce.`,
					transaction.nonce,
					accountNonce,
				),
			);
		});

		it('should fail to verify lower transaction nonce than account nonce', async () => {
			// Arrange
			const accountNonce = BigInt(2);

			const transaction = new Transaction({
				module: 'token',
				command: 'transfer',
				nonce: BigInt('1'),
				fee: BigInt('100000000'),
				senderPublicKey: existingSenderPublicKey,
				params: utils.getRandomBytes(100),
				signatures: [utils.getRandomBytes(64)],
			});

			const transactionAsString = transaction.getBytes().toString('hex');

			const context = createTransientModuleEndpointContext({
				params: {
					transaction: transactionAsString,
				},
			});

			when(authAccountStore.get as jest.Mock)
				.calledWith(expect.anything(), existingAddress)
				.mockReturnValue({
					mandatoryKeys: [],
					optionalKeys: [],
					nonce: accountNonce,
					numberOfSignatures: 0,
				});

			// Assert
			return expect(authEndpoint.isValidNonce(context)).rejects.toThrow(
				new InvalidNonceError(
					`Transaction with id:${transaction.id.toString(
						'hex',
					)} nonce is not equal to account nonce.`,
					transaction.nonce,
					accountNonce,
				),
			);
		});
	});
});
