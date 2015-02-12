module.exports = function(list) {
    // Thx http://codereview.stackexchange.com/questions/7001/better-way-to-generate-all-combinations
    var fn = function(active, rest, a) {
        if (!active.length && !rest.length) {
            return;
        } else if (!rest.length) {
            a.push(active);
            return;
        } else {
            fn(active.concat(rest[0]), rest.slice(1), a);
            fn(active, rest.slice(1), a);
        }
        return a;
    }
    return fn([], list, []);
}