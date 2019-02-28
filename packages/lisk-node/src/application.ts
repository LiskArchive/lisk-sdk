import { Blockchain } from '@liskhq/lisk-blockchain';
import { DB } from '@liskhq/lisk-db';
import { DPOS } from '@liskhq/lisk-dpos';
import { P2P } from '@liskhq/lisk-p2p';
import * as transactions from '@liskhq/lisk-transactions';
import * as bunyan from 'bunyan';
import * as fs from 'fs';
import * as os from 'os';

export class App {
	private readonly _p2p: P2P;
	private readonly _blockchain: Blockchain;
	private readonly _dpos: DPOS;
	private readonly _db: DB;
	private readonly _logger: bunyan;
	private _started: boolean;

	public constructor() {
		this._started = false;
		this._logger = bunyan.createLogger({ name: 'lisk-node' });
		this._logger.info('Starting application');

		const genesisStr = fs.readFileSync(
			`${__dirname}/../configs/mainnet/genesis_block.json`,
			'utf8',
		);
		this._logger.info('Genesis block file obtained');
		const genesis = JSON.parse(genesisStr);
		this._p2p = new P2P({
			blacklistedPeers: [],
			connectTimeout: 5000,
			seedPeers: [],
			wsEngine: 'ws',
			nodeInfo: {
				wsPort: 40000,
				nethash: genesis.payloadHash,
				version: '1.4.0',
				os: os.platform(),
				height: 0,
			},
		});
		this._db = new DB('./blockchain.db');
		this._logger.info('Database instansiated');
		this._blockchain = new Blockchain(genesis, this._db, {
			0: transactions.TransferTransaction,
			1: transactions.SecondSignatureTransaction,
			2: transactions.DelegateTransaction,
			3: transactions.VoteTransaction,
			4: transactions.MultisignatureTransaction,
			5: transactions.DappTransaction,
			6: transactions.InTransferTransaction,
			7: transactions.OutTransferTransaction,
		});
		this._logger.info('Blockchain instansiated');
		this._dpos = new DPOS(this._db, this._blockchain, {
			numberOfActiveDelegates: 101,
			slotTime: 10,
			epochTime: 0,
		});
		this._logger.info('DPOS instansiated');
	}

	public async init(): Promise<void> {
		this._logger.info('Starting initialization');
		await this._blockchain.init();
		this._logger.info('Blockchain initialized.');
		await this._dpos.getLatestHeight();
		this._started = true;
	}

	public async start(): Promise<void> {
		await this._p2p.start();
	}

	public async stop(): Promise<void> {
		if (this._started) {
			await this._p2p.stop();
		}
	}
}
