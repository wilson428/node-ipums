#!/bin/sh

gzip -dk test/usa_00028.dat.gz
echo "Successfully extracted test file"
./index.js csv test/usa_00028 --buckets=age_census,education_degree