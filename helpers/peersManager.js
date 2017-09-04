'use strict';

function PeersManager () {

	this.peers = {};
	this.addressToNonceMap = {};
	this.nonceToAddressMap = {};
}

PeersManager.prototype.add = function (peer) {
	// 1. do not add peers without address
	// 2. prevent changing address by the peer with same nonce
	if (!peer || !peer.string || this.nonceToAddressMap[peer.nonce] && peer.string !== this.nonceToAddressMap[peer.nonce]) {
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

PeersManager.prototype.remove = function (peer) {
	if (!peer || !this.peers[peer.string]) {
		return false;
	}
	this.nonceToAddressMap[peer.nonce] = null;
	delete this.nonceToAddressMap[peer.nonce];

	this.addressToNonceMap[peer.string] = null;
	delete this.addressToNonceMap[peer.string];

	this.peers[peer.string] = null;
	delete this.peers[peer.string];

	return true;
};

PeersManager.prototype.update = function (peer) {
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
	return true;
};

PeersManager.prototype.getAll = function () {
	return this.peers;
};

PeersManager.prototype.getByAddress = function (address) {
	return this.peers[address];
};

PeersManager.prototype.getByNonce = function (nonce) {
	return this.peers[this.nonceToAddressMap[nonce]];
};

PeersManager.prototype.getNonce = function (address) {
	return this.addressToNonceMap[address];
};

PeersManager.prototype.getAddress = function (nonce) {
	return this.nonceToAddressMap[nonce];
};

module.exports = new PeersManager();
