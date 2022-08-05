/*
 * Copyright © 2021 Lisk Foundation
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

import { encrypt } from '@liskhq/lisk-cryptography';
import { Batch, Database } from '@liskhq/lisk-db';
import { dataStructures } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { Chain } from '@liskhq/lisk-chain';
import { GeneratorStore } from './generator_store';
import {
	generatorKeysExist,
	getAllGeneratorKeys,
	getGeneratedInfo,
	getGeneratorKeys,
	getLastGeneratedInfo,
	isEqualGeneratedInfo,
	isZeroValueGeneratedInfo,
	setGeneratorKey,
	setLastGeneratedInfo,
} from './generated_info';
import {
	encryptedMessageSchema,
	EstimateSafeStatusRequest,
	estimateSafeStatusRequestSchema,
	EstimateSafeStatusResponse,
	GeneratedInfo,
	GetStatusResponse,
	HasKeysRequest,
	hasKeysRequestSchema,
	plainGeneratorKeysSchema,
	SetKeysRequest,
	setKeysRequestSchema,
	SetStatusRequest,
	setStatusRequestSchema,
	UpdateStatusRequest,
	updateStatusRequestSchema,
	UpdateStatusResponse,
} from './schemas';
import { Consensus, GeneratorKeys, PlainGeneratorKeyData } from './types';
import { RequestContext } from '../rpc/rpc_server';
import { ABI } from '../../abi';
import { JSONObject } from '../../types';
import { NotFoundError } from './errors';

interface EndpointArgs {
	keypair: dataStructures.BufferMap<PlainGeneratorKeyData>;
	consensus: Consensus;
	chain: Chain;
	blockTime: number;
	abi: ABI;
}

interface EndpointInit {
	generatorDB: Database;
}

export class Endpoint {
	[key: string]: unknown;

	private readonly _keypairs: dataStructures.BufferMap<PlainGeneratorKeyData>;
	private readonly _consensus: Consensus;
	private readonly _chain: Chain;
	private readonly _blockTime: number;

	private _generatorDB!: Database;

	public constructor(args: EndpointArgs) {
		this._keypairs = args.keypair;
		this._consensus = args.consensus;
		this._abi = args.abi;
		this._chain = args.chain;
		this._blockTime = args.blockTime;
	}

	public init(args: EndpointInit) {
		this._generatorDB = args.generatorDB;
	}

	public async getStatus(_context: RequestContext): Promise<GetStatusResponse> {
		const generatorStore = new GeneratorStore(this._generatorDB);
		const list = await getGeneratedInfo(generatorStore);
		const status = [];
		for (const info of list) {
			status.push({
				...info,
				address: info.address.toString('hex'),
				enabled: this._keypairs.has(info.address),
			});
		}
		return { status };
	}

	public async setStatus(ctx: RequestContext): Promise<void> {
		validator.validate<SetStatusRequest>(setStatusRequestSchema, ctx.params);
		const req = ctx.params;
		const address = Buffer.from(req.address, 'hex');
		const generatorStore = new GeneratorStore(this._generatorDB);
		const keysExist = await generatorKeysExist(generatorStore, address);
		if (!keysExist) {
			throw new Error(`Keys for ${address.toString('hex')} is not registered.`);
		}
		const batch = new Batch();
		await setLastGeneratedInfo(generatorStore, address, req);
		generatorStore.finalize(batch);
		await this._generatorDB.write(batch);
	}

	public async updateStatus(ctx: RequestContext): Promise<UpdateStatusResponse> {
		validator.validate<UpdateStatusRequest>(updateStatusRequestSchema, ctx.params);

		const req = ctx.params;
		const address = Buffer.from(req.address, 'hex');
		const generatorStore = new GeneratorStore(this._generatorDB);
		let generatorKeys: GeneratorKeys;
		try {
			generatorKeys = await getGeneratorKeys(generatorStore, address);
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw new Error(
					`Generator with address: ${address.toString('hex')} does not have keys registered.`,
				);
			}
			throw error;
		}

		let decryptedKeys: PlainGeneratorKeyData;
		if (generatorKeys.type === 'plain') {
			decryptedKeys = generatorKeys.data;
		} else {
			const decryptedBytes = await encrypt.decryptAES256GCMWithPassword(
				generatorKeys.data,
				req.password,
			);
			decryptedKeys = codec.decode<PlainGeneratorKeyData>(plainGeneratorKeysSchema, decryptedBytes);
		}

		// Before disabling, above ensure decrypt is successful
		if (!req.enable) {
			// Disable delegate by removing keypairs corresponding to address
			this._keypairs.delete(Buffer.from(req.address, 'hex'));
			ctx.logger.info(`Forging disabled on account: ${req.address}`);
			return {
				address: req.address,
				enabled: false,
			};
		}

		const synced = this._consensus.isSynced(req.height, req.maxHeightPrevoted);
		if (!synced) {
			throw new Error('Failed to enable forging as the node is not synced to the network.');
		}

		// check
		let lastGeneratedInfo: GeneratedInfo | undefined;
		try {
			lastGeneratedInfo = await getLastGeneratedInfo(
				generatorStore,
				Buffer.from(req.address, 'hex'),
			);
		} catch (error) {
			ctx.logger.debug(`Last generated information does not exist for address: ${req.address}`);
		}

		if (lastGeneratedInfo !== undefined && !isEqualGeneratedInfo(req, lastGeneratedInfo)) {
			throw new Error('Request does not match last generated information.');
		}
		if (lastGeneratedInfo === undefined && !isZeroValueGeneratedInfo(req)) {
			throw new Error('Last generated information does not exist.');
		}

		if (lastGeneratedInfo === undefined) {
			await setLastGeneratedInfo(generatorStore, Buffer.from(req.address, 'hex'), req);
		}

		// Enable delegate to forge by adding keypairs corresponding to address
		this._keypairs.set(address, decryptedKeys);
		ctx.logger.info(`Block generation enabled on address: ${req.address}`);

		return {
			address: req.address,
			enabled: true,
		};
	}

	// Estimate safe status based on the algorithm below
	// https://github.com/LiskHQ/lips/blob/1e053b12aa126c590d32f617feba4317dc00afeb/proposals/lip-0014.md?plain=1#L727
	public async estimateSafeStatus(ctx: RequestContext): Promise<EstimateSafeStatusResponse> {
		validator.validate<EstimateSafeStatusRequest>(estimateSafeStatusRequestSchema, ctx.params);

		const req = ctx.params;

		const finalizedHeight = this._consensus.finalizedHeight();

		const finalizedBlock = await this._chain.dataAccess.getBlockHeaderByHeight(finalizedHeight);
		if (finalizedBlock.timestamp < req.timeShutdown) {
			throw new Error(`A block at the time shutdown ${req.timeShutdown} must be finalized.`);
		}

		// assume there is 30 days per month
		const numberOfBlocksPerMonth = Math.ceil((60 * 60 * 24 * 30) / this._blockTime);
		const heightOneMonthAgo = Math.max(finalizedHeight - numberOfBlocksPerMonth, 0);
		const blockHeaderLastMonth = await this._chain.dataAccess.getBlockHeaderByHeight(
			heightOneMonthAgo,
		);
		const missedBlocks =
			Math.ceil((finalizedBlock.timestamp - blockHeaderLastMonth.timestamp) / this._blockTime) -
			(finalizedBlock.height - blockHeaderLastMonth.height);

		const safeGeneratedHeight = finalizedHeight + missedBlocks;

		return {
			height: safeGeneratedHeight,
			maxHeightGenerated: safeGeneratedHeight,
			maxHeightPrevoted: safeGeneratedHeight,
		};
	}

	public async setKeys(ctx: RequestContext): Promise<void> {
		validator.validate<SetKeysRequest>(setKeysRequestSchema, ctx.params);

		let generatorKeys: GeneratorKeys;
		if (ctx.params.type === 'plain') {
			generatorKeys = {
				address: Buffer.from(ctx.params.address, 'hex'),
				type: ctx.params.type,
				data: codec.fromJSON<PlainGeneratorKeyData>(plainGeneratorKeysSchema, ctx.params.data),
			};
		} else {
			generatorKeys = {
				address: Buffer.from(ctx.params.address, 'hex'),
				type: ctx.params.type,
				data: codec.fromJSON<encrypt.EncryptedMessageObject>(
					encryptedMessageSchema,
					ctx.params.data,
				),
			};
		}

		const generatorStore = new GeneratorStore(this._generatorDB);
		const batch = new Batch();
		await setGeneratorKey(generatorStore, Buffer.from(ctx.params.address, 'hex'), generatorKeys);
		generatorStore.finalize(batch);
		await this._generatorDB.write(batch);
	}

	public async getAllKeys(_ctx: RequestContext): Promise<{ keys: JSONObject<GeneratorKeys>[] }> {
		const generatorStore = new GeneratorStore(this._generatorDB);
		const keys = await getAllGeneratorKeys(generatorStore);

		const jsonKeys = [];
		for (const key of keys) {
			if (key.type === 'plain') {
				jsonKeys.push({
					address: key.address.toString('hex'),
					type: key.type,
					data: codec.toJSON<JSONObject<PlainGeneratorKeyData>>(plainGeneratorKeysSchema, key.data),
				});
			} else {
				jsonKeys.push({
					address: key.address.toString('hex'),
					type: key.type,
					data: key.data,
				});
			}
		}
		return {
			keys: jsonKeys,
		};
	}

	public async hasKeys(ctx: RequestContext): Promise<{ hasKey: boolean }> {
		validator.validate<HasKeysRequest>(hasKeysRequestSchema, ctx.params);
		const generatorStore = new GeneratorStore(this._generatorDB);
		const keysExist = await generatorKeysExist(
			generatorStore,
			Buffer.from(ctx.params.address, 'hex'),
		);

		return {
			hasKey: keysExist,
		};
	}
}
