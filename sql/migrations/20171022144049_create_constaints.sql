BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Creating constraints tables, please wait...';
END
$$;


  -- Create new Foreign Key relations
  ALTER TABLE "public".votes ADD CONSTRAINT "fkey_votes_transaction_id" FOREIGN KEY ( "transaction_id" ) REFERENCES "public".transactions( "transaction_id" )
  ON
  DELETE CASCADE;

  ALTER TABLE "public".intransfer ADD CONSTRAINT "fkey_intransfer_transaction_id" FOREIGN KEY ( "transaction_id" ) REFERENCES "public".transactions( "transaction_id" )
  ON
  DELETE CASCADE;

  ALTER TABLE "public".outtransfer ADD CONSTRAINT "fkey_outtransfer_transaction_id" FOREIGN KEY ( "transaction_id" ) REFERENCES "public".transactions( "transaction_id" )
  ON
  DELETE CASCADE;

  ALTER TABLE "public".multisignatures_master ADD CONSTRAINT "fkey_multisignatures_master_transaction_id" FOREIGN KEY ( "transaction_id" ) REFERENCES "public".transactions( "transaction_id" )
  ON
  DELETE CASCADE;

  ALTER TABLE "public".multisignatures_member ADD CONSTRAINT "fkey_multisignatures_member_transaction_id" FOREIGN KEY ( "transaction_id" ) REFERENCES "public".transactions( "transaction_id" )
  ON
  DELETE CASCADE;

  ALTER TABLE "public".second_signature ADD CONSTRAINT "fkey_second_signature_transaction_id" FOREIGN KEY ( "transaction_id" ) REFERENCES "public".transactions( "transaction_id" )
  ON
  DELETE CASCADE;

  ALTER TABLE "public".delegates ADD CONSTRAINT "fkey_delegates_transaction_id" FOREIGN KEY ( "transaction_id" ) REFERENCES "public".transactions( "transaction_id" )
  ON
  DELETE CASCADE;


END;
