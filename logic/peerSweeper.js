'use strict';

var pgp = require('pg-promise');

// Constructor
function PeerSweeper (scope) {
	this.peers = [];
	this.limit = 500;
	this.scope = scope;

	var self = this;

	setImmediate(function nextSweep () {
		if (self.peers.length) {
			self.sweep(self.peers.splice(0, self.limit), function () {
				return setTimeout(nextSweep, 500);
			});
		} else {
			return setTimeout(nextSweep, 500);
		}
	});
}

// Public methods
PeerSweeper.prototype.push = function (action, peer) {
	if (action) {
		peer.action = action;
	} else {
		throw 'Missing push action';
	}
	if (peer.broadhash != null) {
		peer.broadhash = new Buffer(peer.broadhash, 'hex');
	}
	this.peers.push(peer);
};

PeerSweeper.prototype.sweep = function (peers, cb) {
	var self = this;

	if (!peers.length) { return; }

	self.scope.library.db.tx(function (t) {
		var queries = peers.map(function (peer) {
			return pgp.as.format(self.scope.sql[peer.action], peer);
		});

		return t.query(queries.join(';'));
	}).then(function () {
		self.addDapps(peers);
		self.scope.library.logger.debug(['Swept', peers.length, 'peer changes'].join(' '));

		return setImmediate(cb);
	}).catch(function (err) {
		self.scope.library.logger.error('Failed to sweep peers', err.stack);
		return setImmediate(cb, err);
	});
};

PeerSweeper.prototype.addDapps = function (peers) {
	var self = this;

	peers = peers.filter(function (peer) {
		return peer.action === 'upsert' && peer.dappid;
	});

	if (!peers.length) { return; }

	self.scope.library.db.tx(function (t) {
		var peerPromises = peers.map(function (peer) {
			if (peer.action === 'upsert') {
				return t.query(self.scope.sql.getByIdPort, { ip: peer.ip, port: peer.port });
			}
		});

		return t.batch(peerPromises).then(function (res) {
			for (var i = 0; i < peers.length; i++) {
				var peer = peers[i];
				var row = res[i][0];

				if (row && row.id) {
					peer.id = row.id;
				}
			}

			var queries = peers.map(function (peer) {
				return pgp.as.format(self.scope.sql.addDapp, {
					dappId: peer.dappid,
					peerId: peer.id
				});
			});

			return t.query(queries.join(';'));
		});
	}).then(function () {
		self.scope.library.logger.debug(['Added', peers.length, 'dapp peers'].join(' '));
	}).catch(function (err) {
		self.scope.library.logger.error('Failed to add dapp peers', err.stack);
	});
};

// Export
module.exports = PeerSweeper;
