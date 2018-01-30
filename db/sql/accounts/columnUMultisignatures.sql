/*
  DESCRIPTION: Dynamic-field query for column "u_multisignatures"

  PARAMETERS: None
*/

(
  SELECT array_agg("dependentId")
  FROM mem_accounts2u_multisignatures
  WHERE "accountId" = mem_accounts.address
)
