import { codec, cryptography, apiClient, Transaction } from 'lisk-sdk';
import { keys as sidechainValidatorsKeys } from '../../config/default/dev-validators.json';
import {
	registrationSignatureMessageSchema,
	mainchainRegParams as mainchainRegParamsSchema,
	MESSAGE_TAG_CHAIN_REG,
} from 'lisk-framework';
import { keys as sidechainDevValidators } from '../default/dev-validators.json';

(async () => {
	const { bls, address } = cryptography;

	const mainchainClient = await apiClient.createIPCClient('~/.lisk/mainchain-node-one');
	const sidechainClient = await apiClient.createIPCClient('~/.lisk/pos-sidechain-example-one');
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
		ownName: 'sidechain_example_one',
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

	// Get active validators from sidechainchain
	const { validators: sidehcainActiveValidators } = await sidechainClient.invoke(
		'consensus_getBFTParameters',
		{ height: sidechainNodeInfo.height },
	);

	const activeValidatorsWithPrivateKey: { blsPublicKey: Buffer; blsPrivateKey: Buffer }[] = [];
	for (const v of sidehcainActiveValidators as { blsKey: string; bftWeight: string }[]) {
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
	// Sort active validators from sidechainchain
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

	const relayerkeyInfo = sidechainDevValidators[0];
	const { nonce } = await sidechainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: address.getLisk32AddressFromPublicKey(Buffer.from(relayerkeyInfo.publicKey, 'hex')),
	});
	const mainchainRegmainchainRegParams = {
		...paramsJSON,
		signature: signature.toString('hex'),
		aggregationBits: aggregationBits.toString('hex'),
	};
	const tx = new Transaction({
		module: 'interoperability',
		command: 'registerMainchain',
		fee: BigInt(2000000000),
		params: codec.encodeJSON(mainchainRegParamsSchema, mainchainRegmainchainRegParams),
		nonce: BigInt(nonce),
		senderPublicKey: Buffer.from(relayerkeyInfo.publicKey, 'hex'),
		signatures: [],
	});

	tx.sign(
		Buffer.from(sidechainNodeInfo.chainID as string, 'hex'),
		Buffer.from(relayerkeyInfo.privateKey, 'hex'),
	);

	const result = await sidechainClient.invoke<{
		transactionId: string;
	}>('txpool_postTransaction', {
		transaction: tx.getBytes().toString('hex'),
	});

	console.log('Sent mainchain registration transaction. Result from transaction pool is: ', result);

	process.exit(0);
})();
