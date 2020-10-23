var cpuChart = (function() {

    var exported = {},
        x, y, z,
        yAxis,
        stack,
        nest,
        area,
        svg,
        margin = {
            top: 20,
            right: 30,
            bottom: 30,
            left: 40
        },
        width = 490 - margin.left - margin.right,
        height = 280 - margin.top - margin.bottom;

    x = d3.time.scale()
        .range([0, width]);

    y = d3.scale.linear()
        .range([height, 0]);

    z = d3.scale.ordinal()
        .domain(["clear blue", "clear blue 2", "clear purple", "dark purple", "skin", "orange", "bright orange", "a", "b", "c", "d"])
        .range(["#4F89BA", "#4F708B", "#1A4E79", "#7DB1DD", "#97BDDD"]);

    yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    stack = d3.layout.stack()
        .offset("zero")
        .values(function(d) {
            return d.values;
        })
        .x(function(d) {
            return d.date;
        })
        .y(function(d) {
            return d.value;
        });

    nest = d3.nest()
        .key(function(d) {
            return d.key;
        });

    area = d3.svg.area()
        .interpolate("cardinal")
        .x(function(d) {
            return x(d.date);
        })
        .y0(function(d) {
            return y(d.y0);
        })
        .y1(function(d) {
            return y(d.y0 + d.y);
        });

    svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    function renderLegend(data, svg) {

        if (data.length === 0) return;

        svg.selectAll('.legend').remove();


        var legendKeys = 0,
            dateStamp = data[0].date.toString(),
            dataLength = data.length,
            legend,
            i;

        for (i = 0; i < dataLength; i++) {
            if (data[i].date.toString() === dateStamp) {
                legendKeys++;
            } else {
                break;
            }
        }

        legend = svg.selectAll('.legend')
            .data(data.slice(0, legendKeys));

        legend.enter()
            .append('g')
            .attr('class', 'legend');

        legend.data(data);

        legend.append('rect')
            .attr("x", width - 195)
            .attr('y', function(d, i) {
                return i * 20;
            })
            .attr('width', 10)
            .attr('height', 10)
            .style("fill", function(d, i) {
                return z(i);
            });

        legend.append('text')
            .attr("x", width - 180)
            .attr('y', function(d, i) {
                return (i * 20) + 9;
            })
            .text(function(d) {
                return d.name + ": " + d.cpuUsage;
            });


    }


    function refreshChart(data) {

        var xAxis,
            layers,
            dataMax,
            minDomain;

        // here we are clearing the old axis and view data
        // this should really be handled on an update
        d3.selectAll('.axis').remove();
        svg.selectAll(".layer").remove();

        xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(d3.time.seconds, 5);

        data.forEach(function(d) {
            //we are already passing a date obj (thats what it wants)
            //d.date = format.parse(d.date);

            d.value = +d.value;
        });

        layers = stack(nest.entries(data));

        x.domain(d3.extent(data, function(d) {
            return d.date;
        }));
        //y.domain([0, d3.max(data, function(d) { return d.y0 + d.y; })]);

        //lets have the domain of y extend at least to 10
        dataMax = d3.max(data, function(d) {
            return d.y0 + d.y;
        });
        minDomain = (dataMax + 8) < 10 ? 10 : dataMax + 8;
        y.domain([0, minDomain]);

        svg.selectAll(".layer")
            .data(layers)
            .enter().append("path")
            .attr("class", "layer")
            .attr("d", function(d) {
                return area(d.values);
            })
            .style("fill", function(d, i) {
                return z(i);
            });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (height + 3) + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        renderLegend(data, svg);

    } //end refresh chart


    function reloadProcInfo(procList, refreshChart) {


        fin.desktop.System.getProcessList(function(arrList) {

            var date = new Date(),
                timeKey = date.getTime(),
                currentProcesses = {};

            currentProcesses[timeKey] = {};

            arrList.forEach(function(item) {

                item.key = item.name;
                item.value = item.cpuUsage;
                item.date = new Date(timeKey);

                currentProcesses[timeKey][item.name] = item;

            });

            procList.addToFront(currentProcesses);

            //update the chart each cycle
            refreshChart(procListToD3Array(procList.getArray()));

            return setTimeout(function() {
                reloadProcInfo(procList, refreshChart);
            }, 2000);

        }, function(err) {
            console.log('this was the err', err);
        });
    }


    function procListToD3Array(procList) {
        var returnArr = [],
            listLength = procList.length,
            procSet,
            proc,
            indiProc;

        while (listLength--) {
            procSet = procList[listLength];
            for (proc in procSet) {
                for (indiProc in procSet[proc]) {
                    returnArr.unshift(procSet[proc][indiProc]);
                }
            }
        }

        return returnArr;
    }


    function CappedArray(max) {
        var arr = [];

        function addToFront(item) {
            if (arr.length >= max) {
                arr.pop();
            }
            arr.unshift(item);
        }

        function addToBack() {
            if (arr.length >= max) {
                arr.shift();
            }
            arr.push(item);
        }

        return {
            "addToFront": addToFront,
            "addToBack": addToBack,
            "getArray": function() {
                return arr;
            }
        };
    }


    exported.initChart = function() {
        var procList = CappedArray(10);
        reloadProcInfo(procList, refreshChart);
    };


    return exported;

})();
