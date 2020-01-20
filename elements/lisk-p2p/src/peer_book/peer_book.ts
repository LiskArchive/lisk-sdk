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
// tslint:disable-next-line no-require-imports
import shuffle = require('lodash.shuffle');

import {
	DEFAULT_NEW_BUCKET_COUNT,
	DEFAULT_NEW_BUCKET_SIZE,
	DEFAULT_TRIED_BUCKET_COUNT,
	DEFAULT_TRIED_BUCKET_SIZE,
} from '../constants';
import { ExistingPeerError } from '../errors';
import { P2PEnhancedPeerInfo, P2PPeerInfo, PeerLists } from '../p2p_types';
import { PEER_TYPE } from '../utils';

import { NewList } from './new_list';
import { TriedList } from './tried_list';

export interface PeerBookConfig {
	readonly sanitizedPeerLists: PeerLists;
	readonly secret: number;
}

export class PeerBook {
	private readonly _newPeers: NewList;
	private readonly _triedPeers: TriedList;
	private readonly _bannedIps: Set<string>;
	private readonly _blacklistedIPs: Set<string>;
	private readonly _seedPeers: ReadonlyArray<P2PPeerInfo>;
	private readonly _fixedPeers: ReadonlyArray<P2PPeerInfo>;
	private readonly _whitelistedPeers: ReadonlyArray<P2PPeerInfo>;
	private readonly _unbanTimers: Array<NodeJS.Timer | undefined>;

	public constructor({
		sanitizedPeerLists: sanitizedPeerLists,
		secret,
	}: PeerBookConfig) {
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

		this._bannedIps = new Set([]);
		this._blacklistedIPs = new Set([...sanitizedPeerLists.blacklistedIPs]);
		this._seedPeers = [...sanitizedPeerLists.seedPeers];
		this._fixedPeers = [...sanitizedPeerLists.fixedPeers];
		this._whitelistedPeers = [...sanitizedPeerLists.whitelisted];
		this._unbanTimers = [];
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
	public get bannedIps(): ReadonlyArray<string> {
		return [...this._blacklistedIPs, ...this._bannedIps];
	}

	public getRandomizedPeerList(
		minimumPeerDiscoveryThreshold: number,
		maxPeerDiscoveryResponseLength: number,
	): ReadonlyArray<P2PPeerInfo> {
		const allPeers = [...this.newPeers, ...this.triedPeers];

		/* tslint:disable no-magic-numbers*/
		const min = Math.ceil(
			Math.min(maxPeerDiscoveryResponseLength, allPeers.length * 0.25),
		);
		const max = Math.floor(
			Math.min(maxPeerDiscoveryResponseLength, allPeers.length * 0.5),
		);

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
		return (
			this._triedPeers.hasPeer(peerInfo.peerId) ||
			this._newPeers.hasPeer(peerInfo.peerId)
		);
	}

	public addPeer(peerInfo: P2PEnhancedPeerInfo): boolean {
		if (this.bannedIps.find(peerIp => peerIp === peerInfo.ipAddress)) {
			return false;
		}

		if (this._triedPeers.getPeer(peerInfo.peerId)) {
			throw new ExistingPeerError(peerInfo);
		}

		this._newPeers.addPeer(peerInfo);

		return true;
	}

	public updatePeer(peerInfo: P2PPeerInfo): boolean {
		if (this._triedPeers.getPeer(peerInfo.peerId)) {
			return this._triedPeers.updatePeer(peerInfo);
		}

		if (this._newPeers.getPeer(peerInfo.peerId)) {
			return this._newPeers.updatePeer(peerInfo);
		}

		return false;
	}

	public removePeer(peerInfo: P2PPeerInfo): void {
		this._newPeers.removePeer(peerInfo);
		this._triedPeers.removePeer(peerInfo);
	}

	public upgradePeer(peerInfo: P2PEnhancedPeerInfo): boolean {
		if (this._triedPeers.hasPeer(peerInfo.peerId)) {
			return true;
		}

		if (this._newPeers.hasPeer(peerInfo.peerId)) {
			this.removePeer(peerInfo);
			this._triedPeers.addPeer(peerInfo);

			return true;
		}

		return false;
	}

	public downgradePeer(peerInfo: P2PEnhancedPeerInfo): boolean {
		if (this._newPeers.hasPeer(peerInfo.peerId)) {
			return this._newPeers.failedConnectionAction(peerInfo);
		}

		if (this._triedPeers.hasPeer(peerInfo.peerId)) {
			const failed = this._triedPeers.failedConnectionAction(peerInfo);
			if (failed) {
				this.addPeer(peerInfo);
			}
		}

		return false;
	}

	public isTrustedPeer(peerId: string): boolean {
		const isSeed = this.seedPeers.find(seedPeer => peerId === seedPeer.peerId);

		const isWhitelisted = this.whitelistedPeers.find(
			peer => peer.peerId === peerId,
		);

		const isFixed = this.fixedPeers.find(peer => peer.peerId === peerId);

		return !!isSeed || !!isWhitelisted || !!isFixed;
	}

	public addBannedPeer(peerId: string, peerBanTime: number): void {
		const peerIpAddress = peerId.split(':')[0];

		if (this.bannedIps.find(peerIp => peerIp === peerIpAddress)) {
			return;
		}

		const isWhitelistedPeer = this.whitelistedPeers.find(
			peer => peer.peerId === peerId,
		);

		const isFixedPeer = this.fixedPeers.find(peer => peer.peerId === peerId);

		// Whitelisted or FixedPeers are not allowed to be banned
		if (isWhitelistedPeer || isFixedPeer) {
			return;
		}

		this._bannedIps.add(peerIpAddress);

		this.allPeers.forEach((peer: P2PPeerInfo) => {
			if (peer.ipAddress === peerIpAddress) {
				this.removePeer(peer);
			}
		});

		// Unban temporary banns after peerBanTime
		const unbanTimeout = setTimeout(() => {
			this._removeBannedPeer(peerId);
		}, peerBanTime);

		this._unbanTimers.push(unbanTimeout);

		return;
	}

	private _removeBannedPeer(peerId: string): void {
		const peerIpAddress = peerId.split(':')[0];

		this._bannedIps.delete(peerIpAddress);
	}

	public cleanUpTimers(): void {
		this._unbanTimers.forEach(timer => {
			if (timer) {
				clearTimeout(timer);
			}
		});
	}
}
