/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT id, "payloadHash", "blockSignature"
FROM ${schema~}.blocks
WHERE height = 1
