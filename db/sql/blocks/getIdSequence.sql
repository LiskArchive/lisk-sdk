/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

WITH current_round AS
  (
    SELECT CEIL(b.height / ${delegates}::float)::bigint
    FROM ${schema~}.blocks b
    WHERE b.height <= ${height}
    ORDER BY b.height DESC
    LIMIT 1
  ),
     rounds AS
  (SELECT *
   FROM generate_series(
                         (SELECT *
                          FROM current_round),
                          (SELECT *
                           FROM current_round) - ${LIMIT} + 1, -1))
SELECT b.id,
       b.height,
       ceil(b.height / ${delegates}::float)::bigint AS round
FROM blocks b
WHERE b.height IN
    (SELECT ((n - 1) * ${delegates}) + 1
     FROM rounds AS s(n))
ORDER BY height DESC
