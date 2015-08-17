var request = require("request");
var cheerio = require("cheerio");
var fs = require("fs");

var BASE = "http://www2.census.gov/acs2012_3yr/summaryfile/2010-2012_ACSSF_By_State_By_Sequence_Table_Subset/";

var count = 0,
	pumas = {};

request(BASE, function(err, resp, body) {
	var $ = cheerio.load(body);
	$("td a").each(function(i, v) {
		var path = $(v).html(); 
		if (path.slice(-1)[0] == "/") { // if a directory, go in. Path is name of state in this cane
			request(BASE + path, function(err, resp, body) {
				var $ = cheerio.load(body);
				$("td a").each(function(i, v) {
					var filename = $(v).html();
					if (filename.split(".")[1] == "txt") { // there's a single text file with what we need in each directory
						request(BASE + path + filename, function(err, resp, body) {
							body.split(/[\r\n]+/g).forEach(function(line) {
								data = line.split(/\s{2,1000}/g);
								if (data[3] && data[3].slice(0,3) == "795") {
									var info = {
										abbr: data[0].split(" ")[1].slice(0,2),
										fips: data[1],
										code: data[3].split("US")[1],
										name: data[4].replace(/'/g, "\\'"),
										state: path.slice(0, -1)
									};
									pumas[info.code] = info;
								}
							});
							count += 1;
							if (count === 53) {
								fs.writeFileSync("pumas.json", JSON.stringify(pumas, null, 2));
							}
						});
					}
				});
			});
		}
	});
});