  //uses D3 v5
  function openNav() {
    document.getElementById("mySidebar").style.width = "250px";
    document.getElementById("main").style.marginLeft = "250px";
  }

  /* Set the width of the sidebar to 0 and the left margin of the page content to 0 */
  function closeNav() {
    document.getElementById("mySidebar").style.width = "0";
    document.getElementById("main").style.marginLeft = "0";
  }

  var rangeSlider = function(){
    var slider = $('.range-slider'),
        range = $('.range-slider__range'),
        value = $('.range-slider__value');

    slider.each(function(){

      value.each(function(){
        var value = $(this).prev().attr('value');
        $(this).html(value);
      });

      range.on('input', function(){
        $(this).next(value).html(this.value);
      });
    });
  };

  rangeSlider();
  
  //heatmap variables
  const margin = {top: 50, right: 0, bottom: 100, left: 100},
        width = 960 - margin.left - margin.right,
        height = 330 - margin.top - margin.bottom;
        dateParser = d3.timeParse("%Y-%m-%d %H:%M:%S");

  //trail variables
  let jsonToGeo = [], //geojson form of json data
      allJsonToGeo = [], //geojson form of all json data read into heatmap
      lats = [],
      longs = [];

  let body = d3.select('body')
  let svg1 = body.append('svg').attr('height', 600).attr('width', 250)
  let rect = svg1.append('rect').attr('width', 175)
                  .attr('height', 310)
                  .attr('x', 50)
                  .attr('y', 250)
                  .style('fill', '#202020')
  timeLabel = svg1.append('text').text("Time")
                  .attr('x', 60)
                  .attr('y', 275)
                  .attr('fill', 'white')
  paceLabel = svg1.append('text').text("Pace")
                  .attr('x', 60)
                  .attr('y', 345)
                  .attr('fill', 'white')
  stepLabel = svg1.append('text').text("Steps")
                  .attr('x', 60)
                  .attr('y', 420)
                  .attr('fill', 'white')
  avgLabel = svg1.append('text').text("Avg Pace Deviation")
                  .attr('x', 60)
                  .attr('y', 490)
                  .attr('fill', 'white')

  // Simple
  var data = [0, 0.005, 0.01, 0.015, 0.02, 0.025];

  var sliderSimple = d3
    .sliderBottom()
    .min(d3.min(data))
    .max(d3.max(data))
    .width(300)
    .tickFormat(d3.format('.2%'))
    .ticks(5)
    .default(0.015)
    .on('onchange', val => {
      d3.select('p#value-simple').text(d3.format('.2%')(val));
    });

  var gSimple = d3
    .select('div#slider-simple')
    .append('svg')
    .attr('width', 500)
    .attr('height', 100)
    .append('g')
    .attr('transform', 'translate(30,30)');

  gSimple.call(sliderSimple);

  d3.select('p#value-simple').text(d3.format('.2%')(sliderSimple.value()));

  // Step
  var sliderStep = d3
    .sliderBottom()
    .min(d3.min(data))
    .max(d3.max(data))
    .width(300)
    .tickFormat(d3.format('.2%'))
    .ticks(5)
    .step(0.005)
    .default(0.015)
    .on('onchange', val => {
      d3.select('p#value-step').text(d3.format('.2%')(val));
    });

  var gStep = d3
    .select('div#slider-step')
    .append('svg')
    .attr('width', 500)
    .attr('height', 100)
    .append('g')
    .attr('transform', 'translate(30,30)');

  gStep.call(sliderStep);

  d3.select('p#value-step').text(d3.format('.2%')(sliderStep.value()));
  //create svg, background and time axis labels
  const svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


  //for trail viz
  L.mapbox.accessToken = 'pk.eyJ1IjoiYWZlcm4wMSIsImEiOiJja2Q1MHZjMDgwYnI4MnRzOGNwdmxlbDZ6In0.25S5ggxMm3JQhGgrJrh45A';

  const map = L.mapbox.map('map')
      .setView(new L.LatLng(40.737, -73.923), 8)
      .addLayer(L.mapbox.styleLayer('mapbox://styles/mapbox/dark-v10'));


  const mapWidth = 860 - margin.left - margin.right,
        mapHeight = 530 - margin.top - margin.bottom;

  let mapSvg = d3.select(map.getPanes().overlayPane).append("svg")
                  .attr("width", mapWidth + margin.left + margin.right)
                  .attr("height", mapHeight + margin.top + margin.bottom)
                  .attr("id","trail_layer");

  let mapg = mapSvg.append("g")
                    .attr("class", "leaflet-zoom-hide")
                    .attr("id","trail_layer");
