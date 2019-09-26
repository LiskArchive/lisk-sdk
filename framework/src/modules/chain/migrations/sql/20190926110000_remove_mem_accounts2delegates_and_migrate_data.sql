-- Create new column for holding voted delegates PKs

ALTER TABLE mem_accounts ADD COLUMN "votedDelegatesPublicKeys" jsonb;

-- -- Move voted public keys from mem_accounts2delegates to mem_accounts

UPDATE mem_accounts
SET "votedDelegatesPublicKeys" = 
(
	SELECT 
	concat(
		'{"keys":', 
		jsonb_agg("dependentId"),
		'}'
	)::jsonb
	FROM mem_accounts2delegates
	WHERE "accountId" = mem_accounts.address
	GROUP BY "accountId"
)
WHERE address in (SELECT "accountId" FROM mem_accounts2delegates);

-- drop the unused table

DROP TABLE mem_accounts2delegates;