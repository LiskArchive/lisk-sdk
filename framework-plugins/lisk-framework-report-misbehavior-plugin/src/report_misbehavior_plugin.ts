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
	BaseChannel,
	PluginInitContext,
	db as liskDB,
	codec,
	validator as liskValidator,
	chain,
	cryptography,
} from 'lisk-sdk';
import {
	getDBInstance,
	saveBlockHeaders,
	getContradictingBlockHeader,
	clearBlockHeaders,
} from './db';
import { ReportMisbehaviorPluginConfig, State } from './types';
import { postBlockEventSchema, configSchema } from './schemas';
import { Endpoint } from './endpoint';

const { getAddressAndPublicKeyFromPassphrase, getAddressFromPassphrase, signData } = cryptography;
const { BlockHeader, Transaction, TAG_TRANSACTION } = chain;
const { validator } = liskValidator;

export class ReportMisbehaviorPlugin extends BasePlugin<ReportMisbehaviorPluginConfig> {
	public name = 'reportMisbehavior';
	public configSchema = configSchema;
	public endpoint = new Endpoint();

	private _pluginDB!: liskDB.KVStore;
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
	public async load(_channel: BaseChannel): Promise<void> {
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

	public async unload(): Promise<void> {
		clearInterval(this._clearBlockHeadersIntervalId as NodeJS.Timer);

		await this._pluginDB.close();
	}

	private _subscribeToChannel(): void {
		this.apiClient.subscribe('app_networkEvent', async (eventData?: Record<string, unknown>) => {
			const { event, data } = eventData as { event: string; data: unknown };

			if (event === 'postBlock') {
				const errors = validator.validate(postBlockEventSchema, data as Record<string, unknown>);
				if (errors.length > 0) {
					this.logger.error(errors, 'Invalid block data');
					return;
				}
				const blockData = data as { block: string };
				const { header } = codec.decode<chain.RawBlock>(
					this.apiClient.schemas.block,
					Buffer.from(blockData.block, 'hex'),
				);
				try {
					const saved = await saveBlockHeaders(this._pluginDB, header);
					if (!saved) {
						return;
					}
					const decodedBlockHeader = BlockHeader.fromBytes(header);

					// Set new currentHeight
					if (decodedBlockHeader.height > this._state.currentHeight) {
						this._state.currentHeight = decodedBlockHeader.height;
					}
					const contradictingBlock = await getContradictingBlockHeader(
						this._pluginDB,
						decodedBlockHeader,
						this.apiClient,
					);
					if (contradictingBlock && this._state.passphrase) {
						const encodedTransaction = await this._createPoMTransaction(
							decodedBlockHeader,
							contradictingBlock,
						);
						const result = await this.apiClient.invoke<{
							transactionId?: string;
						}>('app_postTransaction', {
							transaction: encodedTransaction,
						});

						this.logger.debug('Sent Report misbehavior transaction', result.transactionId);
					}
				} catch (error) {
					this.logger.error(error);
				}
			}
		});
	}

	private async _createPoMTransaction(
		contradictingBlock: chain.BlockHeader,
		decodedBlockHeader: chain.BlockHeader,
	): Promise<string> {
		// ModuleID:5 (DPoS), AssetID:3 (PoMAsset)
		const pomAssetInfo = this.apiClient.schemas.commands.find(
			({ moduleID, commandID }) => moduleID === 5 && commandID === 3,
		);

		if (!pomAssetInfo) {
			throw new Error('PoM asset schema is not registered in the application.');
		}

		// Assume passphrase is checked before calling this function
		const passphrase = this._state.passphrase as string;

		const authAccount = await this.apiClient.invoke<{ nonce: string }>('auth_getAuthAccount', {
			address: getAddressFromPassphrase(passphrase).toString('hex'),
		});

		const pomTransactionParams = {
			header1: decodedBlockHeader,
			header2: contradictingBlock,
		};

		const { networkIdentifier } = await this.apiClient.invoke<{ networkIdentifier: string }>(
			'app_getNodeInfo',
		);

		const encodedParams = codec.encode(pomAssetInfo.schema, pomTransactionParams);

		const tx = new Transaction({
			moduleID: pomAssetInfo.moduleID,
			commandID: pomAssetInfo.commandID,
			nonce: BigInt(authAccount.nonce),
			senderPublicKey:
				this._state.publicKey ?? getAddressAndPublicKeyFromPassphrase(passphrase).publicKey,
			fee: BigInt(this.config.fee), // TODO: The static fee should be replaced by fee estimation calculation
			params: encodedParams,
			signatures: [],
		});

		(tx.signatures as Buffer[]).push(
			signData(
				TAG_TRANSACTION,
				Buffer.from(networkIdentifier, 'hex'),
				tx.getSigningBytes(),
				passphrase,
			),
		);

		return tx.getBytes().toString('hex');
	}
}
