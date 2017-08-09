BEGIN;

-- Consistency checks - 'mem_accounts' against blockchain
DO $$
DECLARE
	diff int;
BEGIN
	RAISE NOTICE 'Rounds rewrite migration, please wait...';
	SELECT COUNT(1) FROM validateMemBalances() INTO diff;

	IF diff > 0 THEN
		RAISE check_violation USING MESSAGE = 'Migration failed, mem_accounts are inconsistent';
	END IF;
END $$;

-- Rename table 'delegates' to 'delegates_old'
ALTER TABLE delegates RENAME TO delegates_old;

-- Create table 'delegates'
CREATE TABLE IF NOT EXISTS "delegates" (
	"tx_id" VARCHAR(20) REFERENCES trs(id) ON DELETE CASCADE,
	"name" VARCHAR(20) NOT NULL UNIQUE,
	"pk" BYTEA NOT NULL UNIQUE,
	"address" VARCHAR(22) NOT NULL UNIQUE,
	"rank" INT DEFAULT NULL,
	"fees" BIGINT NOT NULL DEFAULT 0,
	"rewards" BIGINT NOT NULL DEFAULT 0,
	"voters_balance" BIGINT NOT NULL DEFAULT 0,
	"voters_cnt" INT NOT NULL DEFAULT 0,
	"blocks_forged_cnt" INT NOT NULL DEFAULT 0,
	"blocks_missed_cnt" INT NOT NULL DEFAULT 0
);

-- Populate 'delegates' table from blockchain ('delegates_old', 'trs')
INSERT INTO delegates (tx_id, name, pk, address) (SELECT t.id, d.username, t."senderPublicKey", t."senderId" FROM delegates_old d LEFT JOIN trs t ON t.id = d."transactionId");

-- Set rewards and fees from blockchain ('rounds_rewards')
WITH new AS (SELECT pk, SUM(reward) AS rewards, SUM(fees) AS fees FROM rounds_rewards GROUP BY pk)
UPDATE delegates SET rewards = new.rewards, fees = new.fees FROM new WHERE delegates.pk = new.pk;

-- Set blocks_forged_cnt from blockchain ('blocks')
WITH new AS (SELECT "generatorPublicKey" AS pk, COUNT(1) AS cnt FROM blocks GROUP BY "generatorPublicKey")
UPDATE delegates SET blocks_forged_cnt = new.cnt FROM new WHERE delegates.pk = new.pk;

-- Set blocks_missed_cnt  from blockchain ('mem_accounts')
WITH new AS (SELECT "publicKey" AS pk, missedblocks FROM mem_accounts)
UPDATE delegates SET blocks_missed_cnt = new.missedblocks FROM new WHERE delegates.pk = new.pk;

-- Create table 'votes_details'
CREATE TABLE IF NOT EXISTS "votes_details"(
	"tx_id" VARCHAR(20) REFERENCES trs(id) ON DELETE CASCADE,
	"voter_address" VARCHAR(22) NOT NULL,
	"type" VARCHAR(3) NOT NULL,
	"timestamp" INT NOT NULL,
	"height" INT NOT NULL,
	"delegate_pk" BYTEA REFERENCES delegates(pk) ON DELETE CASCADE
);

-- Populate 'votes_details' table from blockchain ('votes', 'trs', 'blocks')
INSERT INTO votes_details
SELECT r.tx_id, r.voter_address, (CASE WHEN substring(vote, 1, 1) = '+' THEN 'add' ELSE 'rem' END) AS type, r.timestamp, r.height, DECODE(substring(vote, 2), 'hex') AS delegate_pk FROM (
	SELECT v."transactionId" AS tx_id, t."senderId" AS voter_address, b.timestamp AS timestamp, b.height, regexp_split_to_table(v.votes, ',') AS vote
	FROM votes v, trs t, blocks b WHERE v."transactionId" = t.id AND b.id = t."blockId"
) AS r ORDER BY r.timestamp ASC;

