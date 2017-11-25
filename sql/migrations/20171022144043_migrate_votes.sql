BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Votes migration, please wait...';
END
$$;

-- Rename columns
ALTER TABLE votes_details RENAME tx_id to transaction_id;
ALTER TABLE votes_details RENAME delegate_pk to delegate_public_key;

-- Rename votes table to votes_old
ALTER TABLE votes RENAME TO votes_old;

-- Create 'votes' table
CREATE TABLE votes(
	transaction_id varchar(20) NOT NULL,
	public_key bytea NOT NULL,
	votes text NOT NULL
);

-- Insert data into 'votes' table from 'votes_old' table
INSERT INTO votes(transaction_id, public_key, votes)
	SELECT
		t.transaction_id,
		t.sender_public_key,
		v.votes
	FROM
		votes_old v,
		transactions t
	WHERE t.transaction_id = v."transactionId";

-- Create function for inserting data into 'votes_details' table
CREATE OR REPLACE FUNCTION vote_insert() RETURNS TRIGGER LANGUAGE PLPGSQL AS $function$
	BEGIN
		INSERT INTO votes_details
		SELECT
			r.transaction_id,
			r.voter_address, (
				CASE WHEN substring(vote, 1, 1) = '+' THEN 'add' ELSE 'rem' END
			) AS type,
			r.timestamp,
			r.height,
			DECODE(substring(vote, 2), 'hex') AS delegate_public_key FROM (
				SELECT
					v.transaction_id AS transaction_id,
					t.sender_address AS voter_address,
					b.timestamp AS timestamp,
					b.height,
					regexp_split_to_table(v.votes, ',') AS vote
				FROM votes v, transactions t, blocks b
				WHERE v.transaction_id = NEW.transaction_id
  			AND v.transaction_id = t.transaction_id
				AND b.block_id = t.block_id
			) AS r
			ORDER BY r.timestamp ASC;
	RETURN NULL;
END $function$;

-- Create trigger that will execute 'vote_insert' after insertion of a vote transaction
CREATE TRIGGER vote_insert AFTER
	INSERT ON votes
	FOR EACH ROW EXECUTE PROCEDURE vote_insert();

-- Create indexes
CREATE INDEX idx_votes_public_key
ON votes(public_key);

CREATE INDEX idx_votes_transaction_id
ON votes(transaction_id);

COMMIT;
