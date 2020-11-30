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
import {
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_TRIED_BUCKET_COUNT,
	DEFAULT_TRIED_BUCKET_SIZE,
	PeerKind,
} from '../constants';
// eslint-disable-next-line import/no-cycle
import { ExistingPeerError } from '../errors';
// eslint-disable-next-line import/no-cycle
import { P2PEnhancedPeerInfo, P2PPeerInfo, PeerLists } from '../types';
// eslint-disable-next-line import/no-cycle
import { assignInternalInfo, PEER_TYPE } from '../utils';
// eslint-disable-next-line import/no-cycle
import { NewList } from './new_list';
// eslint-disable-next-line import/no-cycle
import { TriedList } from './tried_list';
// eslint-disable-next-line import/order
import shuffle = require('lodash.shuffle');
// eslint-disable-next-line @typescript-eslint/no-require-imports

export interface PeerBookConfig {
	readonly sanitizedPeerLists: PeerLists;
	readonly secret: number;
}

export class PeerBook {
	private readonly _newPeers: NewList;
	private readonly _triedPeers: TriedList;
	private readonly _bannedIPs: Set<string>;
	private readonly _blacklistedIPs: Set<string>;
	private readonly _seedPeers: ReadonlyArray<P2PPeerInfo>;
	private readonly _fixedPeers: ReadonlyArray<P2PPeerInfo>;
	private readonly _whitelistedPeers: ReadonlyArray<P2PPeerInfo>;
	private readonly _unbanTimers: Array<NodeJS.Timer | undefined>;
	private readonly _secret: number;

	public constructor({ sanitizedPeerLists, secret }: PeerBookConfig) {
		this._newPeers = new NewList({
			secret,
			numOfBuckets: DEFAULT_NEW_BUCKET_COUNT,
			bucketSize: DEFAULT_NEW_BUCKET_SIZE,
			peerType: PEER_TYPE.NEW_PEER,
		});
		this._triedPeers = new TriedList({
			secret,
			numOfBuckets: DEFAULT_TRIED_BUCKET_COUNT,
			bucketSize: DEFAULT_TRIED_BUCKET_SIZE,
			peerType: PEER_TYPE.TRIED_PEER,
		});

		this._secret = secret;
		this._bannedIPs = new Set([]);
		this._blacklistedIPs = new Set([...sanitizedPeerLists.blacklistedIPs]);
		this._seedPeers = [...sanitizedPeerLists.seedPeers];
		this._fixedPeers = [...sanitizedPeerLists.fixedPeers];
		this._whitelistedPeers = [...sanitizedPeerLists.whitelisted];
		this._unbanTimers = [];

		// Initialize peerBook lists
		const newPeersToAdd = [
			...sanitizedPeerLists.fixedPeers,
			...sanitizedPeerLists.whitelisted,
			...sanitizedPeerLists.previousPeers,
		];

		// Add peers to tried peers if want to re-use previously tried peers
		// According to LIP, add whitelist peers to triedPeer by upgrading them initially.
		newPeersToAdd.forEach(peerInfo => {
			if (!this.hasPeer(peerInfo)) {
				this.addPeer(peerInfo);
			}

			this.upgradePeer(peerInfo);
		});
	}

	public get newPeers(): ReadonlyArray<P2PPeerInfo> {
		return this._newPeers.peerList;
	}

	public get triedPeers(): ReadonlyArray<P2PPeerInfo> {
		return this._triedPeers.peerList;
	}

	public get allPeers(): ReadonlyArray<P2PPeerInfo> {
		return [...this.newPeers, ...this.triedPeers];
	}

	public get seedPeers(): ReadonlyArray<P2PPeerInfo> {
		return this._seedPeers;
	}
	public get fixedPeers(): ReadonlyArray<P2PPeerInfo> {
		return this._fixedPeers;
	}
	public get whitelistedPeers(): ReadonlyArray<P2PPeerInfo> {
		return this._whitelistedPeers;
	}
	public get bannedIPs(): Set<string> {
		return new Set([...this._blacklistedIPs, ...this._bannedIPs]);
	}

	public cleanUpTimers(): void {
		this._unbanTimers.forEach(timer => {
			if (timer) {
				clearTimeout(timer);
			}
		});
	}

	public getRandomizedPeerList(
		minimumPeerDiscoveryThreshold: number,
		maxPeerDiscoveryResponseLength: number,
	): ReadonlyArray<P2PPeerInfo> {
		const allPeers = [...this.newPeers, ...this.triedPeers];

		const min = Math.ceil(Math.min(maxPeerDiscoveryResponseLength, allPeers.length * 0.25));
		const max = Math.floor(Math.min(maxPeerDiscoveryResponseLength, allPeers.length * 0.5));

		const random = Math.floor(Math.random() * (max - min + 1) + min);
		const randomPeerCount = Math.max(
			random,
			Math.min(minimumPeerDiscoveryThreshold, allPeers.length),
		);

		return shuffle(allPeers).slice(0, randomPeerCount);
	}

