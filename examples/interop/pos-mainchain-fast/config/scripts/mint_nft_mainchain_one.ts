import { apiClient, codec, cryptography, Transaction } from 'lisk-sdk';
import { keys } from '../default/dev-validators.json';
import { LENGTH_COLLECTION_ID } from '../../../../pos-mainchain/src/app/modules/testNft/constants';
import { mintNftParamsSchema } from '../../../../pos-mainchain/src/app/modules/testNft/schema';
(async () => {
	const { address } = cryptography;

	const nodeAlias = 'one';

	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-one`);

	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');

	const relayerkeyInfo = keys[2];
	const mintNftParams = {
		address: address.getAddressFromLisk32Address(relayerkeyInfo.address),
		collectionID: Buffer.alloc(LENGTH_COLLECTION_ID, 1),
		attributesArray: [
			{
				module: 'token',
				attributes: Buffer.alloc(8, 2),
			},
		],
	};

	const { nonce } = await mainchainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: address.getLisk32AddressFromPublicKey(Buffer.from(relayerkeyInfo.publicKey, 'hex')),
	});

	const tx = new Transaction({
		module: 'testNft',
		command: 'mintNft',
		fee: BigInt(200000000),
		params: codec.encode(mintNftParamsSchema, mintNftParams),
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
		`Sent mint nft transaction to address: ${relayerkeyInfo} to node ${nodeAlias}. Result from transaction pool is: `,
		result,
	);

	process.exit(0);
})();
