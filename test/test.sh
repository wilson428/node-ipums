#!/bin/sh

gzip -d test/usa_00028.dat.gz
echo "Successfully extracted test file"
./index.js csv test/usa_00028 --buckets=age,education