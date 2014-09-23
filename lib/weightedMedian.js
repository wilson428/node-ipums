// Calculate the median of a dataset in which you have a set of values and a frequency for each value
// The naive way to calculate the median in this case would be to duplicate the values as many times as they appear in the frequency field, then take the median of that large list
// We can do a little better
// Expects an array of arrays with two values each: value and weight
// e.g. [ [1300,4], [900,8], [1600,1],[1000,2] ];
module.exports = function(vals) {
	var N = 0, n = 0;

	vals = vals.sort(function(a, b) { return a[0] - b[0]; });

	// total size of set
	vals.forEach(function(val) {
		N += val[1];
	});

	var halfways = [];

	if (N % 2 == 0) {
		halfways.push(N / 2 - 1);
		halfways.push(N / 2);
	} else {
		halfways.push(Math.floor(N/2));
		halfways.push(Math.floor(N/2));
	}

	var half = -1, // to account for index
		median = 0;

	vals.forEach(function(val, v) {
		half += val[1];
		//console.log(half);

		var h = 0;

		while (h < halfways.length) {
			if (half >= halfways[h]) {
				median += val[0] / 2;
				//console.log(halfways[h], half, val);
				halfways.splice(h, 1);
			} else {
				h += 1;
			}
		}


	});

	return median;
}