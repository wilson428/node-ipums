var fs = require("fs");
var readline = require('readline');

var parseCodebook = require("./lib/codebook");
//var weightedMedian = require("./lib/weightedMedian");

var opts = require('minimist')(process.argv.slice(2));

var codebook = fs.readFileSync(opts._[0] + ".cbk", "utf8"),
	instream = fs.createReadStream(opts._[0] + ".dat", { encoding: 'utf8' }),
	outstream = fs.createWriteStream(opts._[0] + "_refined.tsv");

/****** PARSE THE CODEBOOK *******/

var cb = parseCodebook(codebook);

//weightedMedian([ [1300,4], [900,8], [1600,1],[1000,7] ]);

//return;



var ageBuckets = [
	[ 17, "Under 18" ],
	[ 21, "18-21"    ],
	[ 25, "22-25"    ],
	[ 30, "26-30"    ],
	[ 35, "31-35"    ],
	[ 40, "36-40"    ],
	[ 50, "41-50"    ],
	[ 64, "51-64"    ],
	[ 200, "65+"   ]
];

var eduBuckets = [
	[ 61, "Less than high school" ],
	[ 64, "High school or equivalent"    ],
	[ 71, "Some college, no degree"    ],
	[ 83, "Associate's degree"    ],
	[ 101, "Bachelor's degree"    ],
	[ 114, "Master's degree"    ],
	[ 115, "Professional degree"    ],
	[ 116, "Doctoral degree"    ]
];

var bucketLookup = {
	age: {},
	education: {}
};

var rl = readline.createInterface({
    input: instream,
	output: process.stdout,
    terminal: false
});

var total = 0,
	datum,
	fields = cb.dictionary.map(function(d) { return d.Variable; });

fields.push("AGEGROUP");
fields.push("EDUGROUP");

if (opts.reduce) {
	fields = fields.filter(function(d) { return ["AGE", "EDUC", "EDUCD", "MARRNO","DATANUM","PERNUM"].indexOf(d) == -1; });
}


outstream.write(fields.join("\t") + "\n");

var start = new Date().getTime();

var buffer = "";

// read each line from the original .dat file and match it up to codebook
rl.on('line', function(line) { 
	datum = {};
	cb.dictionary.forEach(function(column) {
		var valStr = line.slice(column.Columns[0]-1, column.Columns[1]); // data from .dat file in relevant character ranges
		if (cb.definitions[column.Variable]) {
			var	label = cb.definitions[column.Variable][valStr], // plain-language value of that variable, if found in codebook
				val = /^[0-9]+$/.test(label) ? parseInt(label,10) : (/^[0-9]+\.[0-9]+$/.test(label) ? parseFloat(label) : label); // convert to native integer or float if pattern matches
		} else {
			var label = "",
				val = /^[0-9]+$/.test(valStr) ? parseInt(valStr,10) : (/^[0-9]+\.[0-9]+$/.test(valStr) ? parseFloat(valStr) : valStr); // convert to native integer or float if pattern matches
		}

		// some special cases to account for

		if (column.Variable === "PERWT") { // PERWT has two implicit decimals
			val /= 100;
		}

		if (column.Variable === "INCTOT" && /^9+$/.test(valStr)) { // if INCTOT is listed as 99999999999
			valStr = "";
			val = null;
		}

		datum[column.Variable] = { val: val, label: label, valStr: valStr };
	});

	if (!bucketLookup.age[datum.AGE.valStr]) {
		// bucketize
		for (var bucket in ageBuckets) {
			if (parseInt(datum.AGE.valStr,10) <= ageBuckets[bucket][0]) {
				bucketLookup.age[datum.AGE.valStr] = ageBuckets[bucket][1];
				break;
			}
		}
	}

	if (!bucketLookup.education[datum.EDUCD.valStr]) {
		// bucketize
		for (var bucket in eduBuckets) {
			if (parseInt(datum.EDUCD.valStr,10) <= eduBuckets[bucket][0]) {
				bucketLookup.education[datum.EDUCD.valStr] = eduBuckets[bucket][1];
				break;
			}
		}
	}

	datum.AGEGROUP = { val: bucketLookup.age[datum.AGE.valStr] };
	datum.EDUGROUP = { val: bucketLookup.education[datum.EDUCD.valStr] };

	buffer += fields.map(function(d) { return datum[d].val; }).join("\t") + "\n";

	total += 1;
	if (total % 1000 === 0) {
		process.stdout.write("Scanned " + total + " lines\r");
	}

	if (total % (opts.buffer || 10000) === 0) {
		outstream.write(buffer);
		buffer = "";
	}



	/*

	var addMe = true;

	for (var key in opts) {
		if (datum[key] && datum[key].val != opts[key] && datum[key].label != opts[key]) {
			addMe = false;
			break;
		}
	}

	if (addMe && opts.nest) {
		var head = data;
		nested.forEach(function(field, f) {
			var v = datum[field].val;
			head[v] = head[v] || (f == nested.length - 1 ? [] : {});
			head = head[v];
			delete datum[field];
		});
		head.push(datum);
	}
	*/
});

rl.on("close", function() {

	outstream.write(buffer);

	var end = new Date().getTime(),
		delta = Math.round((end - start) / 1000);

	console.log("Finished parsing " + total + " lines in " + delta + " seconds.");
});