-- Create function for inserting votes details
CREATE FUNCTION vote_insert() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	BEGIN
		INSERT INTO votes_details
		SELECT r.tx_id, r.voter_address, (CASE WHEN substring(vote, 1, 1) = '+' THEN 'add' ELSE 'rem' END) AS type, r.timestamp, r.height, DECODE(substring(vote, 2), 'hex') AS delegate_pk FROM (
			SELECT v."transactionId" AS tx_id, t."senderId" AS voter_address, b.timestamp AS timestamp, b.height, regexp_split_to_table(v.votes, ',') AS vote
			FROM votes v, trs t, blocks b WHERE v."transactionId" = NEW."transactionId" AND v."transactionId" = t.id AND b.id = t."blockId"
		) AS r ORDER BY r.timestamp ASC;
	RETURN NULL;
END $$;

-- Create trigger that will execute 'vote_insert' after insertion of new vote
CREATE TRIGGER vote_insert
	AFTER INSERT ON votes
	FOR EACH ROW
	EXECUTE PROCEDURE vote_insert();

-- Create indexes on 'votes_details'
CREATE INDEX votes_details_voter_address ON votes_details(voter_address);
CREATE INDEX votes_details_type          ON votes_details(type);
CREATE INDEX votes_details_height        ON votes_details(height);
CREATE INDEX votes_details_sort          ON votes_details(voter_address ASC, timestamp DESC);
CREATE INDEX votes_details_dpk           ON votes_details(delegate_pk);

-- Create function 'delegates_voters_cnt_update' for updating voters_cnt from blockchain ('votes_details', 'blocks')
CREATE FUNCTION delegates_voters_cnt_update() RETURNS TABLE(updated INT) LANGUAGE PLPGSQL AS $$
	BEGIN
		RETURN QUERY
			WITH
			last_round AS (SELECT (CASE WHEN height < 101 THEN 1 ELSE height END) AS height FROM blocks WHERE height % 101 = 0 OR height = 1 ORDER BY height DESC LIMIT 1),
			updated AS (UPDATE delegates SET voters_cnt = cnt FROM
			(SELECT
				d.pk,
				(SELECT COUNT(1) AS cnt FROM
					(SELECT DISTINCT ON (voter_address) voter_address, delegate_pk, type FROM votes_details
						WHERE delegate_pk = d.pk AND height <= (SELECT height FROM last_round)
						ORDER BY voter_address, timestamp DESC
					) v WHERE type = 'add'
				) FROM delegates d
			) dd WHERE delegates.pk = dd.pk RETURNING 1)
			SELECT COUNT(1)::INT FROM updated;
END $$;

-- Execute 'delegates_voters_cnt_update'
SELECT delegates_voters_cnt_update();

-- Create function 'delegates_voters_balance_update' for updating voters_balance from blockchain ('votes_details', 'trs', 'blocks')
CREATE FUNCTION delegates_voters_balance_update() RETURNS TABLE(updated INT) LANGUAGE PLPGSQL AS $$
	BEGIN
		RETURN QUERY
			WITH
			last_round AS (SELECT (CASE WHEN height < 101 THEN 1 ELSE height END) AS height FROM blocks WHERE height % 101 = 0 OR height = 1 ORDER BY height DESC LIMIT 1),
			current_round_txs AS (SELECT t.id FROM trs t LEFT JOIN blocks b ON b.id = t."blockId" WHERE b.height > (SELECT height FROM last_round)),
			voters AS (SELECT DISTINCT ON (voter_address) voter_address FROM votes_details),
			balances AS (
				(SELECT UPPER("senderId") AS address, -SUM(amount+fee) AS amount FROM trs GROUP BY UPPER("senderId"))
					UNION ALL
				(SELECT UPPER("senderId") AS address, SUM(amount+fee) AS amount FROM trs WHERE id IN (SELECT * FROM current_round_txs) GROUP BY UPPER("senderId"))
					UNION ALL
				(SELECT UPPER("recipientId") AS address, SUM(amount) AS amount FROM trs WHERE "recipientId" IS NOT NULL GROUP BY UPPER("recipientId"))
					UNION ALL
				(SELECT UPPER("recipientId") AS address, -SUM(amount) AS amount FROM trs WHERE id IN (SELECT * FROM current_round_txs) AND "recipientId" IS NOT NULL GROUP BY UPPER("recipientId"))
					UNION ALL
				(SELECT d.address, d.fees+d.rewards AS amount FROM delegates d)
			),
			filtered AS (SELECT * FROM balances WHERE address IN (SELECT * FROM voters)),
			accounts AS (SELECT b.address, SUM(b.amount) AS balance FROM filtered b GROUP BY b.address),
			updated AS (UPDATE delegates SET voters_balance = balance FROM
			(SELECT d.pk, (
				(SELECT COALESCE(SUM(balance), 0) AS balance FROM accounts WHERE address IN 
					(SELECT v.voter_address FROM
						(SELECT DISTINCT ON (voter_address) voter_address, type FROM votes_details
							WHERE delegate_pk = d.pk AND height <= (SELECT height FROM last_round)
							ORDER BY voter_address, timestamp DESC
						) v
						WHERE v.type = 'add'
					)
				)
			) FROM delegates d) dd WHERE delegates.pk = dd.pk RETURNING 1)
			SELECT COUNT(1)::INT FROM updated;
