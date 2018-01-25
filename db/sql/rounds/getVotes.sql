/*
  DESCRIPTION: ?

  PARAMETERS: ?
*/

SELECT d.delegate, d.amount
FROM (SELECT m.delegate, sum(m.amount) AS amount, round FROM ${schema~}.mem_round m GROUP BY m.delegate, m.round) AS d
WHERE round = $1::bigint
