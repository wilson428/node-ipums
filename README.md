node-ipums
==========

Parse IPUMS files with Node

### Usage

Install dependencies:

	npm install

Then specify the name of the file you want to parse:

	node index.js /path/to/usaTK

This will look for two files: `/path/to/usaTK.dat` and `/path/to/usaTK.cbk`. It will write to `/path/to/usaTK_refined.csv`.

For large files, you may want to pump in more memory:

	node --max-old-space-size=8192 index.js /Users/cwilson1130/Downloads/usa_00007

If you want to reduce the resulting file size, pass `--reduced`, which will delete the fields that it condenses into buckets, as well as some other useless ones.

### Patience

With the extra memory and reduced output, this can churn through 15 million lines in about 300 seconds. You can adjust the number of lines it buffers before writing (10,000, by default) with `--buffer`.

### What the hell, my "refined" file is twice the size of the original!

That's because it filled in the verbose values for the fields -- "Married, spouse present" instead of "6", etc. Deal with it. 