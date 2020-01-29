SELECT
	"delegatePublicKeys"::json
FROM "round_delegates"
WHERE
	"round" = ${round}
