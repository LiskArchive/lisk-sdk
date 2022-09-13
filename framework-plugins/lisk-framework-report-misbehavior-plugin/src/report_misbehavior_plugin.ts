/*
 * Copyright © 2020 Lisk Foundation
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
	BasePlugin,
	PluginInitContext,
	db as liskDB,
	codec,
	chain,
	cryptography,
	blockHeaderSchema,
} from 'lisk-sdk';
import {
	getDBInstance,
	saveBlockHeaders,
	getContradictingBlockHeader,
	clearBlockHeaders,
} from './db';
import { ReportMisbehaviorPluginConfig, State } from './types';
import { configSchema } from './schemas';
import { Endpoint } from './endpoint';

const { address, ed } = cryptography;
const { BlockHeader, Transaction, TAG_TRANSACTION } = chain;

export class ReportMisbehaviorPlugin extends BasePlugin<ReportMisbehaviorPluginConfig> {
	public configSchema = configSchema;
	public endpoint = new Endpoint();

	private _pluginDB!: liskDB.Database;
	private readonly _state: State = { currentHeight: 0 };
	private _clearBlockHeadersIntervalId!: NodeJS.Timer | undefined;

	public get nodeModulePath(): string {
		return __filename;
	}

	public async init(context: PluginInitContext): Promise<void> {
		await super.init(context);
		this.endpoint.init(this._state, this.config);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(): Promise<void> {
		// TODO: https://github.com/LiskHQ/lisk-sdk/issues/6201
		this._pluginDB = await getDBInstance(this.dataPath);
		// Listen to new block and delete block events
		this._subscribeToChannel();
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._clearBlockHeadersIntervalId = setInterval(() => {
			clearBlockHeaders(this._pluginDB, this._state.currentHeight).catch(error =>
				this.logger.error(error),
			);
		}, this.config.clearBlockHeadersInterval);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async unload(): Promise<void> {
		clearInterval(this._clearBlockHeadersIntervalId as NodeJS.Timer);

		this._pluginDB.close();
	}

	private _subscribeToChannel(): void {
		this.apiClient.subscribe(
			'network_newBlock',
			async (event: Record<string, unknown> | undefined) => {
				if (!event) {
					this.logger.error('Invalid payload for network_newBlock');
					return;
				}

				const { blockHeader: blockHeaderJSON } = event;

				const headerBytes = codec.encodeJSON(
					blockHeaderSchema,
					blockHeaderJSON as Record<string, unknown>,
				);
				try {
					const saved = await saveBlockHeaders(this._pluginDB, headerBytes);
					if (!saved) {
						return;
					}
					const decodedBlockHeader = BlockHeader.fromBytes(headerBytes);

					// Set new currentHeight
					if (decodedBlockHeader.height > this._state.currentHeight) {
						this._state.currentHeight = decodedBlockHeader.height;
					}
					const contradictingBlock = await getContradictingBlockHeader(
						this._pluginDB,
						decodedBlockHeader,
						this.apiClient,
					);
					if (contradictingBlock && this._state.privateKey) {
						const encodedTransaction = await this._createPoMTransaction(
							decodedBlockHeader,
							contradictingBlock,
						);
						const result = await this.apiClient.invoke<{
							transactionId?: string;
						}>('txpool_postTransaction', {
							transaction: encodedTransaction,
						});

						this.logger.debug('Sent Report misbehavior transaction', result.transactionId);
					}
				} catch (error) {
					this.logger.error(error);
				}
			},
		);
	}

	private async _createPoMTransaction(
		contradictingBlock: chain.BlockHeader,
		decodedBlockHeader: chain.BlockHeader,
	): Promise<string> {
		// ModuleID:13 (DPoS), CommandID:3 (PoMCommand)
		const dposMeta = this.apiClient.metadata.find(
			m => m.id === Buffer.from([0, 0, 0, 13]).toString('hex'),
		);
		if (!dposMeta) {
			throw new Error('DPoS module is not registered in the application.');
		}
		const pomParamsInfo = dposMeta.commands.find(
			m => m.id === Buffer.from([0, 0, 0, 3]).toString('hex'),
		);
		if (!pomParamsInfo || !pomParamsInfo.params) {
			throw new Error('PoM params schema is not registered in the application.');
		}

		// Assume passphrase is checked before calling this function
		if (!this._state.publicKey || !this._state.privateKey) {
			throw new Error('Key is not registered.');
		}

		const authAccount = await this.apiClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
			address: address.getAddressFromPublicKey(this._state.publicKey).toString('hex'),
		});

		const pomTransactionParams = {
			header1: decodedBlockHeader,
			header2: contradictingBlock,
		};

		const { chainID } = await this.apiClient.invoke<{ chainID: string }>('system_getNodeInfo');

		const encodedParams = codec.encode(pomParamsInfo.params, pomTransactionParams);

		const tx = new Transaction({
			module: dposMeta.name,
			command: pomParamsInfo.name,
			nonce: BigInt(authAccount.nonce),
			senderPublicKey:
				this._state.publicKey ?? ed.getPublicKeyFromPrivateKey(this._state.privateKey),
			fee: BigInt(this.config.fee), // TODO: The static fee should be replaced by fee estimation calculation
			params: encodedParams,
			signatures: [],
		});

		tx.signatures.push(
			ed.signData(
				TAG_TRANSACTION,
				Buffer.from(chainID, 'hex'),
				tx.getSigningBytes(),
				this._state.privateKey,
			),
		);

		return tx.getBytes().toString('hex');
	}
}
