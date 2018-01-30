/*
  DESCRIPTION: Dynamic-field query for column "rank"

  PARAMETERS: None
*/

(
SELECT m.row_number FROM (SELECT row_number()
  OVER (ORDER BY r.vote DESC, r."publicKey" ASC), address
    FROM (SELECT d."isDelegate", d.vote, d."publicKey", d.address
      FROM mem_accounts AS d
      WHERE d."isDelegate" = 1) AS r) m
    WHERE m.address = mem_accounts.address
)::bigint
