/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT b.height AS height, b.id AS id, t."senderId" AS "authorId"
FROM trs t
INNER JOIN blocks b ON t."blockId" = b.id
WHERE t.id = $1
