///////////////////////////////////////
//                                   //
//          Helper Functions         //
//                                   //
///////////////////////////////////////

// Create copy of object (can't use object.assign in IE)
function objectAssign(obj){
    var keys = Object.keys(obj);
    var newObj = {};

    keys.forEach(function(key){newObj[[key]] = obj[[key]];})

    return newObj;
}

// Calculate Euclidean distance between 2 points
function distance(pointA, pointB){
    return Math.sqrt(Math.pow((pointA.x - pointB.x), 2) + Math.pow((pointA.y - pointB.y), 2));
}

// Calculate mean of an array of numbers
function mean(values){
    return values.reduce(function(accumulator, currentValue){return accumulator + currentValue;}) / values.length;
}

// Calculate standard deviation of an array of numbers
function standardDeviation(values){
    var mean = values.reduce(function(accumulator, currentValue){return accumulator + currentValue;}) / values.length;
    var sqDev = values.map(function(val){return Math.pow((val - mean), 2);});
    var meanSqDev = sqDev.reduce(function(accumulator, currentValue){return accumulator + currentValue;}) / sqDev.length;

    return Math.sqrt(meanSqDev);
}

// Write triangle coordinates as SVG path
function trianglePath(triangles){
    var path = "M " + xScale(triangles[0].x) + "," + yScale(triangles[0].y);
    path += " L " + xScale(triangles[1].x) + "," + yScale(triangles[1].y);
    path += " L " + xScale(triangles[2].x) + "," + yScale(triangles[2].y) + " Z";

    return path;
}

// Create copy of array containing the points of a triangle
function copyTriangle(triangle){
    return triangle.map(function(obj){return objectAssign(obj);});
}

// Determine if triangles are too close to be distinguished
function closeTriangle(triangleA, triangleB){
    var tol = 0.02;
    var farPoints = triangleA.filter(function(point, index){return distance(point, triangleB[index]) >= tol;});

    return farPoints.length == 0;
}

// Enable/Disable user interaction when animation ends/starts
function disableUser(){
    if (zoomHelpText){
        zoomHelpText.remove();
    }

    document.getElementById("graph").style.cursor = "default";
    graphArea.on("mouseover", null)
             .on("mousemove", null)
             .on("mouseout", null)
             .on("click", null);
    simulate = true;
}

function enableUser(){
    d3.select("#triangle").remove();
    graphArea.on("mouseover", function(){
                 showCrosshair(this, true);
                 showCoords(this, true);
             })
             .on("mousemove", function(){
                 showCrosshair(this, true);
                 showCoords(this, true);
             })
             .on("mouseout", function(){
                 showCrosshair(this, false);
                 showCoords(this, false);
             })
             .on("click", animateNelderMead);
    document.getElementById("graph").style.cursor = "pointer";
    simulate = false;
    radarSignal();
}

///////////////////////////////////////
//                                   //
//        Nelder Mead Algorithm      //
//                                   //
///////////////////////////////////////

