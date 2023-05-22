import { codec, Schema, apiClient, cryptography, CCMsg } from 'lisk-sdk';

const tokenID = Buffer.from('0400000000000000', 'hex');
const sidechainID = Buffer.from('04000001', 'hex'); // Update this to send to another sidechain

// framework/src/modules/token/schemas.ts
const crossChainTransferParamsSchema = async (mainchainClient: apiClient.APIClient) => {
	const { modules: modulesMetadata } = await mainchainClient.invoke<{
		modules: [
			{
				stores: { key: string; data: Schema }[];
				events: { name: string; data: Schema }[];
				name: string;
				commands: { name: string; params: Schema }[];
			},
		];
	}>('system_getMetadata');
	const tokenMetadata = modulesMetadata.find(m => m.name === 'token');
	return tokenMetadata?.commands.filter(cmd => cmd.name == 'transferCrossChain')[0]
		.params as Schema;
};

// framework/src/modules/token/schemas.ts
interface CrossChainTransferParams {
	tokenID: Buffer;
	amount: BigInt;
	receivingChainID: Buffer;
	recipientAddress: Buffer;
	data: string;
	messageFee: BigInt;
	messageFeeTokenID: Buffer;
}

// this wouldn't be needed anymore (as we can parse such CCMs from events)
export const getCcms = async (): Promise<CCMsg[]> => {
	const mainchainClient = await apiClient.createIPCClient(`~/.lisk/mainchain-node-one`);
	const mainchainNodeInfo = await mainchainClient.invoke('system_getNodeInfo');

	// The message recovery command recovers CCM32 and CCM34 by providing their indices and the sibling hashes
	// to compute the outbox root (the proof of inclusion for these CCMs in the tree)
	// const computeOutboxRoot = () => { };

	// these params are the sames as the ones which we used to transfer LSK from mainchain to sidechain
	// examples/interop/pos-mainchain-fast/config/scripts/transfer_lsk_sidechain_one.ts
	const crossChainTransferParams: CrossChainTransferParams = {
		tokenID,
		amount: BigInt('10000000000'),
		receivingChainID: sidechainID,
		recipientAddress: cryptography.address.getAddressFromLisk32Address(
			'lskxz85sur2yo22dmcxybe39uvh2fg7s2ezxq4ny9',
		),
		data: 'cc transfer testing',
		messageFee: BigInt('10000000'),
		messageFeeTokenID: tokenID,
	};

	const ccms: CCMsg[] = [
		{
			module: 'token',
			crossChainCommand: 'transferCrossChain',
			fee: BigInt(200000000),
			params: codec.encode(
				await crossChainTransferParamsSchema(mainchainClient),
				crossChainTransferParams,
			),
			nonce: BigInt(0),
			sendingChainID: Buffer.from(mainchainNodeInfo.chainID as string, 'hex'),
			receivingChainID: sidechainID,
			status: 0,
		},
	];

	console.log(ccms);
	// TODO: generate proof

	return ccms;
};
