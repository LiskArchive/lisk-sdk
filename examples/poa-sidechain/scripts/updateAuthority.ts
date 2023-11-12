import { writeFileSync, readFileSync } from 'fs-extra';
import { codec, cryptography, apiClient } from 'lisk-sdk';
import { NodeInfo } from './extern_types';
import { keys as validatorsKeys } from '../config/default/dev-validators.json';
import { MESSAGE_TAG_POA } from 'lisk-framework/dist-node/modules/poa/constants';
import { updateAuthorityWithoutSigSchema } from './schema';

(async () => {
	const { bls } = cryptography;

	const client = await apiClient.createIPCClient('~/.lisk/poa-sidechain');
	const nodeInfo = await client.invoke<NodeInfo>('system_getNodeInfo');
	// Get active validators from mainchain

	const paramsJSON = JSON.parse(readFileSync('./scripts/updateAuthority.json', 'utf-8'));
	const genesis = JSON.parse(readFileSync('./config/default/genesis_assets.json', 'utf-8'));

	const chainID = Buffer.from(nodeInfo.chainID, 'hex');

	const params = {
		newValidators: paramsJSON.newValidators.map(validator => ({
			address: cryptography.address.getAddressFromLisk32Address(validator.address),
			weight: validator.weight,
		})),
		threshold: paramsJSON.threshold,
		validatorsUpdateNonce: paramsJSON.validatorsUpdateNonce,
	};

	const message = codec.encode(updateAuthorityWithoutSigSchema, params);

	// console.log(message);

	const snapshotSubstore = genesis.assets.filter(module => module.module === 'poa')[0].data
		.snapshotSubstore;

	const activeValidatorsWithPrivateKey: { blsPublicKey: Buffer; blsPrivateKey: Buffer }[] = [];
	for (const validator of snapshotSubstore.activeValidators) {
		const validatorInfo = validatorsKeys.find(
			configValidator => configValidator.address === validator.address,
		);
		if (validatorInfo) {
			activeValidatorsWithPrivateKey.push({
				blsPublicKey: Buffer.from(validatorInfo.plain.blsKey, 'hex'),
				blsPrivateKey: Buffer.from(validatorInfo.plain.blsPrivateKey, 'hex'),
			});
		}
	}
	activeValidatorsWithPrivateKey.sort((a, b) => a.blsPublicKey.compare(b.blsPublicKey));

	const keys: Buffer[] = [];
	const weights: bigint[] = [];
	const validatorSignatures: { publicKey: Buffer; signature: Buffer }[] = [];
	// Sign with each active validator
	for (const validator of activeValidatorsWithPrivateKey) {
		keys.push(validator.blsPublicKey);
		weights.push(BigInt(20));
		const signature = bls.signData(MESSAGE_TAG_POA, chainID, message, validator.blsPrivateKey);
		validatorSignatures.push({ publicKey: validator.blsPublicKey, signature });
	}

	const publicKeysList = activeValidatorsWithPrivateKey.map(v => v.blsPublicKey);
	console.log('Total active sidechain validators:', validatorSignatures.length);

	const { aggregationBits, signature } = bls.createAggSig(publicKeysList, validatorSignatures);

	const verifyResult = bls.verifyWeightedAggSig(
		// validatorsInfos.map(validatorInfo => validatorInfo.key),
		// aggregationBits,
		// signature,
		// MESSAGE_TAG_POA,
		// context.chainID,
		// message,
		// validatorsInfos.map(validatorInfo => validatorInfo.weight),
		// snapshot0.threshold,

		keys,
		aggregationBits,
		signature,
		MESSAGE_TAG_POA,
		chainID,
		message,
		weights,
		BigInt(68),
	);
	console.log('==SIGNATURE VERIFICATION RESULT====', verifyResult);

	writeFileSync(
		'./updateAuthority_signed.json',
		JSON.stringify({
			...paramsJSON,
			newValidators: paramsJSON.newValidators.map(validator => ({
				address: cryptography.address
					.getAddressFromLisk32Address(validator.address)
					.toString('hex'),
				weight: validator.weight,
			})),
			signature: signature.toString('hex'),
			aggregationBits: aggregationBits.toString('hex'),
		}),
	);

	console.log('UpdateAuthority file is created at ./updateAuthority_signed successfully.');

	process.exit(0);
})();