END $$;

-- Execute 'delegates_voters_balance_update'
SELECT delegates_voters_balance_update();

-- Create function 'delegates_rank_update' for updating delegates ranks
CREATE FUNCTION delegates_rank_update() RETURNS TABLE(updated INT) LANGUAGE PLPGSQL AS $$
	BEGIN
		RETURN QUERY
			WITH new AS (SELECT row_number() OVER (ORDER BY voters_balance DESC, pk ASC) AS rank, tx_id FROM delegates),
			updated AS (UPDATE delegates SET rank = new.rank FROM new WHERE delegates.tx_id = new.tx_id RETURNING 1)
			SELECT COUNT(1)::INT FROM updated;
END $$;

-- Execute 'delegates_rank_update'
SELECT delegates_rank_update();

-- Create function 'delegate_change_ranks_update' for updating delegates ranks
CREATE FUNCTION delegate_change_ranks_update() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	BEGIN
		PERFORM delegates_rank_update();
	RETURN NULL;
END $$;

-- Create function 'delegate_insert_delete' for updating delegates ranks when delegate is inserted or deleted
CREATE TRIGGER delegate_insert_delete
	AFTER INSERT OR DELETE ON delegates
	FOR EACH ROW
	EXECUTE PROCEDURE delegate_change_ranks_update();

-- Consistency checks - new 'delegates' table against 'mem_accounts'
DO $$
DECLARE
	diff int;
BEGIN
	SELECT COUNT(1) FROM delegates d LEFT JOIN mem_accounts m ON d.pk = m."publicKey"
	WHERE m.rewards <> d.rewards OR m.fees <> d.fees OR m.vote <> d.voters_balance OR m.producedblocks <> d.blocks_forged_cnt OR m.missedblocks <> d.blocks_missed_cnt
	INTO diff;

	IF diff > 0 THEN
		RAISE check_violation USING MESSAGE = 'Migration failed, delegates not match mem_accounts';
	END IF;
END $$;

-- Drop 'full_blocks_list' view
DROP VIEW full_blocks_list;

