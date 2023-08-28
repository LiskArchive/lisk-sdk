import {
	ChannelDataJSON,
	ChannelData,
	Inbox,
	Outbox,
	ProveResponse,
	CCMsg,
	codec,
	ccmSchema,
	chain,
	apiClient,
	cryptography,
} from 'lisk-sdk';
import { ProveResponseJSON, Data } from './types';
import { SUBSTORE_PREFIX_CHANNEL_DATA, STORE_PREFIX_INTEROPERABILITY } from './constants';

export const getBalances = async (
	client: apiClient.APIClient,
	lskAddress: string,
	tokenID: Buffer,
) => {
	const balance = await client.invoke<{
		availableBalance: string;
		lockedBalances: {
			module: string;
			amount: string;
		}[];
	}>('token_getBalance', {
		address: lskAddress,
		tokenID: tokenID.toString('hex'),
	});

	return {
		availableBalance: BigInt(balance.availableBalance),
		lockedBalances: balance.lockedBalances.map(b => ({
			amount: BigInt(b.amount),
			module: b.module,
		})),
	};
};

export const toChannelData = (channelData: ChannelDataJSON): ChannelData => {
	const { inbox, messageFeeTokenID, outbox, partnerChainOutboxRoot, minReturnFeePerByte } =
		channelData;

	const inboxJSON: Inbox = {
		appendPath: inbox.appendPath.map(ap => Buffer.from(ap, 'hex')),
		root: Buffer.from(inbox.root, 'hex'),
		size: inbox.size,
	};

	const outboxJSON: Outbox = {
		appendPath: outbox.appendPath.map(ap => Buffer.from(ap, 'hex')),
		root: Buffer.from(outbox.root, 'hex'),
		size: outbox.size,
	};

	return {
		messageFeeTokenID: Buffer.from(messageFeeTokenID, 'hex'),
		outbox: outboxJSON,
		inbox: inboxJSON,
		partnerChainOutboxRoot: Buffer.from(partnerChainOutboxRoot, 'hex'),
		minReturnFeePerByte: BigInt(minReturnFeePerByte),
	};
};

export const getStateProveResponseJSON = async (
	client: apiClient.APIClient,
	stateProveRequestKey: Buffer,
): Promise<ProveResponseJSON> => {
	return await client.invoke<ProveResponseJSON>('state_prove', {
		queryKeys: [stateProveRequestKey.toString('hex')], // `queryKey` is `string`
	});
};

export const toProveResponse = (proveResponseJSON: ProveResponseJSON): ProveResponse => {
	const {
		proof: { queries, siblingHashes },
	} = proveResponseJSON;

	return {
		proof: {
			queries: queries.map(query => ({
				bitmap: Buffer.from(query.bitmap, 'hex'),
				key: Buffer.from(query.key, 'hex'),
				value: Buffer.from(query.value, 'hex'),
			})),
			siblingHashes: siblingHashes.map(siblingHash => Buffer.from(siblingHash, 'hex')),
		},
	};
};

export const toBytes = (ccm: CCMsg) => codec.encode(ccmSchema, ccm);

export const toBlockHeader = (data?: Record<string, unknown>) => {
	const { blockHeader: receivedBlock } = data as unknown as Data;
	return chain.BlockHeader.fromJSON(receivedBlock).toObject();
};

/**
 * https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#execution-4
 * queryKey = STORE_PREFIX_INTEROPERABILITY + SUBSTORE_PREFIX_CHANNEL_DATA + sha256(OWN_CHAIN_ID)
 */
export const buildMessageRecoveryQueryKey = (mainchainID: string) => {
	return Buffer.concat([
		STORE_PREFIX_INTEROPERABILITY,
		SUBSTORE_PREFIX_CHANNEL_DATA,
		cryptography.utils.hash(mainchainID),
	]);
};

/**
 * https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#execution
 * queryKey = storePrefix + entry.substorePrefix + sha256(entry.storeKey)
 *
 * We can find modulePrefix in the `system_getMetadata` endpoint for each module as well as subStores
 *
 * TODO: Will ```modulePrefix:3c469e9d  & subStorePrefix:0000``` be always the same for each storeKey ???
 *       Since multiple modules could have a recover function e.g., `token` & `NFT`
 */
export const buildStateRecoveryQueryKey = (storeKey: Buffer): Buffer => {
	// modulePrefix:3c469e9d   subStorePrefix:0000
	return Buffer.concat([Buffer.from('3c469e9d0000', 'hex'), cryptography.utils.hash(storeKey)]);
};
