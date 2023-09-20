import { codec, cryptography, apiClient, Transaction } from 'lisk-sdk';
import {
	registrationSignatureMessageSchema,
	mainchainRegParams as mainchainRegParamsSchema,
	MESSAGE_TAG_CHAIN_REG,
	MODULE_NAME_INTEROPERABILITY,
} from 'lisk-framework';
import { COMMAND_NAME_MAINCHAIN_REG } from 'lisk-framework/dist-node/modules/interoperability/constants';

export const registerMainchain = async (
	num: string,
	sidechainDevValidators: any[],
	sidechainValidatorsKeys: any[],
) => {
	const { bls, address } = cryptography;

	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-${num}`);
	const sidechainClient = await apiClient.createIPCClient(`~/.lisk/pos-sidechain-example-${num}`);

	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');
	const sidechainNodeInfo = await sidechainClient.invoke('system_getNodeInfo');

	// Get active validators from mainchain
	const {
		validators: mainchainActiveValidators,
		certificateThreshold: mainchainCertificateThreshold,
	} = await mainchainClient.invoke('consensus_getBFTParameters', {
		height: mainchainNodeInfo.height,
	});

	const paramsJSON = {
		ownChainID: sidechainNodeInfo.chainID,
		ownName: `sidechain_example_${num}`,
		mainchainValidators: (mainchainActiveValidators as { blsKey: string; bftWeight: string }[])
			.map(v => ({ blsKey: v.blsKey, bftWeight: v.bftWeight }))
			.sort((a, b) => Buffer.from(a.blsKey, 'hex').compare(Buffer.from(b.blsKey, 'hex'))),
		mainchainCertificateThreshold,
	};

	const params = {
		ownChainID: Buffer.from(paramsJSON.ownChainID as string, 'hex'),
		ownName: paramsJSON.ownName,
		mainchainValidators: paramsJSON.mainchainValidators.map(v => ({
			blsKey: Buffer.from(v.blsKey, 'hex'),
			bftWeight: BigInt(v.bftWeight),
		})),
		mainchainCertificateThreshold: paramsJSON.mainchainCertificateThreshold,
	};

	const message = codec.encode(registrationSignatureMessageSchema, params);

	// Get active validators from sidechainChain
	const { validators: sidechainActiveValidators } = await sidechainClient.invoke(
		'consensus_getBFTParameters',
		{ height: sidechainNodeInfo.height },
	);

	const activeValidatorsWithPrivateKey: { blsPublicKey: Buffer; blsPrivateKey: Buffer }[] = [];
	for (const v of sidechainActiveValidators as { blsKey: string; bftWeight: string }[]) {
		const validatorInfo = sidechainValidatorsKeys.find(
			configValidator => configValidator.plain.blsKey === v.blsKey,
		);
		if (validatorInfo) {
			activeValidatorsWithPrivateKey.push({
				blsPublicKey: Buffer.from(v.blsKey, 'hex'),
				blsPrivateKey: Buffer.from(validatorInfo.plain.blsPrivateKey, 'hex'),
			});
		}
	}
	console.log('Total activeValidatorsWithPrivateKey:', activeValidatorsWithPrivateKey.length);
	// Sort active validators from sidechainChain
	activeValidatorsWithPrivateKey.sort((a, b) => a.blsPublicKey.compare(b.blsPublicKey));

	const sidechainValidatorsSignatures: { publicKey: Buffer; signature: Buffer }[] = [];
	// Sign with each active validator
	for (const validator of activeValidatorsWithPrivateKey) {
		const signature = bls.signData(
			MESSAGE_TAG_CHAIN_REG,
			params.ownChainID,
			message,
			validator.blsPrivateKey,
		);
		sidechainValidatorsSignatures.push({ publicKey: validator.blsPublicKey, signature });
	}

	const publicKeysList = activeValidatorsWithPrivateKey.map(v => v.blsPublicKey);
	console.log('Total active sidechain validators:', sidechainValidatorsSignatures.length);

	// Create an aggregated signature
	const { aggregationBits, signature } = bls.createAggSig(
		publicKeysList,
		sidechainValidatorsSignatures,
	);

	const relayerKeyInfo = sidechainDevValidators[0];
	const { nonce } = await sidechainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: address.getLisk32AddressFromPublicKey(Buffer.from(relayerKeyInfo.publicKey, 'hex')),
	});
	const mainchainRegParams = {
		...paramsJSON,
		signature: signature.toString('hex'),
		aggregationBits: aggregationBits.toString('hex'),
	};
	const tx = new Transaction({
		module: MODULE_NAME_INTEROPERABILITY,
		command: COMMAND_NAME_MAINCHAIN_REG,
		fee: BigInt(2000000000),
		params: codec.encodeJSON(mainchainRegParamsSchema, mainchainRegParams),
		nonce: BigInt(nonce),
		senderPublicKey: Buffer.from(relayerKeyInfo.publicKey, 'hex'),
		signatures: [],
	});

	tx.sign(
		Buffer.from(sidechainNodeInfo.chainID as string, 'hex'),
		Buffer.from(relayerKeyInfo.privateKey, 'hex'),
	);

	const result = await sidechainClient.invoke<{
		transactionId: string;
	}>('txpool_postTransaction', {
		transaction: tx.getBytes().toString('hex'),
	});

	console.log('Sent mainchain registration transaction. Result from transaction pool is: ', result);

	const authorizeMainchainResult = await mainchainClient.invoke<{
		transactionId: string;
	}>('chainConnector_authorize', {
		enable: true,
		password: 'lisk',
	});
	console.log('Authorize Mainchain completed, result:', authorizeMainchainResult);

	process.exit(0);
};
