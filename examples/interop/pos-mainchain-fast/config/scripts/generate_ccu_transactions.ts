/**
 * This script is intended to demonstrate how to register a sidechain and create/send CCUs.
 */
import {
	cryptography,
	testing,
	passphrase,
	apiClient,
	Transaction,
	codec,
	sidechainRegParams,
	ActiveValidator,
	validatorsHashInputSchema,
	UnsignedCertificate,
	MESSAGE_TAG_CERTIFICATE,
	unsignedCertificateSchema,
	certificateSchema,
	ccuParamsSchema,
} from 'lisk-sdk';
import * as fs from 'fs-extra';
const { ed, bls, address, utils } = cryptography;
import { keys } from '../default/dev-validators.json';

export interface Certifcate {
	readonly blockID: Buffer;
	readonly height: number;
	readonly timestamp: number;
	readonly stateRoot: Buffer;
	readonly validatorsHash: Buffer;
	aggregationBits: Buffer;
	signature: Buffer;
}

interface ActiveValidatorsUpdate {
	blsKeysUpdate: Buffer[];
	bftWeightsUpdate: bigint[];
	bftWeightsUpdateBitmap: Buffer;
}

interface OutboxRootWitness {
	bitmap: Buffer;
	siblingHashes: Buffer[];
}

interface InboxUpdate {
	crossChainMessages: Buffer[];
	messageWitnessHashes: Buffer[];
	outboxRootWitness: OutboxRootWitness;
}

export interface CrossChainUpdateTransactionParams {
	sendingChainID: Buffer;
	certificate: Buffer;
	activeValidatorsUpdate: ActiveValidatorsUpdate;
	certificateThreshold: bigint;
	inboxUpdate: InboxUpdate;
}

interface ValidatorAccount {
	privateKey: Buffer;
	publicKey: Buffer;
	blsPrivateKey: Buffer;
	blsPublicKey: Buffer;
}

export const computeValidatorsHash = (
	activeValidators: ActiveValidator[],
	certificateThreshold: bigint,
) => {
	const input = {
		activeValidators,
		certificateThreshold,
	};
	const encodedValidatorsHashInput = codec.encode(validatorsHashInputSchema, input);
	return utils.hash(encodedValidatorsHashInput);
};

const generateValidatorForSidechain = async (count: number, chainID: string, chainName: string) => {
	const phrase = passphrase.Mnemonic.generateMnemonic(256);
	const validators: ValidatorAccount[] = [];
	for (let i = 0; i < count; i += 1) {
		const accountKeyPath = `m/44'/134'/${i}'`;
		const blsKeyPath = `m/12381/134/${chainID}/${i}`;

		const accountPrivateKey = await ed.getPrivateKeyFromPhraseAndPath(phrase, accountKeyPath);
		const accountPublicKey = ed.getPublicKeyFromPrivateKey(accountPrivateKey);
		const blsPrivateKey = await bls.getPrivateKeyFromPhraseAndPath(phrase, blsKeyPath);
		const blsPublicKey = bls.getPublicKeyFromPrivateKey(blsPrivateKey);

		validators.push({
			privateKey: accountPrivateKey,
			publicKey: accountPublicKey,
			blsPrivateKey,
			blsPublicKey,
		});
	}
	const OWNER_READ_WRITE = 0o600;
	fs.writeJSONSync(`~/keys-${chainName}`, { keys }, { spaces: ' ', mode: OWNER_READ_WRITE });

	return validators;
};

