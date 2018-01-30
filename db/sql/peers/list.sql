/*
  DESCRIPTION: Gets all peers from database

  PARAMETERS: None
*/

SELECT ip, "wsPort", state, os, version, encode(broadhash, 'hex') AS broadhash, height, clock
FROM peers
