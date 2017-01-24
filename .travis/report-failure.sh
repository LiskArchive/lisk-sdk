#!/bin/bash

TRAVIS_BUILD_NUMBER=$1
echo "~/macio/coverage-merger/cancel-report.sh ${TRAVIS_BUILD_NUMBER}"
ssh -p 2255 root@pinkiepie.todr.me "bash ~/macio/coverage-merger/cancel-report.sh ${TRAVIS_BUILD_NUMBER}"  &&
echo "Failure reported to server: root@pinkiepie.todr.me" ||
echo "Unable to report failure to server: root@pinkiepie.todr.me"
