// Function to  be plotted
function himmelblau(x, y){
	return Math.pow(Math.pow(x, 2) + y - 11, 2) + Math.pow(x + Math.pow(y, 2) - 7, 2)
}

// Data for plotting
var precision = 0.1;
var x = d3.range(-6, 6, precision);
var y = d3.range(-6, 6, precision);

var n = x.length;
var m = y.length;

var z = [];
for (var i = m - 1; i >= 0; i--){
	for (var j = 0;  j < n; j ++){
		var k = j + (m - 1 - i)* n
		z[k] = himmelblau(x[j], y[i]);
	}
}

var mins = [
	{x: 3, y: 2},
	{x: -2.805118, y: 3.131312},
	{x: -3.779310, y: -3.283186},
	{x: 3.584428, y: -1.848126}
];