/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT count(*)::int
FROM blocks
WHERE
  id = ${id}
  AND height = ${height}
  ${comparePreviousBlock:raw}
