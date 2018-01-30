/*
  DESCRIPTION: Gets delegates for a list of public keys.

  PARAMETERS:
      publicKeys - array of public keys (strings)
*/

SELECT encode("publicKey", 'hex') AS "publicKey",
       username,
       address
FROM mem_accounts
WHERE
  "isDelegate" = 1
  AND encode("publicKey", 'hex') IN (${publicKeys:csv})
ORDER BY vote ASC,
         "publicKey" DESC