// Return all triangles formed by the Nelder-Mead algorithm given an intial triangle
function nelderMead(f, simplex, alpha, beta, gamma){
    var tol = Math.pow(10, -16);
    var tempSimplex = copyTriangle(simplex);
    var simplexHistory = [copyTriangle(tempSimplex)];

    while (true){
        // Evaluate function on current simplex, return estimate if standard deviation is small
        var values = tempSimplex.map(function(point){return f(point.x, point.y);});

        var minValue = d3.min(values);
        var maxValue = d3.max(values);

        var minIndex = values.indexOf(minValue);
        var maxIndex = values.indexOf(maxValue);

        var minPoint = tempSimplex[minIndex];
        var maxPoint = tempSimplex[maxIndex];

        var simplexMinusWorst = tempSimplex.filter(function(val, index){return index != maxIndex;});

        var xCoords = simplexMinusWorst.map(function(point){return point.x});
        var yCoords = simplexMinusWorst.map(function(point){return point.y});

        var centroid = {
            x: mean(xCoords),
            y: mean(yCoords)
        };

        if (standardDeviation(values) < tol){
            return {point: minPoint, val: minValue, history: simplexHistory};
        }

        // Create a new simplex by transforming the worst point
        var reflectPoint = {
            x: centroid.x + alpha * (centroid.x - maxPoint.x),
            y: centroid.y + alpha * (centroid.y - maxPoint.y)
        };

        var reflectValue = f(reflectPoint.x, reflectPoint.y);
        var valuesMinusWorst = values.filter(function(val, index){return index != maxIndex;});

        if (reflectValue >= minValue && reflectValue < d3.max(valuesMinusWorst)){
            tempSimplex[maxIndex] = reflectPoint;
        }else if (reflectValue < minValue){
            var expandPoint = {
                x: centroid.x + gamma * (reflectPoint.x - centroid.x),
                y: centroid.y + gamma * (reflectPoint.y - centroid.y)
            };

            var expandValue = f(expandPoint.x, expandPoint.y);

            if (expandValue < reflectValue){
                tempSimplex[maxIndex] = expandPoint;
            }else{
                tempSimplex[maxIndex] = reflectPoint;
            }
        }else{
            var contractPoint = {
                x: centroid.x + beta * (maxPoint.x - centroid.x),
                y: centroid.y + beta * (maxPoint.y - centroid.y)
            };

            var contractValue = f(contractPoint.x, contractPoint.y);

            if (contractValue <= d3.min(reflectValue, maxValue)){
                tempSimplex[maxIndex] = contractPoint;
            }else{
                for (var i = 0; i < tempSimplex.length; i++){
                    tempSimplex[i].x = (tempSimplex[i].x + minPoint.x) / 2;
                    tempSimplex[i].y = (tempSimplex[i].y + minPoint.y) / 2;
                }
            }
        }

        if (simplexHistory.length == 0 || !closeTriangle(tempSimplex, simplexHistory[simplexHistory.length - 1])){
            simplexHistory.push(copyTriangle(tempSimplex));
        }
    }
}

// Animate all steps of the Nelder-Mead algorithm
function animateNelderMead(){
    // Disable clicking/hovering events
    disableUser();

    // Create initial simplex by expanding mouse position into a right triangle
    var mouseX = currScale.x.invert(d3.mouse(this)[0]);
    var mouseY = currScale.y.invert(d3.mouse(this)[1]);

    var stepSize = 1;
    var initialSimplex = [];

    initialSimplex.push({
        x: mouseX,
        y: mouseY
    });

    if ((mouseX + stepSize) < d3.max(x)){
        initialSimplex.push({
            x: mouseX + stepSize,
            y: mouseY
        });
    }else{
        initialSimplex.push({
            x: mouseX - stepSize,
            y: mouseY
        });
    }

    if ((mouseY + stepSize) < d3.max(y)){
        initialSimplex.push({
            x: mouseX,
            y: mouseY + stepSize
        });
    }else{
        initialSimplex.push({
            x: mouseX,
            y: mouseY - stepSize
        });
    }

    // Reset zoom
    root.call(zoom.transform, d3.zoomIdentity);

    // Animate steps of Nelder-Mead algorithm
    var duration = 1000;
    var triangles = nelderMead(himmelblau, initialSimplex, 1, 0.5, 2).history;
    var currTriangle = graphArea.append("path")
                                  .attr("id", "triangle")
                                  .attr("stroke", "red")
                                  .attr("fill", "none")
                                  .attr("d", trianglePath([triangles[0][0], triangles[0][0], triangles[0][0]]));

    triangles.forEach(function(d, index){
        currTriangle = currTriangle.transition()
                                   .duration(duration)
                                   .attr("d", trianglePath(d))

        if (index < (triangles.length - 1)){
            return;
        }

        currTriangle = currTriangle.on("end", function(){
            enableUser();
        });
    });
}