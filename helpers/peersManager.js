'use strict';

function PeersManager () {

	this.peers = {};
	this.addressToNonceMap = {};
	this.nonceToAddressMap = {};

	this.add = function (peer) {
		// 1. do not add peers without address
		// 2. prevent changing address by the peer with same nonce
		if (!peer.string || this.nonceToAddressMap[peer.nonce] && peer.string !== this.nonceToAddressMap[peer.nonce]) {
			return false;
		}
		if (this.peers[peer.string]) {
			return this.update(peer);
		}
		this.peers[peer.string] = peer;
		this.addressToNonceMap[peer.string] = peer.nonce;
		if (peer.nonce) {
			this.nonceToAddressMap[peer.nonce] = peer.string;
		}
		return true;
	};

	this.remove = function (peer) {
		this.nonceToAddressMap[peer.nonce] = null;
		delete this.nonceToAddressMap[peer.nonce];

		this.addressToNonceMap[peer.string] = null;
		delete this.addressToNonceMap[peer.string];

		this.peers[peer.string] = null;
		delete this.peers[peer.string];
	};

	this.update = function (peer) {
		var oldNonce = this.addressToNonceMap[peer.string];
		var oldAddress = this.nonceToAddressMap[oldNonce];
		if (oldNonce) {
			this.nonceToAddressMap[oldNonce] = null;
			delete this.nonceToAddressMap[oldNonce];
		}
		if (oldAddress) {
			this.addressToNonceMap[oldAddress] = null;
			delete this.addressToNonceMap[oldAddress];

			this.peers[oldAddress] = null;
			delete this.peers[oldAddress];
		}
		this.add(peer);
	};

	this.getAll = function () {
		return this.peers;
	};

	this.getByAddress = function (address) {
		return this.peers[address];
	};

	this.getByNonce = function (nonce) {
		return this.peers[this.nonceToAddressMap[nonce]];
	};

	this.getNonce = function (address) {
		return this.addressToNonceMap[address];
	};

	this.getAddress = function (nonce) {
		return this.nonceToAddressMap[nonce];
	};

}

module.exports = PeersManager;
