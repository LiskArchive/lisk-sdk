#!/bin/bash

confd -backend env -onetime
jq '
def walk(f):
  . as $in
  | if type == "object" then
      reduce keys_unsorted[] as $key
        ( {}; . + { ($key):  ($in[$key] | walk(f)) } ) | f
  elif type == "array" then map( walk(f) ) | f
  else f
  end;

walk(
    if type == "object" then
        with_entries(select( .value != null and .value != {} and .value != [] and .value != "null" ))
    elif type == "array" then
        map(select( . != null and . != {} and .!= [] ))
    else
        .
    end
)' config.json >config.json_
mv config.json_ config.json

node app.js -c /home/lisk/lisk/config.json $@
