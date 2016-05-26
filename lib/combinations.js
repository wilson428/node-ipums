// Thx http://codereview.stackexchange.com/questions/7001/better-way-to-generate-all-combinations

module.exports = function(set) {
    console.log(set);
    return "a";
    var fn = function(active, rest, a) {
        console.log(active, rest, a);
        if (!active && !rest)
            return;
        if (!rest) {
            a.push(active);
        } else {
            fn(active + rest[0], rest.slice(1), a);
            fn(active, rest.slice(1), a);
        }
        return a;
    }
    return fn("", list, []);
}
