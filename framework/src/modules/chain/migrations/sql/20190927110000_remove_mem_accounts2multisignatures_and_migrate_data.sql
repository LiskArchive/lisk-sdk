-- -- Create new column for holding voted delegates PKs

ALTER TABLE mem_accounts ADD COLUMN "membersPublicKeys" jsonb;

-- -- -- Move voted public keys from mem_accounts2delegates to mem_accounts

UPDATE mem_accounts
SET "membersPublicKeys" = 
(
	SELECT 
		jsonb_agg("dependentId")
	FROM mem_accounts2multisignatures
	WHERE "accountId" = mem_accounts.address
	GROUP BY "accountId"
)
WHERE address in (SELECT "accountId" FROM mem_accounts2multisignatures);

-- drop the unused table

-- DROP TABLE mem_accounts2delegates;