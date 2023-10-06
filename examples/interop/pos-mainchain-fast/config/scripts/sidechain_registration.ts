import { apiClient, codec, cryptography, Transaction } from 'lisk-sdk';
import { keys } from '../default/dev-validators.json';
import { sidechainRegParams } from 'lisk-framework';

(async () => {
	const { address } = cryptography;

	const SIDECHAIN_ARRAY = ['one', 'two'];
	let i = 0;
	for (const nodeAlias of SIDECHAIN_ARRAY) {
		const sidechainClient = await apiClient.createIPCClient(
			`~/.lisk/pos-sidechain-example-${nodeAlias}`,
		);
		const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-${nodeAlias}`);

		const sidechainNodeInfo = await sidechainClient.invoke('system_getNodeInfo');
		const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');
		// Get active validators from sidechainchain
		const { validators: sidehcainActiveValidators, certificateThreshold } =
			await sidechainClient.invoke('consensus_getBFTParameters', {
				height: sidechainNodeInfo.height,
			});

		(sidehcainActiveValidators as { blsKey: string; bftWeight: string }[]).sort((a, b) =>
			Buffer.from(a.blsKey, 'hex').compare(Buffer.from(b.blsKey, 'hex')),
		);

		const params = {
			sidechainCertificateThreshold: certificateThreshold,
			sidechainValidators: sidehcainActiveValidators,
			chainID: sidechainNodeInfo.chainID,
			name: `sidechain_example_${nodeAlias}`,
		};

		const relayerkeyInfo = keys[2];
		const { nonce } = await mainchainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
			address: address.getLisk32AddressFromPublicKey(Buffer.from(relayerkeyInfo.publicKey, 'hex')),
		});

		const tx = new Transaction({
			module: 'interoperability',
			command: 'registerSidechain',
			fee: BigInt(2000000000),
			params: codec.encodeJSON(sidechainRegParams, params),
			nonce: BigInt(nonce),
			senderPublicKey: Buffer.from(relayerkeyInfo.publicKey, 'hex'),
			signatures: [],
		});

		tx.sign(
			Buffer.from(mainchainNodeInfo.chainID as string, 'hex'),
			Buffer.from(relayerkeyInfo.privateKey, 'hex'),
		);

		const result = await mainchainClient.invoke<{
			transactionId: string;
		}>('txpool_postTransaction', {
			transaction: tx.getBytes().toString('hex'),
		});

		console.log(
			`Sent sidechain registration transaction on mainchain node ${nodeAlias}. Result from transaction pool is: `,
			result,
		);
		i += 1;

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
