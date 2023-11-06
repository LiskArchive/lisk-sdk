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

	const nodeAlias = 'two';
	const tokenID = Buffer.from('0400000000000000', 'hex');
	const mainchainID = Buffer.from('04000000', 'hex');
	const recipientLSKAddress = 'lskzjzeam6szx4a65sxgavr98m9h4kctcx85nvy7h';
	const recipientAddress = address.getAddressFromLisk32Address(recipientLSKAddress);

	const sidechainClient = await apiClient.createIPCClient(`~/.lisk/pos-sidechain-example-two`);

	const mainchainNodeInfo = await sidechainClient.invoke('system_getNodeInfo');

	const { modules: modulesMetadata } = await sidechainClient.invoke<{
		modules: ModulesMetadata;
	}>('system_getMetadata');

	const tokenMetadata = modulesMetadata.find(m => m.name === 'token');

	const ccTransferCMDSchema = tokenMetadata?.commands.filter(
		cmd => cmd.name == 'transferCrossChain',
	)[0].params as Schema;

	const params = {
		tokenID,
		amount: BigInt('10000000000'),
		receivingChainID: mainchainID,
		recipientAddress,
		data: 'cc transfer testing',
		messageFee: BigInt('10000000'),
		messageFeeTokenID: tokenID,
	};

	const relayerkeyInfo = keys[12];

	const { nonce } = await sidechainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: address.getLisk32AddressFromPublicKey(Buffer.from(relayerkeyInfo.publicKey, 'hex')),
	});

	const tx = new Transaction({
		module: 'token',
		command: 'transferCrossChain',
		fee: BigInt(100000000),
		params: codec.encode(ccTransferCMDSchema, params),
		nonce: BigInt(nonce),
		senderPublicKey: Buffer.from(relayerkeyInfo.publicKey, 'hex'),
		signatures: [],
	});

	tx.sign(
		Buffer.from(mainchainNodeInfo.chainID as string, 'hex'),
		Buffer.from(relayerkeyInfo.privateKey, 'hex'),
	);

	const result = await sidechainClient.invoke<{
		transactionId: string;
	}>('txpool_postTransaction', {
		transaction: tx.getBytes().toString('hex'),
	});

	console.log(
		`Sent cross chain transfer transaction (amount: ${params.amount.toString()}, recipient: ${recipientLSKAddress}) from sidechain (sidechainID: ${
			params.receivingChainID
		}) node ${nodeAlias} to mainchain. Result from transaction pool is: `,
		result,
	);

	process.exit(0);
})();