let startClick = 0;
const startingTrail = function(){
  if(startClick === 1){
    let latExtent = d3.extent(lats);
    let longExtent = d3.extent(longs);
    let midLat = (Number((((latExtent[1] - latExtent[0]) / 2) + latExtent[0]).toFixed(13)));
    let midlong = (Number((((longExtent[1] - longExtent[0]) / 2) + longExtent[0]).toFixed(13)))
    map.setView([midLat, midlong], 17.4);
  }
  //color changing for buttons
  document.getElementById("playTrail").style.background = "#1398b2";
  if(startClick === 0 || document.getElementById("resetTrail").style.background === "orange"){
    document.getElementById("startTrail").style.background = "orange";
    document.getElementById("resetTrail").style.background = "#1398b2";
    startClick = 1;
  }else{
    document.getElementById("startTrail").style.background = "#1398b2";
    startClick = 0;
  }
  //end of color changing
  d3.json("https://gist.githubusercontent.com/a-fernando01/bedf630e25afaa03bb1949ce9b12fdb3/raw/ed48c5b758cbb35ae1777a01977b97df8226c9aa/mobility_10_07.json").then(function(jsonData){
    //variables for jsonToGeo
    let time = 0,
        name = "Along route",
        firstFullInd = 0,
        initialTime = dateParser(jsonData[0].time);

    jsonData.forEach(function(elem, i) {
      if(i === 0){
        currTime = initialTime;
      }

      if(elem.coordinates.long != undefined){
        elem.coordinates.long.forEach(function(coord, i_coord){ //loop through each coordinate entry
          if(i_coord === 0){
            let lat = elem.coordinates.lat[i_coord],
                long = coord;
            time++;
            lats.push(elem.coordinates.lat[i_coord]);
            longs.push(coord);

            if(i >= firstFullInd && i_coord === 0){
              map.setView([lat, long], 16); //set the map to orient to the first coordinate in data
              name = "Start";
            }
            //for trail data
            jsonToGeo.push({type: "Feature",
                            properties: { id: "route1",
                                          latitude: lat,
                                          longitude: long,
                                          name: name,
                                          time: dateParser(elem.time),
                                          displayTime: elem.time,
                                          pace: elem.currPace,
                                          avgPace: elem.avgPace,
                                          cadence: elem.currCad,
                                          totalSteps: elem.totalSteps,
                                          duration: dateParser(elem.time) - currTime,
                                          steps: elem.currSteps },
                            geometry: {type: "Point",
                                        coordinates: [long, lat]}});
            currTime = dateParser(elem.time);
          }
        });
      }else{
          firstFullInd++;
      }
    });
    jsonToGeo[(jsonToGeo.length - 1)].properties.name = "End"; //label last entry in array

    allJsonToGeo.push(jsonToGeo);
    jsonToGeo = [];

    //begin trail viz
    let latExtent = d3.extent(lats);
    let longExtent = d3.extent(longs);
    let midLat = (Number((((latExtent[1] - latExtent[0]) / 2) + latExtent[0]).toFixed(13)));
    let midlong = (Number((((longExtent[1] - longExtent[0]) / 2) + longExtent[0]).toFixed(13)))
    map.setView([midLat, midlong], 17.4);
    startTrailViz(0);
  });

    //function to generate trail
  const startTrailViz = function(fileNum){
    //load relevant data
    geojsonData = allJsonToGeo[fileNum];

    let initTime = geojsonData[0].time,
        timeForData = 0;

    //remove existing trail elements
    d3.selectAll("#trail_layer").remove();

    //add fresh trail svg
    mapSvg = d3.select(map.getPanes().overlayPane).append("svg")
                .attr("width", mapWidth + margin.left + margin.right)
                .attr("height", mapHeight + margin.top + margin.bottom)
                .attr("id","trail_layer");

    mapg = mapSvg.append("g")
                  .attr("class", "leaflet-zoom-hide")
                  .attr("id","trail_layer");

    //load video into player
    let currVideo = document.getElementById('video');
    currVideo.src = "2020-10-07-01-52-48-gd64-nyu-edu.mp4";

    //creating bounds for map svg
    let svgBounds = [],
        xCoords = [],
        yCoords = [];

        geojsonData.forEach(function(d, i){
            let y = d.geometry.coordinates[1],
                x = d.geometry.coordinates[0];
            latToLong = map.latLngToLayerPoint(new L.LatLng(y, x));

            xCoords.push(latToLong.x);
            yCoords.push(latToLong.y);

            //set bounds on last iteration
            if (i === geojsonData.length - 1){
                svgBounds = [[d3.min(xCoords),
                              d3.min(yCoords)],
                              [d3.max(xCoords),
                              d3.max(yCoords)]];
            }
            return svgBounds;
        });

    //transform geometry before passing it to listener
    const transform = d3.geoTransform({
        point: projectPoint
    });

    //translate JSON to SVG path codes
    const d3path = d3.geoPath().projection(transform);

    //convert input points to map coords with applyLatLngToLayer function
    const toLine = d3.line()
        .curve(d3.curveLinear)
        .x(function(d) {
            let xVal = applyLatLngToLayer(d).x;
            return xVal;
        })
        .y(function(d) {
            let yVal = applyLatLngToLayer(d).y;
            return yVal;
        });

    //points that make up the path
    const ptFeatures = mapg.selectAll("circle")
                            .data(geojsonData)
                            .enter()
                            .append("circle")
                            .attr("r", 3)
                            .attr("class", "waypoints");

    //make the points into a single line
    const linePath = mapg.selectAll(".lineConnect")
                          .data([geojsonData])
                          .enter()
                          .append("path")
                          .attr("class", "lineConnect");

    const linePathConst = mapg.selectAll(".constLineConnect")
                              .data([geojsonData])
                              .enter()
                              .append("path")
                              .attr("class", "constLineConnect");

    //place path marker
    const marker = mapg.append("circle")
                        .attr("r", 15)
                        .attr("id", "marker")
                        .attr("class", "travelMarker");


    const originANDdestination = [geojsonData[0], geojsonData[geojsonData.length - 1]]

    const begend = mapg.selectAll(".destination")
                        .data(originANDdestination)
                        .enter()
                        .append("circle", ".destination")
                        .attr("r", 5)
                        .style("fill", "red")
                        .style("opacity", "1");

    //get start and end names
    const text = mapg.selectAll("text")
                      .data(originANDdestination)
                      .enter()
                      .append("text")
                      .text(function(d) {
                          return d.properties.name
                      })
                      .attr("class", "locnames")
                      .attr("y", function(d) {
                          return -10
                      });

    //reset when user zooms
    map.on("zoomstart", reset);
    map.on("zoomend", reset);

    //add elements to map
    reset();
    linePathConst.transition()
                  .attrTween("stroke-dasharray", tweenDashforConst);

    //reposition  SVG to cover features.
    function reset() {
        linePathConst.transition()
                      .attrTween("stroke-dasharray", tweenDashforConst);

        //get lat long bounds of json data
        let svgBounds = [],
            xCoords = [],
            yCoords = [];

        geojsonData.forEach(function(d, i){
            let y = d.geometry.coordinates[1],
                x = d.geometry.coordinates[0];

            latToLong = map.latLngToLayerPoint(new L.LatLng(y, x));

            xCoords.push(latToLong.x);
            yCoords.push(latToLong.y);

            //set bounds on last iteration
            if (i === geojsonData.length - 1){
                svgBounds = [[d3.min(xCoords),
                              d3.min(yCoords)],
                              [d3.max(xCoords),
                              d3.max(yCoords)]];
            }
            return svgBounds;
        });

        const topLeft = svgBounds[0],
              bottomRight = svgBounds[1];

        //set styles
        text.attr("transform",
            function(d) {
                return "translate(" +
                    applyLatLngToLayer(d).x + "," +
                    applyLatLngToLayer(d).y + ")";
            });


        //convert from latlong to map units for points
        begend.attr("transform",
            function(d) {
                return "translate(" +
                    applyLatLngToLayer(d).x + "," +
                    applyLatLngToLayer(d).y + ")";
            });

        ptFeatures.attr("transform",
            function(d) {
                return "translate(" +
                    applyLatLngToLayer(d).x + "," +
                    applyLatLngToLayer(d).y + ")";
            });

        marker.attr("transform",
            function() {
                let y = geojsonData[0].geometry.coordinates[1]
                let x = geojsonData[0].geometry.coordinates[0]
                return "translate(" +
                    map.latLngToLayerPoint(new L.LatLng(y, x)).x + "," +
                    map.latLngToLayerPoint(new L.LatLng(y, x)).y + ")";
            });


        //set the size and location of the overall SVG container
        mapSvg.attr("width", bottomRight[0] - topLeft[0] + 120)
              .attr("height", bottomRight[1] - topLeft[1] + 120)
              .style("left", topLeft[0] - 50 + "px")
              .style("top", topLeft[1] - 50 + "px");


        linePath.attr("d", toLine)
        mapg.attr("transform", "translate(" + (-topLeft[0] + 50) + "," + (-topLeft[1] + 50) + ")");

        linePathConst.attr("d", toLine)
        mapg.attr("transform", "translate(" + (-topLeft[0] + 50) + "," + (-topLeft[1] + 50) + ")");

    }//end of reset function

    //keep track of transition for pausing
    let pauseValues = {
      lastT: 0,
      currentT: 0
    };

    //animate the trail
    function aTransition() {
        linePath.style("stroke", "#01D7FE")
            .transition()
            .duration(104000 - (pauseValues.lastT)) // take into account any pause
            .attrTween("stroke-dasharray", tweenDash)
            .on("end", function(){
                pauseValues = {
                  lastT: 0,
                  currentT: 0
                };
            });
    }
    //move marker along trail line
    function tweenDash() {
        return function(t) {
            let l = linePath.node().getTotalLength();

            t += pauseValues.lastT; // was it previously paused?

            interpolate = d3.interpolateString("0," + l, l + "," + l);
            let marker = d3.select("#marker");

            let p = linePath.node().getPointAtLength(t * l);

            pauseValues.currentT = t; // in case trail is paused

            marker.attr("transform", "translate(" + p.x + "," + p.y + ")"); //move marker
            return interpolate(t);
        }
    }
    //generate the transparent line to mark the trail
    function tweenDashforConst() {
        return function(t) {
            let l = linePathConst.node().getTotalLength();

            interpolate = d3.interpolateString("0," + l, l + "," + l);

            let p = linePathConst.node().getPointAtLength(t * l);

            return interpolate(t);
        }
    }
    //use Leaflet to implement D3 geometric transformation.
    function projectPoint(x, y) {
        let point = map.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
    }
    //converts lat/long to svg coordinates accepting point from json file
    function applyLatLngToLayer(d) {
        let y = d.geometry.coordinates[1];
        let x = d.geometry.coordinates[0];
        return map.latLngToLayerPoint(new L.LatLng(y, x));
    }

    ////////////button functionality
    let clicked = 0;
    //button to play and pause
    document.getElementById('playTrail').onclick = function() {
        //color changing for button
        if(clicked === 0){
          document.getElementById("playTrail").style.background = "orange";
          clicked = 1;
        }else{
          document.getElementById("playTrail").style.background = "#1398b2";
          clicked = 0;
        }
        //end of color changing

        //remove text on map
        mapg.selectAll("text").remove();

        d3.select("#marker").style("opacity", 0.75);
        linePath.style("opacity", 1);
        if(currVideo.paused) {
            d3.selectAll("#displayFileData").remove();
            aTransition();
            currVideo.play();

        }else {
            timeForData = currVideo.currentTime;
            displayDetails();
            linePath.style("stroke", "#01D7FE")
                .transition()
                .duration(0);
            setTimeout(function(){
                pauseValues.lastT = pauseValues.currentT; // give it a bit to stop the transition
            }, 35);
            currVideo.pause();
        }

    }

    const displayDetails = function() {
      let timeLeft = timeForData * 1000;
      let timeToDisplay,
          paceToDisplay,
          cadenceToDisplay,
          stepsToDisplay;
      for (var i = 0; i < geojsonData.length; ++i){
        if(i != 0){
          timeLeft -= ((Math.abs(geojsonData[i].properties.time -
                        geojsonData[i - 1].properties.time)));
          if(timeLeft <= 0){
            timeToDisplay = (geojsonData[i - 2].properties.displayTime).split(" ")[1];
            paceToDisplay = (geojsonData[i - 2].properties.pace).toFixed(4);
            avgPaceToDisplay = ((geojsonData[i - 2].properties.pace).toFixed(4) - (geojsonData[i - 2].properties.avgPace).toFixed(4)).toFixed(4);
            stepsToDisplay = geojsonData[i - 2].properties.totalSteps;
            console.log(timeToDisplay, paceToDisplay, cadenceToDisplay, stepsToDisplay);
            break;
          }
        }
      }
      timeText = svg1.append('text').attr("id","displayFileData").text(timeToDisplay)
                      .attr('x', 60)
                      .attr('y', 310)
                      .attr("class", "robo")
                      .attr('fill', 'white')
      paceText = svg1.append('text').attr("id","displayFileData").text(paceToDisplay)
                      .attr('x', 60)
                      .attr('y', 380)
                      .attr("class", "robo")
                      .attr('fill', 'white')
      stepText = svg1.append('text').attr("id","displayFileData").text(stepsToDisplay)
                      .attr('x', 60)
                      .attr('y', 455)
                      .attr("class", "robo")
                      .attr('fill', 'white')
      avgText = svg1.append('text').attr("id","displayFileData").text(avgPaceToDisplay)
                      .attr('x', 60)
                      .attr('y', 525)
                      .attr("class", "robo")
                      .attr('fill', 'white')
    }//end of function

    //reset trail visualization button
    let resetClick = 0;
    document.getElementById('resetTrail').onclick = function() {
        //color change for button
        document.getElementById("playTrail").style.background = "#1398b2";
        document.getElementById("startTrail").style.background = "#1398b2";
        if(resetClick === 0){
          document.getElementById("resetTrail").style.background = "orange";
          document.getElementById("startTrail").style.background = "#1398b2";
          resetClick = 1;
        }else{
          document.getElementById("resetTrail").style.background = "#1398b2";
          resetClick = 0;
        }
        //end of color change

        let latExtent = d3.extent(lats);
        let longExtent = d3.extent(longs);
        let midLat = (Number((((latExtent[1] - latExtent[0]) / 2) + latExtent[0]).toFixed(13)));
        let midlong = (Number((((longExtent[1] - longExtent[0]) / 2) + longExtent[0]).toFixed(13)))
        map.setView([midLat, midlong], 17.4);

        currVideo.currentTime = 0;
        currVideo.pause();

        pauseValues.lastT = 0;
        pauseValues.currentT = 0;

        d3.select("#marker").style("opacity", 0);
        linePath.style("opacity", 0);
    }
  }//end of startTrailViz function

}
