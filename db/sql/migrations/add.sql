/*
  DESCRIPTION: Adds a new record into the migrations table

  PARAMETERS:
  	- id: record id
  	- name: name of the /update file that did the migration
*/

INSERT INTO migrations(id, name)
VALUES(${id}, ${name}) ON CONFLICT DO NOTHING
