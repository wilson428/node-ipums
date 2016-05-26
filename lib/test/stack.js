	var halfway = 13,
		progress = 0;

	var vals = [[0,5], [16000,3], [20000,8], [32000,4], [40000,3], [41000,1], [50000,2], [90000,1]];

	for (var v = 0; v < vals.length; v += 1) {
		progress += vals[v][1];

		if (progress >= halfway) {
			var median = vals[v][0];
			break;
		}
	}

console.log(median);