BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Adding constraints to tables, please wait...';
END
$$;

ALTER TABLE votes
	ADD CONSTRAINT fkey_votes_transaction_id
	FOREIGN KEY(transaction_id)
	REFERENCES transactions(transaction_id)
	ON DELETE CASCADE;

ALTER TABLE intransfer
	ADD CONSTRAINT fkey_intransfer_transaction_id
	FOREIGN KEY(transaction_id)
	REFERENCES transactions(transaction_id)
	ON DELETE CASCADE;

ALTER TABLE outtransfer
	ADD CONSTRAINT fkey_outtransfer_transaction_id
	FOREIGN KEY(transaction_id)
	REFERENCES transactions(transaction_id)
	ON DELETE CASCADE;

ALTER TABLE multisignatures_master
	ADD CONSTRAINT fkey_multisignatures_master_transaction_id
	FOREIGN KEY(transaction_id)
	REFERENCES transactions(transaction_id)
	ON DELETE CASCADE;

ALTER TABLE multisignatures_member
	ADD CONSTRAINT fkey_multisignatures_member_transaction_id
	FOREIGN KEY(transaction_id)
	REFERENCES transactions(transaction_id)
	ON DELETE CASCADE;

ALTER TABLE second_signature
	ADD CONSTRAINT fkey_second_signature_transaction_id
	FOREIGN KEY(transaction_id)
	REFERENCES transactions(transaction_id)
	ON DELETE CASCADE;

ALTER TABLE delegates
	ADD CONSTRAINT fkey_delegates_transaction_id
	FOREIGN KEY(transaction_id)
	REFERENCES transactions(transaction_id)
	ON DELETE CASCADE;

COMMIT;
