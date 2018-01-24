SELECT count(id)::int
FROM blocks
WHERE
  id = ${id}
  AND height = ${height}
  ${comparePreviousBlock:raw}