	public getPeer(peerInfo: P2PPeerInfo): P2PPeerInfo | undefined {
		const triedPeer = this._triedPeers.getPeer(peerInfo.peerId);
		if (triedPeer) {
			return triedPeer;
		}

		return this._newPeers.getPeer(peerInfo.peerId);
	}

	public hasPeer(peerInfo: P2PPeerInfo): boolean {
		return this._triedPeers.hasPeer(peerInfo.peerId) || this._newPeers.hasPeer(peerInfo.peerId);
	}

	public addPeer(peerInfo: P2PEnhancedPeerInfo): boolean {
		if (this._bannedIPs.has(peerInfo.ipAddress)) {
			return false;
		}

		if (this._triedPeers.getPeer(peerInfo.peerId)) {
			throw new ExistingPeerError(peerInfo);
		}

		this._newPeers.addPeer(this._assignPeerKind(peerInfo));

		return true;
	}

	public removePeer(peerInfo: P2PPeerInfo): void {
		this._newPeers.removePeer(peerInfo);
		this._triedPeers.removePeer(peerInfo);
	}

	public updatePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.getPeer(peerInfo.peerId)) {
			return this._triedPeers.updatePeer(this._assignPeerKind(peerInfo));
		}

		if (this._newPeers.getPeer(peerInfo.peerId)) {
			return this._newPeers.updatePeer(this._assignPeerKind(peerInfo));
		}

		return false;
	}

	public upgradePeer(peerInfo: P2PEnhancedPeerInfo): boolean {
		if (this._triedPeers.hasPeer(peerInfo.peerId)) {
			return true;
		}

		if (this._newPeers.hasPeer(peerInfo.peerId)) {
			this.removePeer(peerInfo);

			if (this.bannedIPs.has(peerInfo.ipAddress)) {
				return false;
			}

			this._triedPeers.addPeer(this._assignPeerKind(peerInfo));

			return true;
		}

		return false;
	}

	public downgradePeer(peerInfo: P2PEnhancedPeerInfo): boolean {
		if (this.isTrustedPeer(peerInfo.peerId)) {
			return false;
		}

		if (this._newPeers.hasPeer(peerInfo.peerId)) {
			return this._newPeers.failedConnectionAction(peerInfo);
		}

		if (this._triedPeers.hasPeer(peerInfo.peerId)) {
			const failed = this._triedPeers.failedConnectionAction(peerInfo);
			if (failed) {
				return this.addPeer(peerInfo);
			}
		}

		return false;
	}

	public isTrustedPeer(peerId: string): boolean {
		const isSeedPeer = this.seedPeers.find(peer => peer.peerId === peerId);

		const isWhitelistedPeer = this.whitelistedPeers.find(peer => peer.peerId === peerId);

		const isFixedPeer = this.fixedPeers.find(peer => peer.peerId === peerId);

		return !!isSeedPeer || !!isWhitelistedPeer || !!isFixedPeer;
	}

	public addBannedPeer(peerId: string, peerBanTime: number): void {
		const peerIpAddress = peerId.split(':')[0];

		if (this.bannedIPs.has(peerIpAddress)) {
			return;
		}

		// Whitelisted/FixedPeers are not allowed to be banned
		if (
			this.fixedPeers.find(peer => peer.peerId === peerId) ||
			this.whitelistedPeers.find(peer => peer.peerId === peerId)
		) {
			return;
		}

		this._bannedIPs.add(peerIpAddress);

		this.allPeers.forEach((peer: P2PPeerInfo) => {
			if (peer.ipAddress === peerIpAddress) {
				this.removePeer(peer);
			}
		});

		// Unban temporary bans after peerBanTime
		const unbanTimeout = setTimeout(() => {
			this._removeBannedPeer(peerId);
		}, peerBanTime);

		this._unbanTimers.push(unbanTimeout);
	}

	private _removeBannedPeer(peerId: string): void {
		const peerIpAddress = peerId.split(':')[0];

		this._bannedIPs.delete(peerIpAddress);
	}

	private _assignPeerKind(peerInfo: P2PPeerInfo): P2PPeerInfo {
		if (this.fixedPeers.find(peer => peer.ipAddress === peerInfo.ipAddress)) {
			return {
				...peerInfo,
				internalState: {
					...assignInternalInfo(peerInfo, this._secret),
					peerKind: PeerKind.FIXED_PEER,
				},
			};
		}

		if (this.whitelistedPeers.find(peer => peer.ipAddress === peerInfo.ipAddress)) {
			return {
				...peerInfo,
				internalState: {
					...assignInternalInfo(peerInfo, this._secret),
					peerKind: PeerKind.WHITELISTED_PEER,
				},
			};
		}

		if (this.seedPeers.find(peer => peer.ipAddress === peerInfo.ipAddress)) {
			return {
				...peerInfo,
				internalState: {
					...assignInternalInfo(peerInfo, this._secret),
					peerKind: PeerKind.SEED_PEER,
				},
			};
		}

		return {
			...peerInfo,
			internalState: {
				...assignInternalInfo(peerInfo, this._secret),
				peerKind: PeerKind.NONE,
			},
		};
	}
}
