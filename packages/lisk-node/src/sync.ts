import { Blockchain } from '@liskhq/lisk-blockchain';
import { DPOS } from '@liskhq/lisk-dpos';
import { P2P } from '@liskhq/lisk-p2p';
import { EventEmitter } from 'events';
import * as bunyan from 'bunyan';
import { Observable } from 'rxjs';

export class Sync extends EventEmitter {
	private readonly _blockchain: Blockchain;
	private readonly _dpos: DPOS;
	private readonly _p2p: P2P;
	private readonly _logger: bunyan;
	private _syncing: boolean;
	private _observer?: Observable<string>;

	public constructor(
		blockchain: Blockchain,
		dpos: DPOS,
		p2p: P2P,
		logger: bunyan,
	) {
		super();
		this._blockchain = blockchain;
		this._dpos = dpos;
		this._p2p = p2p;
		this._logger = logger;
		this._syncing = false;
		this._observer = undefined;
	}

	public async start(): Promise<void> {
		this._logger.info('Syncing process started');
		this._observer = new Observable();
		await this._sync();
		await this._dpos.verifyDownloadedBlock(
			this._blockchain.lastBlock,
			this._blockchain.lastBlock,
		);
		this._observer.subscribe();
	}

	public async stop(): Promise<void> {
		this._logger.info('Syncing process stopped');
	}

	public get syncing() {
		return this._syncing;
	}

	private async _sync(): Promise<void> {
		if (this._syncing) {
			return;
		}
		const lastBlock = this._blockchain.lastBlock;
		const { data: responseData } = await this._p2p.request({
			procedure: 'blocks',
			data: {
				lastBlockId: lastBlock.id,
			},
		});
		this._logger.info('recived', responseData);
	}
}
