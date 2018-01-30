/*
  DESCRIPTION: Dynamic-field query for column "u_delegates"

  PARAMETERS: None
*/

(
  SELECT array_agg("dependentId")
  FROM mem_accounts2u_delegates
  WHERE "accountId" = mem_accounts.address
)
