/*
  DESCRIPTION: Dynamic-field query for column "delegates"

  PARAMETERS: None
*/

(
  SELECT array_agg("dependentId")
  FROM mem_accounts2delegates
  WHERE "accountId" = mem_accounts.address
)
