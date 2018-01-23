/*
  DESCRIPTION: Gets delegates for list of public keys

  PARAMETERS:
      $1 - array of public keys
*/

SELECT ENCODE("publicKey", 'hex') AS "publicKey",
       username,
       address
FROM mem_accounts
WHERE "isDelegate" = 1
  AND ENCODE("publicKey", 'hex') IN ($1:csv)
ORDER BY vote ASC,
         "publicKey" DESC
