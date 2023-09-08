import { apiClient, codec, cryptography, Schema, Transaction } from 'lisk-sdk';
import { keys } from '../default/dev-validators.json';
type ModulesMetadata = [
	{
		stores: { key: string; data: Schema }[];
		events: { name: string; data: Schema }[];
		name: string;
		commands: { name: string; params: Schema }[];
	},
];
(async () => {
	const { address } = cryptography;

	const nodeAlias = 'one';
	const tokenID = Buffer.from('0400000000000000', 'hex');
	const nftID = Buffer.from('04000000010101010000000000000000', 'hex');
	const sidechainID = Buffer.from('04000001', 'hex'); // Update this to send to another sidechain
	const recipientAddress = address.getAddressFromLisk32Address(
		'lskxz85sur2yo22dmcxybe39uvh2fg7s2ezxq4ny9',
	);

	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-one`);

	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');

	const { modules: modulesMetadata } = await mainchainClient.invoke<{
		modules: ModulesMetadata;
	}>('system_getMetadata');
	const tokenMetadata = modulesMetadata.find(m => m.name === 'nft');

	const ccTransferCMDSchema = tokenMetadata?.commands.filter(
		cmd => cmd.name == 'transferCrossChain',
	)[0].params as Schema;

	const params = {
		nftID,
		receivingChainID: sidechainID,
		recipientAddress,
		data: 'cc nft transfer testing',
		messageFee: BigInt('10000000'),
		messageFeeTokenID: tokenID,
		includeAttributes: true,
	};

	const relayerkeyInfo = keys[2];
	const { nonce } = await mainchainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: address.getLisk32AddressFromPublicKey(Buffer.from(relayerkeyInfo.publicKey, 'hex')),
	});

	const tx = new Transaction({
		module: 'nft',
		command: 'transferCrossChain',
		fee: BigInt(200000000),
		params: codec.encode(ccTransferCMDSchema, params),
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
		`Sent cross chain nft transfer transaction recipientAddress: ${params.recipientAddress.toString(
			'hex',
		)}) to send of sidechain (sendingChainID: ${
			params.receivingChainID
		}) node ${nodeAlias}. Result from transaction pool is: `,
		result,
	);

	process.exit(0);
})();
