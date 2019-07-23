/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */
import * as os from 'os';
import { HashMap, InitOptions } from './api_types';
import * as constants from './constants';
import { AccountsResource } from './resources/accounts';
import { BlocksResource } from './resources/blocks';
import { DappsResource } from './resources/dapps';
import { DelegatesResource } from './resources/delegates';
import { NodeResource } from './resources/node';
import { PeersResource } from './resources/peers';
import { SignaturesResource } from './resources/signatures';
import { TransactionsResource } from './resources/transactions';
import { VotersResource } from './resources/voters';
import { VotesResource } from './resources/votes';

const defaultOptions = {
	bannedNodes: [],
	randomizeNodes: true,
};

const commonHeaders: HashMap = {
	Accept: 'application/json',
	'Content-Type': 'application/json',
};

const getClientHeaders = (clientOptions: ClientOptions): HashMap => {
	const { name = '????', version = '????', engine = '????' } = clientOptions;

	const liskElementsInformation =
		'LiskElements/1.0 (+https://github.com/LiskHQ/lisk-elements)';
	const locale: string | undefined =
		process.env.LC_ALL ||
		process.env.LC_MESSAGES ||
		process.env.LANG ||
		process.env.LANGUAGE;
	const systemInformation = `${os.platform()} ${os.release()}; ${os.arch()}${
		locale ? `; ${locale}` : ''
	}`;

	return {
		'User-Agent': `${name}/${version} (${engine}) ${liskElementsInformation} ${systemInformation}`,
	};
};

export interface ClientOptions {
	readonly engine?: string;
	readonly name?: string;
	readonly version?: string;
}

export class APIClient {
	public static get constants(): typeof constants {
		return constants;
	}

	public static createMainnetAPIClient(options?: InitOptions): APIClient {
		return new APIClient(constants.MAINNET_NODES, {
			nethash: constants.MAINNET_NETHASH,
			...options,
		});
	}

	public static createTestnetAPIClient(options?: InitOptions): APIClient {
		return new APIClient(constants.TESTNET_NODES, {
			nethash: constants.TESTNET_NETHASH,
			...options,
		});
	}

	public accounts: AccountsResource;
	public bannedNodes!: ReadonlyArray<string>;
	public blocks: BlocksResource;
	public currentNode!: string;
	public dapps: DappsResource;
	public delegates: DelegatesResource;
	public headers!: HashMap;
	public node: NodeResource;
	public nodes!: ReadonlyArray<string>;
	public peers: PeersResource;
	public randomizeNodes!: boolean;
	public signatures: SignaturesResource;
	public transactions: TransactionsResource;
	public voters: VotersResource;
	public votes: VotesResource;

	public constructor(
		nodes: ReadonlyArray<string>,
		providedOptions: InitOptions = {},
	) {
		this.initialize(nodes, providedOptions);
		this.accounts = new AccountsResource(this);
		this.blocks = new BlocksResource(this);
		this.dapps = new DappsResource(this);
		this.delegates = new DelegatesResource(this);
		this.node = new NodeResource(this);
		this.peers = new PeersResource(this);
		this.signatures = new SignaturesResource(this);
		this.transactions = new TransactionsResource(this);
		this.voters = new VotersResource(this);
		this.votes = new VotesResource(this);
	}

	public banActiveNode(): boolean {
		return this.banNode(this.currentNode);
	}

	public banActiveNodeAndSelect(): boolean {
		const banned = this.banActiveNode();
		if (banned) {
			this.currentNode = this.getNewNode();
		}

		return banned;
	}

	public banNode(node: string): boolean {
		if (!this.isBanned(node)) {
			this.bannedNodes = [...this.bannedNodes, node];

			return true;
		}

		return false;
	}

	public getNewNode(): string {
		const nodes = this.nodes.filter(
			(node: string): boolean => !this.isBanned(node),
		);

		if (nodes.length === 0) {
			throw new Error('Cannot get new node: all nodes have been banned.');
		}

		const randomIndex = Math.floor(Math.random() * nodes.length);

		return nodes[randomIndex];
	}

	public hasAvailableNodes(): boolean {
		return this.nodes.some((node: string): boolean => !this.isBanned(node));
	}

	public initialize(
		nodes: ReadonlyArray<string>,
		providedOptions: InitOptions = {},
	): void {
		if (!Array.isArray(nodes) || nodes.length <= 0) {
			throw new Error('APIClient requires nodes for initialization.');
		}

		if (typeof providedOptions !== 'object' || Array.isArray(providedOptions)) {
			throw new Error(
				'APIClient takes an optional object as the second parameter.',
			);
		}

		const options: InitOptions = { ...defaultOptions, ...providedOptions };

		this.headers = {
			...commonHeaders,
			...(options.nethash ? { nethash: options.nethash } : {}),
			...(options.client ? getClientHeaders(options.client) : {}),
		};

		this.nodes = nodes;
		this.bannedNodes = [...(options.bannedNodes || [])];
		this.currentNode = options.node || this.getNewNode();
		this.randomizeNodes = options.randomizeNodes !== false;
	}

	public isBanned(node: string): boolean {
		return this.bannedNodes.includes(node);
	}
}
