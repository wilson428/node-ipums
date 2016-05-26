var weighted = require("../weightedQuantiles");

var vals = [[0,5], [16000,3], [20000,8], [32000,4], [40000,3], [41000,1], [50000,2], [90000,1]];

console.log(weighted(vals, 8));
console.log(weighted(vals, 6));

console.log(weighted(vals, 2));