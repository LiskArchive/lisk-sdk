import {
	VerifyStatus,
	RegisterSidechainCommand,
	MainchainInteroperabilityModule,
	TokenMethod,
} from '../../../../src';
import { MAX_UINT64 } from '../../../../src/modules/interoperability/constants';
import { RegistrationParametersValidator } from '../../../../src/modules/interoperability/types';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce#try_it
// It is defined here to avoid calling it each time from `beforeEach` for irrelevant tests
const getTotalBftWeight = (chainValidators: RegistrationParametersValidator[]) => {
	const initialValue = BigInt(0);
	return chainValidators
		.map(v => v.bftWeight)
		.reduce((accumulator, currentValue) => accumulator + currentValue, initialValue);
};

describe('verifyValidators', () => {
	let registerSidechainCommandPrototype: any;
	const interopMod = new MainchainInteroperabilityModule();
	let sidechainRegistrationCommand: RegisterSidechainCommand;
	const tokenMethod: TokenMethod = new TokenMethod(
		interopMod.stores,
		interopMod.events,
		interopMod.name,
	);

	let sidechainCertificateThreshold = BigInt(10);
	const defaultSidechainValidators = [
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
	];

	beforeEach(() => {
		sidechainRegistrationCommand = new RegisterSidechainCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
			interopMod['internalMethod'],
		);

		// Set up dependencies
		sidechainRegistrationCommand.addDependencies({ payFee: jest.fn() }, tokenMethod);
		registerSidechainCommandPrototype = Object.getPrototypeOf(sidechainRegistrationCommand);
	});

	it('should return error if have duplicate bls keys', async () => {
		const sidechainValidators = [
			{
				...defaultSidechainValidators[0],
				blsKey: Buffer.from(
					'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
					'hex',
				),
			},
			{
				...defaultSidechainValidators[1],
				blsKey: Buffer.from(
					'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
					'hex',
				),
			},
		];

		const result = await registerSidechainCommandPrototype.verifyValidators(
			sidechainValidators,
			sidechainCertificateThreshold,
		);

		expect(result.status).toBe(VerifyStatus.FAIL);
		expect(result.error?.message).toInclude('Duplicate BLS keys.');
	});

	it('should return error if bls keys are not sorted lexicographically', async () => {
		const sidechainValidators = [
			{
				...defaultSidechainValidators[0],
				blsKey: Buffer.from(
					'4c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
					'hex',
				),
			},
			{
				...defaultSidechainValidators[1],
				blsKey: Buffer.from(
					'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
					'hex',
				),
			},
		];

		const result = await registerSidechainCommandPrototype.verifyValidators(
			sidechainValidators,
			sidechainCertificateThreshold,
		);

		expect(result.status).toBe(VerifyStatus.FAIL);
		expect(result.error?.message).toInclude('Validator keys should be sorted lexicographically.');
	});

	it('should return error if some bft weight is not a positive integer', async () => {
		const sidechainValidators = [
			{
				...defaultSidechainValidators[0],
				bftWeight: BigInt(0),
			},
			{
				...defaultSidechainValidators[1],
				bftWeight: BigInt(1),
			},
		];

		const result = await registerSidechainCommandPrototype.verifyValidators(
			sidechainValidators,
			sidechainCertificateThreshold,
		);

		expect(result.status).toBe(VerifyStatus.FAIL);
		expect(result.error?.message).toInclude('Validator bft weight must be a positive integer.');
	});

	it(`should return error if totalBftWeight exceeds ${MAX_UINT64}`, async () => {
		const sidechainValidators = [
			{
				...defaultSidechainValidators[0],
				bftWeight: MAX_UINT64,
			},
			{
				...defaultSidechainValidators[1],
				bftWeight: BigInt(10),
			},
		];

		const result = await registerSidechainCommandPrototype.verifyValidators(
			sidechainValidators,
			sidechainCertificateThreshold,
		);

		expect(result.status).toBe(VerifyStatus.FAIL);
		expect(result.error?.message).toInclude(
			`Total BFT weight has to be less than or equal to ${MAX_UINT64}.`,
		);
	});

	it('should return error if certificate threshold is too small', async () => {
		sidechainCertificateThreshold = BigInt(1);
		const result = await registerSidechainCommandPrototype.verifyValidators(
			defaultSidechainValidators,
			sidechainCertificateThreshold,
		);

		expect(result.status).toBe(VerifyStatus.FAIL);

		const minCertificateThreshold =
			getTotalBftWeight(defaultSidechainValidators) / BigInt(3) + BigInt(1);
		expect(result.error?.message).toInclude(
			`Certificate threshold is too small. Minimum value: ${minCertificateThreshold}.`,
		);
	});

	it('should return error if certificate threshold is too large', async () => {
		sidechainCertificateThreshold = BigInt(1000);
		const result = await registerSidechainCommandPrototype.verifyValidators(
			defaultSidechainValidators,
			sidechainCertificateThreshold,
		);

		expect(result.status).toBe(VerifyStatus.FAIL);

		const totalBftWeight = getTotalBftWeight(defaultSidechainValidators);
		expect(result.error?.message).toInclude(
			`Certificate threshold is too large. Maximum value: ${totalBftWeight}.`,
		);
	});
});