-- Recreate 'full_blocks_list' view
CREATE VIEW full_blocks_list AS SELECT
	b."id" AS "b_id",
	b."version" AS "b_version",
	b."timestamp" AS "b_timestamp",
	b."height" AS "b_height",
	b."previousBlock" AS "b_previousBlock",
	b."numberOfTransactions" AS "b_numberOfTransactions",
	(b."totalAmount")::bigint AS "b_totalAmount",
	(b."totalFee")::bigint AS "b_totalFee",
	(b."reward")::bigint AS "b_reward",
	b."payloadLength" AS "b_payloadLength",
	ENCODE(b."payloadHash", 'hex') AS "b_payloadHash",
	ENCODE(b."generatorPublicKey", 'hex') AS "b_generatorPublicKey",
	ENCODE(b."blockSignature", 'hex') AS "b_blockSignature",
	t."id" AS "t_id",
	t."rowId" AS "t_rowId",
	t."type" AS "t_type",
	t."timestamp" AS "t_timestamp",
	ENCODE(t."senderPublicKey", 'hex') AS "t_senderPublicKey",
	t."senderId" AS "t_senderId",
	t."recipientId" AS "t_recipientId",
	(t."amount")::bigint AS "t_amount",
	(t."fee")::bigint AS "t_fee",
	ENCODE(t."signature", 'hex') AS "t_signature",
	ENCODE(t."signSignature", 'hex') AS "t_signSignature",
	ENCODE(s."publicKey", 'hex') AS "s_publicKey",
	d."name" AS "d_username",
	v."votes" AS "v_votes",
	m."min" AS "m_min",
	m."lifetime" AS "m_lifetime",
	m."keysgroup" AS "m_keysgroup",
	dapp."name" AS "dapp_name",
	dapp."description" AS "dapp_description",
	dapp."tags" AS "dapp_tags",
	dapp."type" AS "dapp_type",
	dapp."link" AS "dapp_link",
	dapp."category" AS "dapp_category",
	dapp."icon" AS "dapp_icon",
	it."dappId" AS "in_dappId",
	ot."dappId" AS "ot_dappId",
	ot."outTransactionId" AS "ot_outTransactionId",
	ENCODE(t."requesterPublicKey", 'hex') AS "t_requesterPublicKey",
	t."signatures" AS "t_signatures"
FROM blocks b
LEFT OUTER JOIN trs AS t ON t."blockId" = b."id"
LEFT OUTER JOIN delegates AS d ON d."tx_id" = t."id"
LEFT OUTER JOIN votes AS v ON v."transactionId" = t."id"
LEFT OUTER JOIN signatures AS s ON s."transactionId" = t."id"
LEFT OUTER JOIN multisignatures AS m ON m."transactionId" = t."id"
LEFT OUTER JOIN dapps AS dapp ON dapp."transactionId" = t."id"
LEFT OUTER JOIN intransfer AS it ON it."transactionId" = t."id"
LEFT OUTER JOIN outtransfer AS ot ON ot."transactionId" = t."id";

-- Drop table 'delegates_old'
DROP TABLE delegates_old;

-- Create function for update 'delegates'.'blocks_forged_cnt'
CREATE FUNCTION delegates_forged_blocks_cnt_update() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	BEGIN
		IF (TG_OP = 'INSERT') THEN
			UPDATE delegates SET blocks_forged_cnt = blocks_forged_cnt+1 WHERE pk = NEW."generatorPublicKey";
		ELSIF (TG_OP = 'DELETE') THEN
			UPDATE delegates SET blocks_forged_cnt = blocks_forged_cnt-1 WHERE pk = OLD."generatorPublicKey";
		END IF;
	RETURN NULL;
END $$;

-- Create trigger that will execute 'delegates_forged_blocks_cnt_update' after insertion or deletion of block
CREATE CONSTRAINT TRIGGER block_insert_delete
	AFTER INSERT OR DELETE ON blocks
	DEFERRABLE INITIALLY DEFERRED
	FOR EACH ROW
	EXECUTE PROCEDURE delegates_forged_blocks_cnt_update();

