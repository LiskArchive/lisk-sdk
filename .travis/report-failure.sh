#!/bin/bash

TRAVIS_BUILD_NUMBER=$1
echo "~/macio/coverage-merger/cancel-report.sh ${TRAVIS_BUILD_NUMBER}"
ssh root@139.59.214.29 "bash ~/coverage-merger/cancel-report.sh ${TRAVIS_BUILD_NUMBER}"  &&
echo "Failure reported to server: root@pinkiepie.todr.me" ||
echo "Unable to report failure to server: root@pinkiepie.todr.me"
