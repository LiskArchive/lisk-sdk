/*
  DESCRIPTION: Dynamic-field query for column "multisignatures"

  PARAMETERS: None
*/

(
  SELECT array_agg("dependentId")
  FROM mem_accounts2multisignatures
  WHERE "accountId" = mem_accounts.address
)
