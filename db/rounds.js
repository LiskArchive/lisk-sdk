'use strict';

var PQ = require('pg-promise').ParameterizedQuery;

function RoundsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;
}

var Queries = {
	getMemRounds: 'SELECT "round" FROM mem_round GROUP BY "round"',

	flush: 'DELETE FROM mem_round WHERE "round" = ($1)::bigint;',

	truncateBlocks: 'DELETE FROM blocks WHERE "height" > ($1)::bigint;',

	updateMissedBlocks: function (backwards) {
		return [
			'UPDATE mem_accounts SET "missedblocks" = "missedblocks"',
			(backwards ? '- 1' : '+ 1'),
			'WHERE "address" IN ($1:csv);'
		].join(' ');
	},

	getVotes: 'SELECT d."delegate", d."amount" FROM (SELECT m."delegate", SUM(m."amount") AS "amount", "round" FROM mem_round m GROUP BY m."delegate", m."round") AS d WHERE "round" = ($1)::bigint',

	updateVotes: 'UPDATE mem_accounts SET "vote" = "vote" + ($1)::bigint WHERE "address" = $2;',

	updateBlockId: 'UPDATE mem_accounts SET "blockId" = $1 WHERE "blockId" = $2;',

	summedRound: 'SELECT SUM(r.fee)::bigint AS "fees", ARRAY_AGG(r.reward) AS rewards, ARRAY_AGG(r.pk) AS delegates FROM (SELECT b."totalFee" AS fee, b.reward, ENCODE(b."generatorPublicKey", \'hex\') AS pk FROM blocks b WHERE CEIL(b.height / $1::float)::int = $2 ORDER BY b.height ASC) r;',

	clearRoundSnapshot: 'DROP TABLE IF EXISTS mem_round_snapshot',

	performRoundSnapshot: 'CREATE TABLE mem_round_snapshot AS TABLE mem_round',

	restoreRoundSnapshot: 'INSERT INTO mem_round SELECT * FROM mem_round_snapshot',

	clearVotesSnapshot: 'DROP TABLE IF EXISTS mem_votes_snapshot',

	performVotesSnapshot: 'CREATE TABLE mem_votes_snapshot AS SELECT address, "publicKey", vote FROM mem_accounts WHERE "isDelegate" = 1',

	restoreVotesSnapshot: 'UPDATE mem_accounts m SET vote = b.vote FROM mem_votes_snapshot b WHERE m.address = b.address'
};

RoundsRepo.prototype.getMemRounds = function (task) {
	return (task || this.db).query(Queries.getMemRounds);
};

RoundsRepo.prototype.flush = function (round, task) {
	return (task || this.db).none(Queries.flush, [round]);
};

RoundsRepo.prototype.truncateBlocks = function (height, task) {
	return (task || this.db).none(Queries.truncateBlocks, [height]);
};

RoundsRepo.prototype.updateMissedBlocks = function (backwards, outsiders, task) {
	return (task || this.db).none(Queries.updateMissedBlocks(backwards), [outsiders]);
};

RoundsRepo.prototype.getVotes = function (round, task) {
	return (task || this.db).query(Queries.getVotes, [round]);
};

RoundsRepo.prototype.updateVotes = function (address, amount) {
	return this.pgp.as.format(Queries.updateVotes, [amount, address]);
};

RoundsRepo.prototype.updateBlockId = function (newId, oldId, task) {
	return (task || this.db).none(Queries.updateBlockId, [newId, oldId]);
};

RoundsRepo.prototype.summedRound = function (round, activeDelegates) {
	return this.db.query(Queries.summedRound, [activeDelegates, round]);
};

RoundsRepo.prototype.clearRoundSnapshot = function (task) {
	return (task || this.db).none(Queries.clearRoundSnapshot);
};

RoundsRepo.prototype.performRoundSnapshot = function (task) {
	return (task || this.db).none(Queries.performRoundSnapshot);
};

RoundsRepo.prototype.clearVotesSnapshot = function (task) {
	return (task || this.db).none(Queries.clearVotesSnapshot);
};

RoundsRepo.prototype.performVotesSnapshot = function (task) {
	return (task || this.db).none(Queries.restoreRoundSnapshot);
};

RoundsRepo.prototype.restoreRoundSnapshot = function (task) {
	return (task || this.db).none(Queries.performVotesSnapshot);
};

RoundsRepo.prototype.restoreVotesSnapshot = function (task) {
	return (task || this.db).none(Queries.restoreVotesSnapshot);
};

module.exports = RoundsRepo;
