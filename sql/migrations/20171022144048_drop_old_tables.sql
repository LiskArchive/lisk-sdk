BEGIN;

DO language plpgsql $$
BEGIN
	RAISE NOTICE 'Dropping old tables, please wait...';
END
$$;

  /* Begin cleanup of old tables */
  DROP VIEW blocks_list;
  DROP VIEW trs_list;
  DROP VIEW full_blocks_list;
  DROP TABLE dapps_old CASCADE;
  DROP TABLE votes_old CASCADE;
  DROP TABLE signatures CASCADE;
  DROP TABLE multisignatures CASCADE;
  DROP TABLE mem_accounts2delegates CASCADE;
  DROP TABLE mem_accounts2u_delegates CASCADE;
  DROP TABLE mem_accounts2multisignatures CASCADE;
  DROP TABLE mem_accounts2u_multisignatures CASCADE;
  DROP TABLE mem_accounts CASCADE;

END;
