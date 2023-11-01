import { apiClient, codec, cryptography, Schema, Transaction } from 'lisk-sdk';
// Replace this with the path to a file storing the public and private key of a mainchain account who will send the sidechain registration transaction.
// (Can be any account with enough tokens).
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
	// Update this with the Token ID of the token you wish to transfer
	const tokenID = Buffer.from('0400000000000000', 'hex');
	// Update this with the chain ID of the receiving chain
	const sidechainID = Buffer.from('04000001', 'hex');
	// Update this with the recipient address
	const recipientLSKAddress = 'lskxz85sur2yo22dmcxybe39uvh2fg7s2ezxq4ny9';
	const recipientAddress = address.getAddressFromLisk32Address(recipientLSKAddress);

	// Connect to the mainchain node
	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-one`);

	// Get node info data from mainchain
	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');

	// Get schema for the transferCrossChain command
	const { modules: modulesMetadata } = await mainchainClient.invoke<{
		modules: ModulesMetadata;
	}>('system_getMetadata');
	const tokenMetadata = modulesMetadata.find(m => m.name === 'token');
	const ccTransferCMDSchema = tokenMetadata?.commands.filter(
		cmd => cmd.name == 'transferCrossChain',
	)[0].params as Schema;

	// Define parameters for the cc transfer
	const params = {
		tokenID,
		amount: BigInt('10000000000'),
		receivingChainID: sidechainID,
		recipientAddress,
		data: 'cc transfer testing',
		messageFee: BigInt('10000000'),
		messageFeeTokenID: tokenID,
	};

	// Get public key and nonce of the sender account
	const relayerkeyInfo = keys[2];
	const { nonce } = await mainchainClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
		address: address.getLisk32AddressFromPublicKey(Buffer.from(relayerkeyInfo.publicKey, 'hex')),
	});

	// Create transferCrossChain transaction
	const tx = new Transaction({
		module: 'token',
		command: 'transferCrossChain',
		fee: BigInt(200000000),
		params: codec.encode(ccTransferCMDSchema, params),
		nonce: BigInt(nonce),
		senderPublicKey: Buffer.from(relayerkeyInfo.publicKey, 'hex'),
		signatures: [],
	});

	// Sign the transaction
	tx.sign(
		Buffer.from(mainchainNodeInfo.chainID as string, 'hex'),
		Buffer.from(relayerkeyInfo.privateKey, 'hex'),
	);

	// Post the transaction to a mainchain node
	const result = await mainchainClient.invoke<{
		transactionId: string;
	}>('txpool_postTransaction', {
		transaction: tx.getBytes().toString('hex'),
	});

	console.log(
		`Sent cross chain transfer transaction (amount: ${
			params.amount
		}, recipientAddress: ${recipientLSKAddress}) to sidechain (receivingChainID: ${params.receivingChainID.toString(
			'hex',
		)}) node ${nodeAlias}. Result from transaction pool is: `,
		result,
	);

	process.exit(0);
})();
