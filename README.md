node-ipums
==========

v0.0.2

Parse IPUMS files with Node to create clean, human-readable data files.

[![Build Status](https://travis-ci.org/TimeMagazine/node-ipums.png)](https://travis-ci.org/TimeMagazine/node-ipums)

### Installing

Clone this repo and install dependencies:

	git clone https://github.com/TimeMagazine/node-ipums.git
	cd node-ipums
	npm install

### Example

For this module to work, you need two files from your IPUMS data extract: The raw `.dat` file, in which each row of data is contained in one long string, and the basic codebook file, which decodes that string into fields and ends in a `.cbk` extension:

![IPUMS](example.png)

This repo comes with a sample extract from IPUMS with 2013 data for age, sex, education, and marital status. In this example, we're going to be investigating whether educational attainment has a major effect on the age of marriage.

The data file you need is compressed, so go ahead and extract it:

	gzip -d test/usa_00028.dat.gz

If you have a look at the above file, you'll see it doesn't make a tremendous amount of sense to the naked eye:

	head -n 5 test/usa_00028.dat

	2013010000000100000065004000100000065002019607071
	2013010000000200000051001000100000051002055108081
	2013010000000200000051001000200000062001056106063
	2013010000000200000051001000300000232001021607071
	2013010000000200000051001000400000097002021607071

This is because the data you want is all mashed together into one long string. To decode it, you would need to consult the codebook file, `test/usa_00028.cbk`, which defines which characters belong to which fields. In this case, we see:

	File Type:                    rectangular
	Case Selection:               No
	  Variable               Columns        Len    2013   
	  YEAR               H   1-4            4      X 
	  DATANUM            H   5-6            2      X 
	  SERIAL             H   7-14           8      X 
	  HHWT               H  15-24          10      X 
	  GQ                 H  25              1      X 
	  PERNUM             P  26-29           4      X 
	  PERWT              P  30-39          10      X 
	  SEX                P  40              1      X 
	  AGE                P  41-43           3      X 
	  MARST              P  44              1      X 
	  EDUC               P  45-46           2      X 
	  EDUCD              P  47-49           3      X 

This tells us, for example, that the 44th character (starting from 1, not 0) refers to MARST, the marriage variable. Of course, '6' is not a type of marriage. Further down in the same file you'll find the codes that map these numbers to their real-world values:

	MARST	Marital status
	1		Married, spouse present
	2		Married, spouse absent
	3		Separated
	4		Divorced
	5		Widowed
	6		Never married/single

In fact, IPUMS allows you to skip the `.dat` file and download a `.csv` instead, but doing so does not get us past the problem of getting numbers instead of the corresponding values. The csv version of this file looks like this:

	"YEAR","DATANUM","SERIAL","HHWT","GQ","PERNUM","PERWT","SEX","AGE","MARST","EDUC","EDUCD"
	2013,1,1,65,4,1,65,2,19,6,7,71
	2013,1,2,51,1,1,51,2,55,1,8,81
	2013,1,2,51,1,2,62,1,56,1,6,63
	2013,1,2,51,1,3,232,1,21,6,7,71

That's an easier format to deal with than the long string above, but still difficult to make sense of. Fortunately, one of this module's main functions is to automatically translate the `.dat` file into something you can understand. To do so, you just run the following command:

	./index.js csv test/usa_00028

This will take about a minute to run -- we've got 3 million rows to crunch through! Eventually you'll see something like this:

	Finished parsing 3132795 lines in 56 seconds.
	Wrote output to test/usa_00028.tsv

Let's have a look:

	head -n 5 test/usa_00028.tsv
	
	YEAR	SERIAL	HHWT	GQ	PERWT	SEX	AGE	MARST	EDUC	EDUCD
	2013	1	6500	Other group quarters	65	Female	19	Never married/single	1 year of college	1 or more years of college credit, no degree
	2013	2	5100	Households under 1970 definition	51	Female	55	Married, spouse present	2 years of college	Associate's degree, type not specified
	2013	2	5100	Households under 1970 definition	62	Male	56	Married, spouse present	Grade 12	Regular high school diploma
	2013	2	5100	Households under 1970 definition	232	Male	21	Never married/single	1 year of college	1 or more years of college credit, no degree

As you see, the script applied the codebook definitions to each line of the file and spat it back out as a tab-delimited file with the plain-English values instead of the numbers. You can now easily import this file into Excel, a SQL database, or anything else that understands tab-delimited csvs.

### Bucketing

In many cases, the data we get from IPUMS is more granular than we need. ([Sounds like one of them good problems](http://www.quickmeme.com/img/53/53ae44a3552229814206def5de7a2dbc62a8a5d7e8cea1d1a62927b6d9093244.jpg).) For your purposes, you may want to combine fields like age into ranges of values (or "buckets"), like 18-21, 22-25, and so forth. To do so, you pass a `buckets` parameter:

	node index.js csv test/usa_00028 --buckets=age,education

Let's see what that did:

	head -n 5 test/usa_00028.tsv
	
	YEAR	SERIAL	HHWT	GQ	PERWT	SEX	MARST	EDUC	age_group	education_group
	2013	1	6500	Other group quarters	65	Female	Never married/single	1 year of college	18-21	Some college, no degree
	2013	2	5100	Households under 1970 definition	51	Female	Married, spouse present	2 years of college	51-64	Associate's degree
	2013	2	5100	Households under 1970 definition	62	Male	Married, spouse present	Grade 12	51-64	High school or equivalent
	2013	2	5100	Households under 1970 definition	232	Male	Never married/single	1 year of college	18-21	Some college, no degree

As you see (if you scroll to the right), there are now two new fields: `age_group` and `education_group`, which replace the original values with ranges. So how did it know what ranges to select? There's a file in the root directory called [`buckets.json`](buckets.json) that contains a variety of grouping options. For example, the bucket named `age` looks like this:

	"age": {
		"field": "AGE",
		"buckets": [
			[  0, 17, "Under 18" ],
			[ 18, 21, "18-21"    ],
			[ 22, 25, "22-25"    ],
			[ 26, 30, "26-30"    ],
			[ 31, 35, "31-35"    ],
			[ 36, 40, "36-40"    ],
			[ 41, 50, "41-50"    ],
			[ 51, 64, "51-64"    ],
			[ 65, 200, "65+"   	 ]
		]
	}

As you can probably guess, the first two values in the arrays represent the *inclusive* bounds of the group. Any value in the original dataset between these bounds is assigned the value in the third position. You can easily add your own buckets if none of ours suit your needs, and we encourage you to send pull requests with your additions.

By default, the script deletes the original value's column after bucketing it. If you need to retain the original value, just pass `--keep_original` to the command.

### Reducing file size

You can eliminate fields from the original IPUMs file by passing them to the `ignore` parameter:

	node index.js csv test/usa_00028 --ignore=AGE,SEX

By default, we also delete the `DATANUM` and `PERNUM` fields, which are not terribly useful. (This is not to be confused with the `PERWT` value, a very useful weighting variable.)

### Patience

This script can churn through 15 million lines in about 300 seconds. You can adjust the number of lines it buffers before writing (10,000, by default) with `--buffer`.

## Important note on PUMAs
If you've selected `PUMA` as one of your variables, you'll get a integer that refers only to the PUMA's ID within its state. This integer is often missing leading zeros. Actual PUMA codes are always five digits and need to be prepended with the two-digit FIPS code for the state, as [IPUMs documents in the variable description](https://usa.ipums.org/usa-action/variables/PUMA#description_section).

To get a correct seven-digit PUMA code, all you need to do is include the variable `STATEFIP` in you data extract and pass `--full_pumas` to the command-line when running the initial CSV script, like so:

	node index.js csv /Users/myname/Downloads/00051 --full_pumas

Note: PUMAs have names, which you can find in [pumas.json](pumas.json). They tend to be long, like "New Castle County (South)--Middletown Town, Bear & Glasgow PUMA; Delaware," so it would dramatically increase the file size to include them. But they're here if you need them.

If you're using `PUMASUPR`, the pre-2012 area definitions, you should still pass `--full_pumas` even though they do not need a state prefix. This ensures that no leading zeros are exorcised.

## Working with extracted data

Okay, so now we have a `.tsv` file with verbose field names and nice delimiters, but it's even larger than the original file! 

At this point, each line in the outputted file still represents an individual respondent. (Well, technically it represents a group of people with the same characteristics, as specified by the PERWT variable.) 

But you probably don't ultimately want unit-level data. You want to group all these individuals by a combination of traits. For that, we have the [`lib/group.js`](lib/group.js) script. You pass it the variables you want to group by, and it returns a count of the number of people which each unique combination of those traits plus the total weight for that demographic.

	node index.js group test/usa_00028 --vars=SEX,education_group
	#Wrote grouped JSON file to test/usa_00028_grouped.json
	#Wrote grouped TSV file to test/usa_00028_grouped.tsv

Let's see what we got: 

	head -n 5 test/usa_00028_grouped.tsv

	SEX	education_group	count	population
	Female	Some college, no degree	302265	30144353
	Female	Associate's degree	109025	10614612
	Male	High school or equivalent	343733	34391610
	Male	Some college, no degree	270400	27359273

The whole file contains every unique combination of gender and education level (using the 'education_group' field we made earlier using buckets.) The script helpfully delivers this as both a tab-delimited file and a JSON file.

### Adding an "ALL" field

Sometimes it's useful to know the entire population for a certain field in addition to how it breaks down along some other set of variables. Passing `--combos` to the script will add an "ALL" column for every variable:

	node index.js group test/usa_00028 --vars=SEX,education_group --combos

	head -n 10 test/usa_00028_grouped.tsv
	
	SEX	education_group	count	population
	Female	Some college, no degree	302265	30144353
	Female	ALL	1604061	160536555
	ALL	Some college, no degree	572665	57503626
	ALL	ALL	3132795	316128839
	Female	Associate's degree	109025	10614612
	ALL	Associate's degree	189705	18603188
	Male	High school or equivalent	343733	34391610
	Male	ALL	1528734	155592284
	ALL	High school or equivalent	696990	68448266

As you see, there's now every combination of variables including an "ALL" option for each column. We're delighted to see that the population value when both columns are ALL is 316128839 -- just about the population of the country, as we would expect.


