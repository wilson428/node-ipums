// Calculate the median of a dataset in which you have a set of values and a frequency for each value
// The naive way to calculate the median in this case would be to duplicate the values as many times as they appear in the frequency field, then take the median of that large list
// We can do a little better
// Expects an array of arrays with two values each: value and weight
// e.g. [ [1300,4], [900,8], [1600,1],[1000,2] ];
module.exports = function(vals, binCount) {
	vals = vals.sort(function(a, b) { return a[0] - b[0]; });

	var size = 0;

	// total size of set, noting cumulative index as we go
	vals.forEach(function(val) {
		size += val[1];
		val.push(size);
	});

	// find the indices of the closest fit for number of bins
	var bins = [];
	for (var c = 1; c <= binCount; c += 1) {
		bins.push({
			bin: c,
			index: Math.round(c * size / binCount)
		});
	}

	vals.forEach(function(val, v) {
		for (var b in bins) {
			//console.log(bins[b].index, val[2]);
			if (typeof bins[b].upper === "undefined" && val[2] >= bins[b].index) {
				bins[b].upper = val[0];
			}
		}
	});

	return bins;

}