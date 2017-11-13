BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Second signature migration, please wait...';
END
$$;

/* Begin second signature migration */
CREATE TABLE "public".second_signature(transaction_id varchar(20) NOT NULL,
  public_key bytea NOT NULL,
  second_public_key bytea NOT NULL,
  CONSTRAINT pk_second_signature PRIMARY KEY(public_key));


INSERT INTO second_signature(transaction_id, public_key, second_public_key)
SELECT t.transaction_id,
  t."sender_public_key",
  ma."secondPublicKey"
FROM "public".transactions t,  mem_accounts ma
WHERE ma."secondPublicKey"
IS NOT NULL
AND t."sender_address" = ma."address"
AND t.type = 1;


  -- Second signature indexes
  CREATE INDEX idx_second_signature_transaction_id
  ON "public".second_signature ( "transaction_id" );

  CREATE INDEX idx_public_key
  ON "public".second_signature ( "public_key" );

  CREATE INDEX idx_second_public_key
  ON "public".second_signature ( "second_public_key" );


END;
