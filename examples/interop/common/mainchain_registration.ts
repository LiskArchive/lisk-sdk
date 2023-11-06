import {
	codec,
	cryptography,
	apiClient,
	Transaction,
	registrationSignatureMessageSchema,
	mainchainRegParams as mainchainRegParamsSchema,
	MESSAGE_TAG_CHAIN_REG,
} from 'lisk-sdk';

/**
 * Registers the mainchain to a specific sidechain node.
 *
 * @example
 * ```js
 * // Update path to point to the dev-validators.json file of the sidechain which shall be registered on the mainchain
import { keys as sidechainDevValidators } from '../default/dev-validators.json';

 * (async () => {
 *	await registerMainchain("lisk-core","my-lisk-app",sidechainDevValidators);
 *})();
 * ```
 *
 * @param mc mainchain alias of the mainchain to be registered.
 * @param sc sidechain alias of the sidechain, where the mainchain shall be registered.
 * @param sidechainDevValidators the `key` property of the `dev-validators.json` file.
 * Includes all keys of the sidechain validators to create the aggregated signature.
 */

export const registerMainchain = async (mc: string, sc: string, sidechainDevValidators: any[]) => {
	const { bls, address } = cryptography;

	// Connect to the mainchain node
	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/${mc}`);
	// Connect to the sidechain node
	const sidechainClient = await apiClient.createIPCClient(`~/.lisk/${sc}`);

	// Get node info from sidechain and mainchain
	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');
	const sidechainNodeInfo = await sidechainClient.invoke('system_getNodeInfo');

	// Get active validators from mainchain
	const {
		validators: mainchainActiveValidators,
		certificateThreshold: mainchainCertificateThreshold,
	} = await mainchainClient.invoke('consensus_getBFTParameters', {
		height: mainchainNodeInfo.height,
	});

	// Sort validator list lexicographically after their BLS key
	const paramsJSON = {
		ownChainID: sidechainNodeInfo.chainID,
		ownName: sc.replace(/-/g, '_'),
		mainchainValidators: (mainchainActiveValidators as { blsKey: string; bftWeight: string }[])
			.map(v => ({ blsKey: v.blsKey, bftWeight: v.bftWeight }))
			.sort((a, b) => Buffer.from(a.blsKey, 'hex').compare(Buffer.from(b.blsKey, 'hex'))),
		mainchainCertificateThreshold,
	};

	// Define parameters for the mainchain registration
	const params = {
		ownChainID: Buffer.from(paramsJSON.ownChainID as string, 'hex'),
		ownName: paramsJSON.ownName,
		mainchainValidators: paramsJSON.mainchainValidators.map(v => ({
			blsKey: Buffer.from(v.blsKey, 'hex'),
			bftWeight: BigInt(v.bftWeight),
		})),
		mainchainCertificateThreshold: paramsJSON.mainchainCertificateThreshold,
	};

	// Encode parameters
	const message = codec.encode(registrationSignatureMessageSchema, params);

	// Get active validators from sidechain
	const { validators: sidechainActiveValidators } = await sidechainClient.invoke(
		'consensus_getBFTParameters',
		{ height: sidechainNodeInfo.height },
	);

	// Add validator private keys to the sidechain validator list
	const activeValidatorsBLSKeys: { blsPublicKey: Buffer; blsPrivateKey: Buffer }[] = [];

	for (const activeValidator of sidechainActiveValidators as {
		blsKey: string;
		bftWeight: string;
	}[]) {
		const sidechainDevValidator = sidechainDevValidators.find(
			devValidator => devValidator.plain.blsKey === activeValidator.blsKey,
		);
		if (sidechainDevValidator) {
			activeValidatorsBLSKeys.push({
				blsPublicKey: Buffer.from(activeValidator.blsKey, 'hex'),
				blsPrivateKey: Buffer.from(sidechainDevValidator.plain.blsPrivateKey, 'hex'),
			});
		}
	}
	console.log('Total activeValidatorsBLSKeys:', activeValidatorsBLSKeys.length);

	// Sort active validators from sidechain lexicographically after their BLS public key
	activeValidatorsBLSKeys.sort((a, b) => a.blsPublicKey.compare(b.blsPublicKey));

	const sidechainValidatorsSignatures: { publicKey: Buffer; signature: Buffer }[] = [];

	// Sign parameters with each active sidechain validator
	for (const validator of activeValidatorsBLSKeys) {
		const signature = bls.signData(
			MESSAGE_TAG_CHAIN_REG,
			params.ownChainID,
			message,
			validator.blsPrivateKey,
		);
		sidechainValidatorsSignatures.push({ publicKey: validator.blsPublicKey, signature });
	}

	const publicBLSKeys = activeValidatorsBLSKeys.map(v => v.blsPublicKey);
	console.log('Total active sidechain validators:', sidechainValidatorsSignatures.length);

	// Create an aggregated signature
	const { aggregationBits, signature } = bls.createAggSig(
		publicBLSKeys,
		sidechainValidatorsSignatures,
	);

	// Get public key and nonce of the sender account
	const relayerKeyInfo = sidechainDevValidators[0];
	const { nonce } = await sidechainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: address.getLisk32AddressFromPublicKey(Buffer.from(relayerKeyInfo.publicKey, 'hex')),
	});

	// Add aggregated signature to the parameters of the mainchain registration
	const mainchainRegParams = {
		...paramsJSON,
		signature: signature.toString('hex'),
		aggregationBits: aggregationBits.toString('hex'),
	};

	// Create registerMainchain transaction
	const tx = new Transaction({
		module: 'interoperability',
		command: 'registerMainchain',
		fee: BigInt(2000000000),
		params: codec.encodeJSON(mainchainRegParamsSchema, mainchainRegParams),
		nonce: BigInt(nonce),
		senderPublicKey: Buffer.from(relayerKeyInfo.publicKey, 'hex'),
		signatures: [],
	});

	// Sign the transaction
	tx.sign(
		Buffer.from(sidechainNodeInfo.chainID as string, 'hex'),
		Buffer.from(relayerKeyInfo.privateKey, 'hex'),
	);

	// Post the transaction to a sidechain node
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
