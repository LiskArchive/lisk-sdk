/*
 * Copyright © 2022 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
import {
	BlockAssetJSON,
	BlockHeader,
	BlockJSON,
	Chain,
	EventAttr,
	EVENT_KEY_LENGTH,
	StateStore,
	TransactionJSON,
} from '@liskhq/lisk-chain';
import { Database, NotFoundError, Proof, SparseMerkleTree } from '@liskhq/lisk-db';
import { isHexString, validator } from '@liskhq/lisk-validator';
import { address } from '@liskhq/lisk-cryptography';
import { JSONObject } from '../../types';
import { RequestContext } from '../rpc/rpc_server';
import {
	EMPTY_KEY,
	MODULE_STORE_PREFIX_BFT,
	STORE_PREFIX_BFT_PARAMETERS,
	STORE_PREFIX_BFT_VOTES,
} from '../bft/constants';
import { areHeadersContradictingRequestSchema, BFTVotes, bftVotesSchema } from '../bft/schemas';
import { areDistinctHeadersContradicting } from '../bft/utils';
import { getBFTParameters } from '../bft/bft_params';
import { BFTMethod } from '../bft';

interface EndpointArgs {
	chain: Chain;
	bftMethod: BFTMethod;
}

interface GeneratorInfo {
	address: string;
	nextAllocatedTime: number;
}

const proveEventsRequestSchema = {
	$id: '/node/endpoint/proveEventsRequestSchema',
	type: 'object',
	required: ['height', 'queries'],
	properties: {
		height: {
			type: 'integer',
			minimum: 0,
		},
		queries: {
			type: 'array',
			items: {
				type: 'string',
				format: 'hex',
			},
		},
	},
};
export class ChainEndpoint {
	[key: string]: unknown;
	private readonly _chain: Chain;
	private readonly _bftMethod: BFTMethod;
	private _db!: Database;

	public constructor(args: EndpointArgs) {
		this._chain = args.chain;
		this._bftMethod = args.bftMethod;
	}

	public init(db: Database) {
		this._db = db;
	}

	public async getBlockByID(context: RequestContext): Promise<BlockJSON> {
		const { id } = context.params;
		if (!isHexString(id)) {
			throw new Error('Invalid parameters. id must be a valid hex string.');
		}
		const block = await this._chain.dataAccess.getBlockByID(Buffer.from(id as string, 'hex'));
		return block.toJSON();
	}

	public async getBlocksByIDs(context: RequestContext): Promise<BlockJSON[]> {
		const { ids } = context.params;
		if (!Array.isArray(ids) || ids.length === 0) {
			throw new Error('Invalid parameters. ids must be a non empty array.');
		}
		if (!ids.every(id => isHexString(id))) {
			throw new Error('Invalid parameters. id must a valid hex string.');
		}
		const blocks = [];
		try {
			for (const id of ids) {
				const block = await this._chain.dataAccess.getBlockByID(Buffer.from(id as string, 'hex'));
				blocks.push(block);
			}
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		return blocks.map(block => block.toJSON());
	}
	public async getBlockByHeight(context: RequestContext): Promise<BlockJSON> {
		const { height } = context.params;
		if (typeof height !== 'number') {
			throw new Error('Invalid parameters. height must be a number.');
		}

		const block = await this._chain.dataAccess.getBlockByHeight(height);
		return block.toJSON();
	}

	public async getBlocksByHeightBetween(context: RequestContext): Promise<BlockJSON[]> {
		const { from, to } = context.params;
		if (typeof from !== 'number' || typeof to !== 'number') {
			throw new Error('Invalid parameters. from and to must be a number.');
		}
		const blocks = await this._chain.dataAccess.getBlocksByHeightBetween(from, to);

		return blocks.map(b => b.toJSON());
	}

	public async getTransactionByID(context: RequestContext): Promise<TransactionJSON> {
		const { id } = context.params;
		if (!isHexString(id)) {
			throw new Error('Invalid parameters. id must be a valid hex string.');
		}
		const transaction = await this._chain.dataAccess.getTransactionByID(
			Buffer.from(id as string, 'hex'),
		);
		return transaction.toJSON();
	}

	public async getTransactionsByIDs(context: RequestContext): Promise<TransactionJSON[]> {
		const { ids } = context.params;
		if (!Array.isArray(ids) || ids.length === 0) {
			throw new Error('Invalid parameters. ids must be a non empty array.');
		}
		if (!ids.every(id => isHexString(id))) {
			throw new Error('Invalid parameters. id must a valid hex string.');
		}
		const transactions = [];
		try {
			for (const id of ids) {
				const transaction = await this._chain.dataAccess.getTransactionByID(
					Buffer.from(id as string, 'hex'),
				);
				transactions.push(transaction);
			}
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		return transactions.map(tx => tx.toJSON());
	}

	public async getTransactionsByHeight(context: RequestContext): Promise<TransactionJSON[]> {
		const { height } = context.params;
		if (typeof height !== 'number' || height < 0) {
			throw new Error('Invalid parameters. height must be zero or a positive number.');
		}
		const block = await this._chain.dataAccess.getBlockByHeight(height);
		return block.transactions.map(tx => tx.toJSON());
	}

	public async getAssetsByHeight(context: RequestContext): Promise<BlockAssetJSON[]> {
		const { height } = context.params;
		if (typeof height !== 'number' || height < 0) {
			throw new Error('Invalid parameters. height must be zero or a positive number.');
		}
		const block = await this._chain.dataAccess.getBlockByHeight(height);
		return block.assets.toJSON();
	}

	public getLastBlock(): BlockJSON {
		return this._chain.lastBlock.toJSON();
	}

	public async getEvents(context: RequestContext): Promise<JSONObject<EventAttr[]>> {
		const { height } = context.params;
		if (typeof height !== 'number' || height < 0) {
			throw new Error('Invalid parameters. height must be zero or a positive number.');
		}
		const events = await this._chain.dataAccess.getEvents(height);

		return events.map(e => e.toJSON());
	}

	public async proveEvents(context: RequestContext): Promise<JSONObject<Proof>> {
		validator.validate(proveEventsRequestSchema, context.params);

		const { height, queries } = context.params as { height: number; queries: string[] };
		const queryBytes = queries.map(q => Buffer.from(q, 'hex'));
		const events = await this._chain.dataAccess.getEvents(height);

		const eventSMT = new SparseMerkleTree(EVENT_KEY_LENGTH);
		const data = [];
		for (const e of events) {
			const pairs = e.keyPair();
			for (const pair of pairs) {
				data.push(pair);
			}
		}
		const root = await eventSMT.update(Buffer.alloc(0), data);
		const proof = await eventSMT.prove(root, queryBytes);
		return {
			queries: proof.queries.map(q => ({
				bitmap: q.bitmap.toString('hex'),
				key: q.key.toString('hex'),
				value: q.value.toString('hex'),
			})),
			siblingHashes: proof.siblingHashes.map(h => h.toString('hex')),
		};
	}

	public async getGeneratorList(_: RequestContext): Promise<{ list: GeneratorInfo[] }> {
		const stateStore = new StateStore(this._db);
		const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
		const bftVotes = await votesStore.getWithSchema<BFTVotes>(EMPTY_KEY, bftVotesSchema);
		const { height: currentHeight } =
			bftVotes.blockBFTInfos.length > 0 ? bftVotes.blockBFTInfos[0] : { height: 0 };
		const bftStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
		const bftParams = await getBFTParameters(bftStore, currentHeight + 1);
		const slot = this._bftMethod.getSlotNumber(Math.floor(Date.now() / 1000));
		const startTime = this._bftMethod.getSlotTime(slot);
		let nextAllocatedTime = startTime;
		const slotInRound = slot % bftParams.validators.length;
		const generatorsInfo = [];
		for (let i = slotInRound; i < slotInRound + bftParams.validators.length; i += 1) {
			generatorsInfo.push({
				address: address.getLisk32AddressFromAddress(
					bftParams.validators[i % bftParams.validators.length].address,
				),
				nextAllocatedTime,
			});
			nextAllocatedTime += this._bftMethod.blockTime();
		}

		return {
			list: generatorsInfo,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async areHeadersContradicting(context: RequestContext): Promise<{ valid: boolean }> {
		validator.validate<{ header1: string; header2: string }>(
			areHeadersContradictingRequestSchema,
			context.params,
		);

		const bftHeader1 = BlockHeader.fromBytes(Buffer.from(context.params.header1, 'hex'));
		const bftHeader2 = BlockHeader.fromBytes(Buffer.from(context.params.header2, 'hex'));

		if (bftHeader1.id.equals(bftHeader2.id)) {
			return { valid: false };
		}
		return { valid: areDistinctHeadersContradicting(bftHeader1, bftHeader2) };
	}
}