const createAndSendTransaction = async (
	module: string,
	command: string,
	fee: bigint,
	params: Buffer,
	message: string,
) => {
	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-one`);
	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');

	// Get public key and nonce of the sender account
	const relayerKeyInfo = keys[2];
	const { nonce } = await mainchainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: address.getLisk32AddressFromPublicKey(Buffer.from(relayerKeyInfo.publicKey, 'hex')),
	});
	// Create registerSidechain transaction
	const tx = new Transaction({
		module,
		command,
		fee,
		params,
		nonce: BigInt(nonce),
		senderPublicKey: Buffer.from(relayerKeyInfo.publicKey, 'hex'),
		signatures: [],
	});

	// Sign the transaction
	tx.sign(
		Buffer.from(mainchainNodeInfo.chainID as string, 'hex'),
		Buffer.from(relayerKeyInfo.privateKey, 'hex'),
	);

	// Post the transaction to a mainchain node
	const result = await mainchainClient.invoke<{
		transactionId: string;
	}>('txpool_postTransaction', {
		transaction: tx.getBytes().toString('hex'),
	});

	console.log(message, result);
};

export const registerSidechain = async (
	chainID: string,
	name: string,
	sidechainValidators: { blsKey: Buffer; bftWeight: bigint }[],
	sidechainCertificateThreshold: bigint,
) => {
	const params = {
		chainID: Buffer.from(chainID, 'hex'),
		name,
		sidechainValidators: sidechainValidators.sort((a, b) => a.blsKey.compare(b.blsKey)),
		sidechainCertificateThreshold,
	};

	await createAndSendTransaction(
		'interoperability',
		'registerSidechain',
		BigInt(2000000000),
		codec.encodeJSON(sidechainRegParams, params),
		`Sent register sidechain transaction with chainID: ${chainID}`,
	);
};

export const computeAndSendCCUTransaction = async (
	chainID: string,
	validators: ValidatorAccount[],
	certificateThreshold: bigint,
	timestamp: number,
) => {
	const validatorBLSKeyAndWeight = validators.map(v => ({
		blsKey: v.blsPublicKey,
		bftWeight: BigInt(1),
	}));
	validatorBLSKeyAndWeight.sort((a, b) => a.blsKey.compare(b.blsKey));

	const validatorsHash = computeValidatorsHash(validatorBLSKeyAndWeight, certificateThreshold);

	const block = testing.createFakeBlockHeader({ validatorsHash, timestamp });
	const unsignedCertificate: UnsignedCertificate = {
		blockID: block.id,
		height: block.height,
		stateRoot: block.stateRoot as Buffer,
		timestamp: block.timestamp,
		validatorsHash: block.validatorsHash as Buffer,
	};
	const signatures: { signature: Buffer; publicKey: Buffer }[] = [];

	for (const { blsPrivateKey, blsPublicKey } of validators.sort((a, b) =>
		a.blsPublicKey.compare(b.blsPublicKey),
	)) {
		signatures.push({
			signature: bls.signData(
				MESSAGE_TAG_CERTIFICATE,
				Buffer.from(chainID, 'hex'),
				codec.encode(unsignedCertificateSchema, unsignedCertificate),
				blsPrivateKey,
			),
			publicKey: blsPublicKey,
		});
	}

	const { aggregationBits, signature } = bls.createAggSig(
		signatures.map(s => s.publicKey),
		signatures,
	);

	const certificate = codec.encode(certificateSchema, {
		...unsignedCertificate,
		aggregationBits,
		signature,
	});

	const params = codec.encode(ccuParamsSchema, {
		activeValidatorsUpdate: {
			bftWeightsUpdate: [],
			bftWeightsUpdateBitmap: Buffer.alloc(0),
			blsKeysUpdate: [],
		},
		certificate,
		certificateThreshold,
		inboxUpdate: {
			crossChainMessages: [],
			messageWitnessHashes: [],
			outboxRootWitness: {
				bitmap: Buffer.alloc(0),
				siblingHashes: [],
			},
		},
		sendingChainID: Buffer.from(chainID, 'hex'),
	});

	await createAndSendTransaction(
		'interoperability',
		'submitMainchainCrossChainUpdate',
		BigInt(10000000),
		params,
		`Sent cross chain update transaction to mainchain from sendingChain with chainID: ${chainID}`,
	);
};
/**
 * 1. Register multiple sidechains on the receiving chain
 * 2. Generate a fake block for the sending chain with timestamp < lastblock.timestamp on the receiving chain
 * 3. Create aggreggate signature by signing the unsigned certificate using the same validators saved on the receivingChain validators store
 * 4. Keep InboxUpdate and ActiveValidatorsUpdate blank for this scenario to keep things simple
 */
(async () => {
	const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
	// send register sidechainParams
	const chainID = '04000051';
	const chainName = 'sidechain_51';
	const sidechainValidators = await generateValidatorForSidechain(2, chainID, chainName);
	const sidechainValidatorsParam = sidechainValidators.map(v => ({
		blsKey: v.blsPublicKey,
		bftWeight: BigInt(1),
	}));
	const certificateThreshold = BigInt(2);

	await registerSidechain(chainID, chainName, sidechainValidatorsParam, certificateThreshold);
	console.log('Registered sidechain!');

	await wait(15000);

	// Making sure the timestamp of the certificate is in the past but not older than 15 days.
	const timestampForCertificate = Math.floor((Date.now() - 100000) / 1000);
	// Send CCU after registration is done
	await computeAndSendCCUTransaction(
		chainID,
		sidechainValidators,
		certificateThreshold,
		timestampForCertificate,
	);
})();