-- Create function 'delegates_update_on_block' for updating 'delegates' table data
CREATE FUNCTION delegates_update_on_block() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	BEGIN
		-- Update outsiders of round
		IF (TG_OP = 'INSERT') AND (NEW.height != 1) THEN
			PERFORM outsiders_update();
		END IF;

		PERFORM delegates_voters_cnt_update();
		PERFORM delegates_voters_balance_update();
		PERFORM delegates_rank_update();

		-- Rollback outsiders of round
		IF (TG_OP = 'DELETE') THEN
			-- Pass public key of delegate who forged deleted block
			PERFORM outsiders_rollback(ENCODE(OLD."generatorPublicKey", 'hex'));
		END IF;

		-- Perform notification to backend that round changed
		IF (TG_OP = 'INSERT') THEN
			-- Last block of round inserted - round is closed here and processing is done
			PERFORM pg_notify('round-closed', json_build_object('round', CEIL((NEW.height+1) / 101::float)::int, 'list', generateDelegatesList(CEIL((NEW.height+1) / 101::float)::int, ARRAY(SELECT ENCODE(pk, 'hex') AS pk FROM delegates ORDER BY rank ASC LIMIT 101)))::text);
		ELSIF (TG_OP = 'DELETE') THEN
			-- Last block of round deleted - round reopened, processing is done here
			PERFORM pg_notify('round-reopened', json_build_object('round', CEIL((OLD.height) / 101::float)::int, 'list', generateDelegatesList(CEIL((OLD.height) / 101::float)::int, ARRAY(SELECT ENCODE(pk, 'hex') AS pk FROM delegates ORDER BY rank ASC LIMIT 101)))::text);
		END IF;
	RETURN NULL;
END $$;

-- Create trigger that will execute 'delegates_update_on_block' after insertion of last block of round
-- Trigger is deferred - will be executed after transaction in which block is inserted - block's transactions are already inserted here
CREATE CONSTRAINT TRIGGER block_insert
	AFTER INSERT ON blocks
	DEFERRABLE INITIALLY DEFERRED
	FOR EACH ROW
	WHEN (NEW.height % 101 = 0 OR NEW.height = 1)
	EXECUTE PROCEDURE delegates_update_on_block();

-- Create trigger that will execute 'delegates_update_on_block' after deletion of last block of round
-- Trigger is deferred - will be executed after transaction in which block is deleted - block's transactions are already deleted here
CREATE CONSTRAINT TRIGGER block_delete
	AFTER DELETE ON blocks
	DEFERRABLE INITIALLY DEFERRED
	FOR EACH ROW
	WHEN (OLD.height % 101 = 0)
	EXECUTE PROCEDURE delegates_update_on_block();

-- Replace function for deleting round rewards when last block of round is deleted
CREATE OR REPLACE FUNCTION round_rewards_delete() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	BEGIN
		-- Update 'delegates' table with round rewards
		WITH r AS (SELECT pk, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(OLD.height / 101::float)::int) GROUP BY pk)
		UPDATE delegates SET rewards = delegates.rewards-r.rewards, fees = delegates.fees-r.fees FROM r WHERE delegates.pk = r.pk;

		-- Update 'mem_accounts' table with round rewards
		WITH r AS (SELECT pk, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(OLD.height / 101::float)::int) GROUP BY pk)
		UPDATE mem_accounts SET balance = mem_accounts.balance-r.rewards-r.fees, u_balance = mem_accounts.u_balance-r.rewards-r.fees FROM r WHERE mem_accounts."publicKey" = r.pk;

		-- Delete round from 'rounds_rewards'
		DELETE FROM rounds_rewards WHERE round = (CEIL(OLD.height / 101::float)::int);
	RETURN NULL;
END $$;

