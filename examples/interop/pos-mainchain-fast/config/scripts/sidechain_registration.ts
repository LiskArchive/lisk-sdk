import { apiClient, codec, sidechainRegParams, cryptography, Transaction } from 'lisk-sdk';
// Replace this with the path to a file storing the public and private key of a mainchain account who will send the sidechain registration transaction.
// (Can be any account with enough tokens).
import { keys } from '../default/dev-validators.json';

(async () => {
	const { address } = cryptography;

	// Replace this with alias of the sidechain node(s)
	const SIDECHAIN_ARRAY = ['pos-sidechain-example-one', 'pos-sidechain-example-two'];
	// Replace this with the alias of the mainchain node(s), e.g. lisk-core
	// Note: Number of mainchain nodes should be equal to sidechain nodes, for this script to work properly.
	const MAINCHAIN_ARRAY = ['mainchain-node-one', 'mainchain-node-two'];
	let i = 0;
	for (const nodeAlias of SIDECHAIN_ARRAY) {
		// Connect to the sidechain node
		const sidechainClient = await apiClient.createIPCClient(`~/.lisk/${nodeAlias}`);
		// Connect to the mainchain node
		const mainchainClient = await apiClient.createIPCClient(`~/.lisk/${MAINCHAIN_ARRAY[i]}`);

		// Get node info data from sidechain and mainchain
		const sidechainNodeInfo = await sidechainClient.invoke('system_getNodeInfo');
		const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');

		// Get info about the active sidechain validators and the certificate threshold
		const { validators: sidechainActiveValidators, certificateThreshold } =
			await sidechainClient.invoke('consensus_getBFTParameters', {
				height: sidechainNodeInfo.height,
			});

		// Sort validator list lexicographically after their BLS key
		(sidechainActiveValidators as { blsKey: string; bftWeight: string }[]).sort((a, b) =>
			Buffer.from(a.blsKey, 'hex').compare(Buffer.from(b.blsKey, 'hex')),
		);

		// Define parameters for the sidechain registration
		const params = {
			sidechainCertificateThreshold: certificateThreshold,
			sidechainValidators: sidechainActiveValidators,
			chainID: sidechainNodeInfo.chainID,
			name: nodeAlias.replace(/-/g, '_'),
		};

		// Get public key and nonce of the sender account
		const relayerKeyInfo = keys[2];
		const { nonce } = await mainchainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
			address: address.getLisk32AddressFromPublicKey(Buffer.from(relayerKeyInfo.publicKey, 'hex')),
		});

		// Create registerSidechain transaction
		const tx = new Transaction({
			module: 'interoperability',
			command: 'registerSidechain',
			fee: BigInt(2000000000),
			params: codec.encodeJSON(sidechainRegParams, params),
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

		console.log(
			`Sent sidechain registration transaction on mainchain node ${MAINCHAIN_ARRAY[1]}. Result from transaction pool is: `,
			result,
		);
		i += 1;

		// Wait in case there are more elements in the SIDECHAIN_ARRAY, after performing another loop with the next element.
		const wait = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
		if (i < SIDECHAIN_ARRAY.length) {
			const WAIT_PERIOD = 10000;
			console.log(`Waiting for ${WAIT_PERIOD} ms to send another sidechain registration`);
			// Wait for 2 seconds before next registration
			await wait(WAIT_PERIOD);
		}

		const authorizeSideChainResult = await sidechainClient.invoke<{
			transactionId: string;
		}>('chainConnector_authorize', {
			enable: true,
			password: 'lisk',
		});
		console.log('Authorize Sidechain completed, result:', authorizeSideChainResult);
	}

	process.exit(0);
})();
