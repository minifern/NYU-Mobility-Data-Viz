/*
  Heatmap to display daily step data 
  Functionality (as of 7/21):
    -add  days by entering .json link
    -double click on individual cards for detailed step data
    -delete days

  To Do:
    -improve error catching for invalid links
    -collate files from the same date
    -handle deleting of multiple days
    -add spot for comparison of multiple days' data
  */

  const margin = {top: 50, right: 0, bottom: 100, left: 100},
    width = 960 - margin.left - margin.right,
    height = 530 - margin.top - margin.bottom,
    textHeight = 465,
    gridSize = Math.floor(width / 24),
    legendElementWidth = gridSize*2.7,
    buckets = 9,
    colors = ["#46D2FB","#5CD0DD","#73CEBF","#89CCA2","#A0CA84","#B7C866","#CDC649","#E4C42B","#FBC20E"],
    times = ["4AM", "5", "6", "7", "8", "9", "10", "11", "12","1","2","3","4","5","6", "7", "8", "9", "10", "11", "12", "1", "2", "3AM"],
    dateParser = d3.timeParse("%Y-%m-%d %H:%M:%S");

  let dayList = [], //dates represented in json data
    jsonFiles = [], //list of links to json data
    relData = [], //day, hour, steps
    day = 1,  //used to position cards on svg
    generationCounter = 0, //number of times heatmap is generated
    spliceDayList = false, //whether to delete entry from dayList
    dayToFilter = 0; //index of dayList to remove

  //create svg, background and time axis labels
  const svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const background = svg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "#202020");

  const timeLabels = svg.selectAll(".timeLabel")
      .data(times)
      .enter().append("text")
        .text((d) => d)
        .attr("x", (d, i) => i * gridSize)
        .attr("y", 0)
        .style("text-anchor", "middle")
        .attr("transform", "translate(" + gridSize / 2 + ", -6)")
        .attr("class", "timeLabel mono axis axis-worktime");

  const heatmapChart = function(files){
    //loop through each file in array jsonFiles
    files.forEach(function(file, i){

      dayList = [];
      day = 1;
      //access each json file 
      d3.json(file).then(function(data){

        if(i == 0){ //get date for first file
          latestDate = (dateParser(data[0].time).getMonth() + 1) + "-" + dateParser(data[0].time).getDate() + "-" + dateParser(data[0].time).getFullYear();
          dayList.push(latestDate);
        }

        currDate = (dateParser(data[i].time).getMonth() + 1) + "-" + dateParser(data[i].time).getDate() + "-" + dateParser(data[i].time).getFullYear(); //get date string for current file
        
        if(latestDate != currDate){ //if file is for a new date
          day += 1;
          latestDate = currDate;
          dayList.push(latestDate);
        }

        if(i === (files.length - 1)){ //if last iteration in file loop
          let hour = dateParser(data[0].time).getHours();
          //get relevant data from json file
          data.forEach(function(elem, i) {

            currHour = dateParser(elem.time).getHours();

            if (hour != currHour || i===0){
              stepCount = d3.sum(
                data.filter(d => dateParser(d.time).getHours() === currHour),
                  d => d.steps
                );

              relData.push({day: day, hour: currHour, steps: stepCount});
              hour = currHour;
            }
          });
        }
        //create cards, date labels and legend
        const generateHeatmap = function(data){

          d3.selectAll("#timeLabels").remove();
          d3.selectAll("#cards").remove();
          d3.selectAll("#legend").remove();

          if(spliceDayList){ //need to error catch for deleting multiple files from the same day
            jsonFiles.splice(dayToFilter - 1, 1);
            dayList.splice(dayToFilter - 1, 1);
            spliceDayList = false;
          }
          //generate date labels
          const dayLabels = svg.selectAll(".dayLabel")
            .data(dayList)
            .enter().append("text")
              .text(function (d) { return d; })
              .attr("x", 0)
              .attr("y", (d, i) => i * gridSize)
              .style("text-anchor", "end")
              .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
              .attr("class", "dayLabel mono axis axis-workweek")
              .attr("id", "timeLabels")
              .on('dblclick', function(d, i){ //deleting a day entry
                d3.select(this).remove();

                dayToFilter = i+1;

                relData = relData.filter(function(elem){
                  return elem.day !== dayToFilter;
                });

                if(i === 0){ //if first entry is deleted

                  relData.forEach(function(elem){
                    if((elem.day - 1) > 0){
                      elem.day = (elem.day - 1);
                    }
                  });

                }else if(i !== (dayList.length - 1)){//if middle entry is deleted

                  relData.forEach(function(elem){
                    if((elem.day) > dayToFilter){
                      elem.day = (elem.day - 1);
                    }
                  });
                }

                spliceDayList = true;
                
                //regenerate heatmap with selected cards removed
                generateHeatmap(relData);
              });

          //generate cards svg
          const colorScale = d3.scaleQuantile()
            .domain([d3.min(data, (d) => d.steps), d3.max(data, (d) => d.steps)])
            .range(colors);

          let cards = svg.selectAll(".hour")
            .data(data, (d) => d.day + ':' + d.hour);

          cards.append("title");

          cards.enter().append("rect")
              .attr("x", (d) => (d.hour) * gridSize)
              .attr("y", (d) => (d.day - 1) * gridSize)
              .attr("rx", 4)
              .attr("ry", 4)
              .attr("class", "hour bordered")
              .attr("id", "cards")
              .attr("width", gridSize)
              .attr("height", gridSize)
              .on('dblclick', function(d){ //display detailed information about card
                d3.select(this)
                  .transition()
                  .duration(100)
                  .style("fill", "#fa7d74");

                svg.append("text")
                  .attr("class", "mono")
                  .attr("id", "details")
                  .attr("x", 10)
                  .attr("y", textHeight)
                  .attr("dy", ".35em")
                  .attr("text-anchor", "left")
                  .text("Patient walked " + d.steps + " steps between " + (d.hour + 4) + ":00 and " + (d.hour + 5) + ":00.")
                  .style("fill", "white");
              })
              .on('click', function(d){ //hide detailed information
                d3.select(this)
                  .transition()
                  .duration(200)
                  .style("fill", (d) => colorScale(d.steps));

                d3.select("#details").remove();
              })
              .merge(cards)
              .transition()
              .style("fill", "grey")
              .transition()
              .delay(100)
              .style("fill", (d) => colorScale(d.steps));
              

          cards.select("title").text((d) => d.steps);

          cards.exit().remove();

          //create legend
          const legend = svg.selectAll(".legend")
              .data([0].concat(colorScale.quantiles()), (d) => d)
              .attr("transform","translate(0," + (30 * day) + ")");

          const legend_g = legend.enter().append("g")
              .attr("class", "legend")
              .attr("id", "legend")
              .attr("transform","translate(0," + (30 * day) + ")");

          legend_g.append("rect")
              .attr("x", (d, i) => (legendElementWidth * i) + 6)
              .attr("y", (230 - margin.top - margin.bottom))
              .attr("width", legendElementWidth)
              .attr("height", gridSize / 2)
              .style("fill", (d, i) => colors[i]);

          legend_g.append("text")
              .attr("class", "mono")
              .text((d) => Math.round(d))
              .attr("x", (d, i) => (legendElementWidth * i) + 6)
              .attr("y", (230 - margin.top - margin.bottom) + gridSize);

          legend.exit().remove();
        }

        //remove cards to readjust for new data 
        if(generationCounter > 1){
          d3.selectAll("#timeLabels").remove();
          d3.selectAll("#cards").remove();
          d3.selectAll("#legend").remove();
        }

        generateHeatmap(relData);
        generationCounter++;

      });
    });
  }

  //add file button
  const addJSON = function(d, error){
    let invalidLink = true,
      link = window.prompt("Enter link to file: ");

    if(link == null){ //user clicks 'cancel' on prompt window
      return;
    }

    do { //check for invalid url
      if(link.slice((link.length - 5), link.length) != ".json" || link.length < 5){
        link = window.prompt("Invalid Link. Enter another link to file: ");
      }else{
        invalidLink = false;
      }
    }while (invalidLink);

    jsonFiles.push(link);
    heatmapChart(jsonFiles);
  }