-- Replace function for inserting round rewards when last block of round is inserted
CREATE OR REPLACE FUNCTION round_rewards_insert() RETURNS TRIGGER LANGUAGE PLPGSQL AS $$
	BEGIN
		WITH
			round AS (
				-- Selecting all blocks of round, apply exception fees and rewards factor
				SELECT
					b.timestamp, b.height, b."generatorPublicKey" AS pk, b."totalFee" * COALESCE(e.fees_factor, 1) AS fees,
					b.reward * COALESCE(e.rewards_factor, 1) AS reward, COALESCE(e.fees_bonus, 0) AS fb
				FROM blocks b 
				LEFT JOIN rounds_exceptions e ON CEIL(b.height / 101::float)::int = e.round
				WHERE CEIL(b.height / 101::float)::int = CEIL(NEW.height / 101::float)::int AND b.height > 1
			),
			-- Calculating total fees of round, apply exception fees bonus
			fees AS (SELECT SUM(fees) + fb AS total, FLOOR((SUM(fees) + fb) / 101) AS single FROM round GROUP BY fb),
			-- Get last delegate and timestamp of round's last block
			last AS (SELECT pk, timestamp FROM round ORDER BY height DESC LIMIT 1)
		INSERT INTO rounds_rewards
			SELECT
				-- Block height
				round.height,
				-- Timestamp of last round's block
				last.timestamp,
				-- Calculating real fee reward for delegate:
				-- Rounded fee per delegate + remaining fees if block is last one of round
				(fees.single + (CASE WHEN last.pk = round.pk AND last.timestamp = round.timestamp THEN (fees.total - fees.single * 101) ELSE 0 END)) AS fees,
				-- Block reward
				round.reward,
				-- Round
				CEIL(round.height / 101::float)::int,
				-- Delegate public key
				round.pk
			FROM last, fees, round
			-- Sort fees by block height
			ORDER BY round.height ASC;

		-- Update 'delegates' table with round rewards
		WITH r AS (SELECT pk, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(NEW.height / 101::float)::int) GROUP BY pk)
		UPDATE delegates SET rewards = delegates.rewards+r.rewards, fees = delegates.fees+r.fees FROM r WHERE delegates.pk = r.pk;

		-- Update 'mem_accounts' table with round rewards
		WITH r AS (SELECT pk, SUM(fees) AS fees, SUM(reward) AS rewards FROM rounds_rewards WHERE round = (CEIL(NEW.height / 101::float)::int) GROUP BY pk)
		UPDATE mem_accounts SET balance = mem_accounts.balance+r.rewards+r.fees, u_balance = mem_accounts.u_balance+r.rewards+r.fees FROM r WHERE mem_accounts."publicKey" = r.pk;

	RETURN NULL;
END $$;

-- Create function for updating blocks_missed_cnt (outsiders of round)
CREATE OR REPLACE FUNCTION outsiders_update() RETURNS TABLE(updated INT) LANGUAGE PLPGSQL AS $$
	BEGIN
		RETURN QUERY
		WITH
			-- Calculate round from highest block
			last_round AS (SELECT CEIL(height / 101::float)::int AS round FROM blocks ORDER BY height DESC LIMIT 1),
			-- Increase delegates.blocks_missed_cnt
			updated AS (UPDATE delegates d SET blocks_missed_cnt = blocks_missed_cnt+1 WHERE ENCODE(d.pk, 'hex') IN (
				-- Delegates who are on list and did not forged a block during round are treatment as round outsiders
				SELECT outsider FROM UNNEST(getDelegatesList()) outsider WHERE outsider NOT IN (
					SELECT ENCODE(b."generatorPublicKey", 'hex') FROM blocks b WHERE CEIL(b.height / 101::float)::int = (SELECT round FROM last_round)
				)
			) RETURNING 1
		)
		SELECT COUNT(1)::INT FROM updated;
END $$;

-- Create function for rollback blocks_missed_cnt (outsiders of round) in case of delete last block of round
CREATE OR REPLACE FUNCTION outsiders_rollback(last_block_forger text) RETURNS TABLE(updated INT) LANGUAGE PLPGSQL AS $$
	BEGIN
		RETURN QUERY
		WITH
			-- Calculate round from highest block
			last_round AS (SELECT CEIL(height / 101::float)::int AS round FROM blocks ORDER BY height DESC LIMIT 1),
			-- Decrease delegates.blocks_missed_cnt
			updated AS (UPDATE delegates d SET blocks_missed_cnt = blocks_missed_cnt-1 WHERE ENCODE(d.pk, 'hex') IN (
				-- Delegates who are on list and did not forged a block during round are treatment as round outsiders
				SELECT outsider FROM UNNEST(getDelegatesList()) outsider WHERE outsider NOT IN (
					SELECT ENCODE(b."generatorPublicKey", 'hex') FROM blocks b WHERE CEIL(b.height / 101::float)::int = (SELECT round FROM last_round)
				) AND outsider <> last_block_forger -- Forger of deleted block cannot be outsider
			) RETURNING 1
		)
		SELECT COUNT(1)::INT FROM updated;
END $$;

-- Drop mem_round table
DROP TABLE IF EXISTS mem_round;

COMMIT;
