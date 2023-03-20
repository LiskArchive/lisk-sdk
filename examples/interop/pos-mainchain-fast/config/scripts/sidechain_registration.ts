import { apiClient, codec, cryptography, Transaction } from 'lisk-sdk';
import { keys } from '../default/dev-validators.json';
import { sidechainRegParams } from './schemas';

(async () => {
	const { address } = cryptography;

	const sidechainClient = await apiClient.createIPCClient('~/.lisk/pos-sidechain-fast');
	const mainchainClient = await apiClient.createIPCClient('~/.lisk/pos-mainchain-fast');

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
		name: 'lisk_sidechain',
	};

	const relayerkeyInfo = keys[0];
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

	console.log('Sent sidechain registration transaction. Result from transaction pool is: ', result);

	process.exit(0);
})();

/*
    Alternatively you can use below command on command line to create transaction.
    "./bin/run transaction:create interoperability registerMainchain 20000000 --pretty --passphrase="void erosion dynamic eye glory draft that year forward have pyramid lava lyrics tank nasty knee fresh kite grow garlic illegal level stage physical" -f ../../scripts/src/configs/mainchain_reg_params.json"
*/
