import { Blockchain } from '@liskhq/lisk-blockchain';
import { DB } from '@liskhq/lisk-db';
import { DPOS } from '@liskhq/lisk-dpos';
import { P2P } from '@liskhq/lisk-p2p';
import * as transactions from '@liskhq/lisk-transactions';
import * as fs from 'fs';
import * as os from 'os';

export class App {
	private readonly _p2p: P2P;
	private readonly _blockchain: Blockchain;
	private readonly _dpos: DPOS;
	private readonly _db: DB;

	public constructor() {
		const genesisStr = fs.readFileSync(
			'./configs/mainnet/genesis_block.json',
			'utf8',
		);
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
		this._dpos = new DPOS(this._db, this._blockchain, {
			numberOfActiveDelegates: 101,
			slotTime: 10,
			epochTime: 0,
		});
	}

	public async init(): Promise<void> {
		await this._blockchain.init();
		await this._dpos.getLatestHeight();
	}

	public async start(): Promise<void> {
		await this._p2p.start();
	}

	public async stop(): Promise<void> {
		await this._p2p.stop();
	}
}
