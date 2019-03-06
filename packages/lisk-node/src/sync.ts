import { Blockchain } from '@liskhq/lisk-blockchain';
import { DPOS } from '@liskhq/lisk-dpos';
import { P2P } from '@liskhq/lisk-p2p';
import * as bunyan from 'bunyan';
import { EventEmitter } from 'events';
import { interval, Observable } from 'rxjs';
import { mergeMap, retry, filter } from 'rxjs/operators';
import { ProtocolBlock } from './type';
import { protocolBlockToDomain } from './utils';

export interface SyncOption {
	readonly interval: number;
	readonly retry: number;
}

const defaultOption = {
	interval: 5000,
	retry: 5,
};

export class Sync extends EventEmitter {
	private readonly _blockchain: Blockchain;
	private readonly _dpos: DPOS;
	private readonly _p2p: P2P;
	private readonly _logger: bunyan;
	private readonly _syncing: boolean;
	private readonly _observer: Observable<void>;

	public constructor(
		blockchain: Blockchain,
		dpos: DPOS,
		p2p: P2P,
		logger: bunyan,
		options: SyncOption = defaultOption,
	) {
		super();
		this._blockchain = blockchain;
		this._dpos = dpos;
		this._p2p = p2p;
		this._logger = logger;
		this._syncing = false;
		this._observer = interval(options.interval)
			.pipe(filter(() => !this._syncing), mergeMap(async () => {
				await this._sync();
			}), retry(options.retry))
	}

	public async start(): Promise<void> {
		this._logger.info('Syncing process started');
		this._observer.subscribe({
			next: () => {
				this._logger.info('Calling next');
			},
			error: (error) => {
				this._logger.error(error, 'Error on syncing');
			},
		});
	}

	public async stop(): Promise<void> {
		this._logger.info('Syncing process stopped');
	}

	public get syncing() {
		return this._syncing;
	}

	private async _sync(): Promise<void> {
		const lastBlock = this._blockchain.lastBlock;
		const { data: responseData } = await this._p2p.request({
			procedure: 'blocks',
			data: {
				lastBlockId: lastBlock.id,
			},
		});
		if (
			typeof responseData === 'object' &&
			responseData !== null &&
			'blocks' in responseData
		) {
			const { blocks: protocolBlocks } = responseData as {
				readonly blocks: ReadonlyArray<ProtocolBlock>;
			};
			const blocks = protocolBlockToDomain(protocolBlocks);
			// tslint:disable-next-line no-loop-statement
			for (const block of blocks) {
				const blockWithHeight = {
					...block,
					height: block.height || this._blockchain.lastBlock.height,
				};
				if (blockWithHeight.height === 1) {
					this._logger.debug('Height 1 received. Ignoring.');
					continue;
				}
				const dposErrors = await this._dpos.verifyDownloadedBlock(
					this._blockchain.lastBlock,
					blockWithHeight,
				);
				if (dposErrors) {
					this._logger.error(dposErrors, 'Failed to verify block with dpos');
					throw dposErrors;
				}
				const rewards = await this._dpos.getRewards(blockWithHeight);
				const blockAddError = await this._blockchain.addBlock(blockWithHeight, rewards);
				if (blockAddError) {
					this._logger.error(blockAddError, 'Failed to add block');
					throw blockAddError;
				}
			}
		}

		return this._sync();
	}
}
