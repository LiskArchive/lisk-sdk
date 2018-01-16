#!/bin/bash
nohup ./node_modules/.bin/nyc node app.js &> .app.log &
sleep 5
