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

import { encrypt, ed, bls, address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { Batch, Database } from '@liskhq/lisk-db';
import { dataStructures } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import { GeneratorStore } from './generator_store';
import {
	getLastGeneratedInfo,
	isEqualGeneratedInfo,
	isZeroValueGeneratedInfo,
	setLastGeneratedInfo,
} from './generated_info';
import {
	GeneratedInfo,
	GetStatusResponse,
	UpdateStatusRequest,
	updateStatusRequestSchema,
	UpdateStatusResponse,
} from './schemas';
import { Consensus, Keypair, Generator } from './types';
import { RequestContext } from '../rpc/rpc_server';
import { ABI } from '../../abi';

interface EndpointArgs {
	keypair: dataStructures.BufferMap<Keypair>;
	generators: Generator[];
	consensus: Consensus;
	abi: ABI;
}

interface EndpointInit {
	generatorDB: Database;
}

export class Endpoint {
	[key: string]: unknown;

	private readonly _keypairs: dataStructures.BufferMap<Keypair>;
	private readonly _generators: Generator[];
	private readonly _consensus: Consensus;

	private _generatorDB!: Database;

	public constructor(args: EndpointArgs) {
		this._keypairs = args.keypair;
		this._generators = args.generators;
		this._consensus = args.consensus;
		this._abi = args.abi;
	}

	public init(args: EndpointInit) {
		this._generatorDB = args.generatorDB;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getStatus(_context: RequestContext): Promise<GetStatusResponse> {
		const status: GetStatusResponse = [];
		for (const gen of this._generators) {
			status.push({
				address: gen.address.toString('hex'),
				enabled: this._keypairs.has(gen.address),
			});
		}
		return status;
	}

	public async updateStatus(ctx: RequestContext): Promise<UpdateStatusResponse> {
		validator.validate(updateStatusRequestSchema, ctx.params);

		const req = (ctx.params as unknown) as UpdateStatusRequest;
		const address = Buffer.from(req.address, 'hex');
		const encryptedGenerator = this._generators.find(item => item.address.equals(address));

		let passphrase: string;

		if (!encryptedGenerator) {
			throw new Error(`Generator with address: ${req.address} not found.`);
		}

		try {
			passphrase = await encrypt.decryptMessageWithPassword(
				encrypt.parseEncryptedMessage(encryptedGenerator.encryptedPassphrase),
				req.password,
				'utf-8',
			);
		} catch (e) {
			throw new Error('Invalid password and public key combination.');
		}

		const blsSK = bls.generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
		const keypair = {
			...ed.getPrivateAndPublicKeyFromPassphrase(passphrase),
			blsSecretKey: blsSK,
		};

		if (
			!cryptoAddress
				.getAddressFromPublicKey(keypair.publicKey)
				.equals(Buffer.from(req.address, 'hex'))
		) {
			throw new Error(
				`Invalid keypair: ${cryptoAddress
					.getAddressFromPublicKey(keypair.publicKey)
					.toString('hex')}  and address: ${req.address} combination`,
			);
		}

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

		const generatorStore = new GeneratorStore(this._generatorDB);
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

		if (req.overwrite !== true) {
			if (lastGeneratedInfo !== undefined && !isEqualGeneratedInfo(req, lastGeneratedInfo)) {
				throw new Error('Request does not match last generated information.');
			}
			if (lastGeneratedInfo === undefined && !isZeroValueGeneratedInfo(req)) {
				throw new Error('Last generated information does not exist.');
			}
		}

		if (
			lastGeneratedInfo === undefined ||
			(req.overwrite === true &&
				lastGeneratedInfo !== undefined &&
				!isEqualGeneratedInfo(req, lastGeneratedInfo))
		) {
			await setLastGeneratedInfo(generatorStore, Buffer.from(req.address, 'hex'), req);
		}

		const batch = new Batch();
		generatorStore.finalize(batch);
		await this._generatorDB.write(batch);

		// Enable delegate to forge by adding keypairs corresponding to address
		this._keypairs.set(address, keypair);
		ctx.logger.info(`Block generation enabled on address: ${req.address}`);

		return {
			address: req.address,
			enabled: true,
		};
	}
}
