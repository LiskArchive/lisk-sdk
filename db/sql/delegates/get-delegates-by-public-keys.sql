/*
  DESCRIPTION: Gets delegates for a list of public keys

  PARAMETERS:
      publicKeys - array of public keys (strings)
*/

SELECT ENCODE("publicKey", 'hex') AS "publicKey",
       username,
       address
FROM ${schema~}.mem_accounts
WHERE
  "isDelegate" = 1
  AND ENCODE("publicKey", 'hex') IN (${publicKeys:csv})
ORDER BY vote ASC,
         "publicKey" DESC
