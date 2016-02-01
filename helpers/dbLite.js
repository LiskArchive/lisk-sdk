var dblite = require('dblite');
var async = require('async');
var path = require('path');

var isWin = /^win/.test(process.platform);
var isMac = /^darwin/.test(process.platform);

// dblite.bin = path.join(process.cwd(), 'sqlite3', 'sqlite3');

module.exports.connect = function (connectString, cb) {
	var db = dblite(connectString);
	var sql = [
		"CREATE TABLE IF NOT EXISTS blocks (id VARCHAR(20) PRIMARY KEY, version INT NOT NULL, timestamp INT NOT NULL, height INT NOT NULL, previousBlock VARCHAR(20), numberOfTransactions INT NOT NULL, totalAmount BIGINT NOT NULL, totalFee BIGINT NOT NULL, reward BIGINT NOT NULL, payloadLength INT NOT NULL, payloadHash BINARY(32) NOT NULL, generatorPublicKey BINARY(32) NOT NULL, blockSignature BINARY(64) NOT NULL, FOREIGN KEY ( previousBlock ) REFERENCES blocks ( id ) ON DELETE SET NULL)",
		"CREATE TABLE IF NOT EXISTS trs (id VARCHAR(20) PRIMARY KEY, blockId VARCHAR(20) NOT NULL, type TINYINT NOT NULL, timestamp INT NOT NULL, senderPublicKey BINARY(32) NOT NULL, senderId VARCHAR(21) NOT NULL, recipientId VARCHAR(21), senderUsername VARCHAR(20), recipientUsername VARCHAR(20), amount BIGINT NOT NULL, fee BIGINT NOT NULL, signature BINARY(64) NOT NULL, signSignature BINARY(64), requesterPublicKey BINARY(32), signatures TEXT, FOREIGN KEY(blockId) REFERENCES blocks(id) ON DELETE CASCADE)",
		"CREATE TABLE IF NOT EXISTS signatures (transactionId VARCHAR(20) NOT NULL PRIMARY KEY, publicKey BINARY(32) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
		"CREATE TABLE IF NOT EXISTS delegates(username VARCHAR(20) NOT NULL, transactionId VARCHAR(20) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
		"CREATE TABLE IF NOT EXISTS votes(votes TEXT, transactionId VARCHAR(20) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
		"CREATE TABLE IF NOT EXISTS usernames(username VARCHAR(20) NOT NULL, transactionId VARCHAR(20) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
		"CREATE TABLE IF NOT EXISTS contacts(address VARCHAR(21) NOT NULL, transactionId VARCHAR(20) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
		"CREATE TABLE IF NOT EXISTS forks_stat(delegatePublicKey BINARY(32) NOT NULL, blockTimestamp INT NOT NULL, blockId VARCHAR(20) NOT NULL, blockHeight INT NOT NULL, previousBlock VARCHAR(20) NOT NULL, cause INT NOT NULL)",
		"CREATE TABLE IF NOT EXISTS multisignatures(min INT NOT NULL, lifetime INT NOT NULL, keysgroup TEXT NOT NULL, transactionId  VARCHAR(20) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
		"CREATe TABLE IF NOT EXISTS dapps(transactionId VARCHAR(20) NOT NULL, name VARCHAR(32) NOT NULL, description VARCHARH(160), tags VARCHARH(160), siaAscii TEXT, siaIcon TEXT, git TEXT, type INTEGER NOT NULL, category INTEGER NOT NULL, icon TEXT, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
		"CREATE TABLE IF NOT EXISTS intransfer(dappId VARCHAR(20) NOT NULL, transactionId VARCHAR(20) NOT NULL, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
		"CREATE TABLE IF NOT EXISTS sia_peers(ip INTEGER NOT NULL PRIMARY KEY, port TINYINT NOT NULL)",
		"CREATe TABLE IF NOT EXISTS outtransfer(transactionId VARCHAR(20) NOT NULL, dappId VARCHAR(20) NOT NULL, outTransactionId VARCHAR(20) NOT NULL UNIQUE, FOREIGN KEY(transactionId) REFERENCES trs(id) ON DELETE CASCADE)",
		"CREATE TABLE IF NOT EXISTS peers (id INTEGER NOT NULL PRIMARY KEY, ip INTEGER NOT NULL, port TINYINT NOT NULL, state TINYINT NOT NULL, os VARCHAR(64), sharePort TINYINT NOT NULL, version VARCHAR(11), clock INT)",
		"CREATE TABLE IF NOT EXISTS peers_dapp (peerId INT NOT NULL, dappid VARCHAR(20) NOT NULL, FOREIGN KEY(peerId) REFERENCES peers(id) ON DELETE CASCADE)",
		// Indexes
		"CREATE UNIQUE INDEX IF NOT EXISTS blocks_height ON blocks(height)",
		"CREATE UNIQUE INDEX IF NOT EXISTS blocks_previousBlock ON blocks(previousBlock)",
		"CREATE UNIQUE INDEX IF Not EXISTS out_transaction_id ON outtransfer(outTransactionId)",
		"CREATE UNIQUE INDEX IF NOT EXISTS peers_unique ON peers(ip, port)",
		"CREATE UNIQUE INDEX IF NOT EXISTS peers_dapp_unique ON peers_dapp(peerId, dappid)",
		"CREATE INDEX IF NOT EXISTS blocks_generator_public_key ON blocks(generatorPublicKey)",
		"CREATE INDEX IF NOT EXISTS blocks_reward ON blocks(reward)",
		"CREATE INDEX IF NOT EXISTS blocks_totalFee ON blocks(totalFee)",
		"CREATE INDEX IF NOT EXISTS blocks_totalAmount ON blocks(totalAmount)",
		"CREATE INDEX IF NOT EXISTS blocks_numberOfTransactions ON blocks(numberOfTransactions)",
		"CREATE INDEX IF NOT EXISTS blocks_timestamp ON blocks(timestamp)",
		"CREATE INDEX IF NOT EXISTS trs_block_id ON trs(blockId)",
		"CREATE INDEX IF NOT EXISTS trs_sender_id ON trs(senderId)",
		"CREATE INDEX IF NOT EXISTS trs_recipient_id ON trs(recipientId)",
		"CREATE INDEX IF NOT EXISTS trs_senderPublicKey on trs(senderPublicKey)",
		"CREATE INDEX IF NOT EXISTS trs_senderUsername on trs(senderUsername)",
		"CREATE INDEX IF NOT EXISTS trs_recipientUsername on trs(recipientUsername)",
		"CREATE INDEX IF NOT EXISTS trs_type on trs(type)",
		"CREATE INDEX IF NOT EXISTS trs_timestamp on trs(timestamp)",
		"CREATE INDEX IF NOT EXISTS signatures_trs_id ON signatures(transactionId)",
		"CREATE INDEX IF NOT EXISTS usernames_trs_id ON usernames(transactionId)",
		"CREATE INDEX IF NOT EXISTS votes_trs_id ON votes(transactionId)",
		"CREATE INDEX IF NOT EXISTS delegates_trs_id ON delegates(transactionId)",
		"CREATE INDEX IF NOT EXISTS contacts_trs_id ON contacts(transactionId)",
		"CREATE INDEX IF NOT EXISTS multisignatures_trs_id ON multisignatures(transactionId)",
		"CREATE INDEX IF NOT EXISTS dapps_trs_id ON dapps(transactionId)",
		"CREATE INDEX IF NOT EXISTS dapps_name ON dapps(name)",
		"CREATE INDEX IF NOT EXISTS sia_peers_unique ON sia_peers(ip, port)",
		"PRAGMA foreign_keys = ON",
		"PRAGMA synchronous=OFF",
		"PRAGMA journal_mode=MEMORY",
		"PRAGMA default_cache_size=10000",
		"PRAGMA locking_mode=EXCLUSIVE"
	];

	var post = [
		"UPDATE peers SET state = 1, clock = null where state != 0"
	];

	async.eachSeries(sql, function (command, cb) {
		db.query(command, function (err, data) {
			cb(err, data);
		});
	}, function (err) {
		if (err) {
			return cb(err);
		}

		var migration = {};

		db.query("PRAGMA user_version", function (err, rows) {
			if (err) {
				return cb(err);
			}

			var currentVersion = rows[0] || 0;

			var nextVersions = Object.keys(migration).sort().filter(function (ver) {
				return ver > currentVersion;
			});

			async.eachSeries(nextVersions, function (ver, cb) {
				async.eachSeries(migration[ver], function (command, cb) {
					db.query(command, function (err, data) {
						cb(err, data);
					});
				}, function (err) {
					if (err) {
						return cb(err);
					}

					db.query("PRAGMA user_version = " + ver, function (err, data) {
						cb(err, data);
					});
				});
			}, function (err) {
				if (err) {
					return cb(err);
				}

				async.eachSeries(post, function (command, cb) {
					db.query(command, function (err, data) {
						cb(err, data);
					});
				}, function (err) {
					cb(err, db);
				});
			});
		});
	});
}
