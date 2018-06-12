#!/bin/bash

confd -backend env -onetime
node app.js
