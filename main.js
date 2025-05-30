// 1: SET GLOBAL VARIABLES
const margin = { top: 50, right: 150, bottom: 60, left: 70 };
const width = 900 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Create SVG containers for both charts
const svg1_temp = d3.select("#lineChart1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const svg2_precip = d3.select("#lineChart2")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// 2.a: LOAD DATA
d3.csv("weather.csv").then(rawData => {

    // 2.b: TRANSFORM DATA for temperature chart
    let tempData = rawData.map(d => ({
        year: parseInt(d.record_max_temp_year),
        temp: +d.record_max_temp
    }))
    .filter(d => !isNaN(d.year) && !isNaN(d.temp))
    .sort((a, b) => a.year - b.year)
    .filter((d, i) => i % 10 === 0); // Keep every 10th year

    // 2.c: TRANSFORM DATA for precipitation chart
    const parseDate = d3.timeParse("%m/%d/%Y");
    const formatMonthYear = d3.timeFormat("%Y-%m");

    let precipData = rawData.map(d => ({
        city: d.city,
        date: parseDate(d.date),
        actual_precipitation: +d.actual_precipitation
    }))
    .filter(d => d.date != null && !isNaN(d.actual_precipitation));

    // Group and average by city and month
    const dataMap2 = d3.rollups(
        precipData,
        v => d3.mean(v, d => d.actual_precipitation),
        d => d.city,
        d => formatMonthYear(d.date)
    );

    const cityDataArr = dataMap2.map(([city, values]) => ({
        city,
        values: values.map(([monthStr, avgPrecip]) => ({ // ChatGPT used to help write values code.
            month: d3.timeParse("%Y-%m")(monthStr),
            avgPrecip
        })).sort((a, b) => a.month - b.month)
    }));

    // ----------- CHART 1: Temperature Over Years -----------
    const xTemp = d3.scaleLinear()
        .domain(d3.extent(tempData, d => d.year))
        .range([0, width]);

    const yTemp = d3.scaleLinear()
        .domain([d3.min(tempData, d => d.temp) - 5, d3.max(tempData, d => d.temp) + 5])
        .range([height, 0]);

    const lineTemp = d3.line()
        .x(d => xTemp(d.year))
        .y(d => yTemp(d.temp));

    svg1_temp.append("path")
        .datum(tempData)
        .attr("fill", "none")
        .attr("stroke", "#2D789E")
        .attr("stroke-width", 2)
        .attr("d", lineTemp);

    svg1_temp.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xTemp).tickFormat(d3.format("d")));

    svg1_temp.append("g")
        .call(d3.axisLeft(yTemp));

    svg1_temp.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Year");

    svg1_temp.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Record Max Temperature (°F)");



        // updateChart function 
function updateChart(selectedYear) {
    const year = +selectedYear;
    const selected = tempData.find(d => d.year === year);
  
    // Remove previous highlights
    svg1_temp.selectAll(".highlight-circle").remove();
    svg1_temp.selectAll(".highlight-label").remove();
  
    if (selected) {
      svg1_temp.append("circle")
        .attr("class", "highlight-circle")
        .attr("cx", xTemp(selected.year))
        .attr("cy", yTemp(selected.temp))
        .attr("r", 5)
        .attr("fill", "red");
  
      svg1_temp.append("text")
        .attr("class", "highlight-label")
        .attr("x", xTemp(selected.year) + 8)
        .attr("y", yTemp(selected.temp) - 10)
        .attr("fill", "red")
        .text(`${selected.temp}°F`);
    }
  }
  

// Get a reference to the dropdown
const yearSelect = document.getElementById("yearSelect");
const years = [...new Set(tempData.map(d => d.year))];

// Populate the dropdown with year options
years.forEach(year => {
  const option = document.createElement("option");
  option.value = year;
  option.textContent = year;
  yearSelect.appendChild(option);
});

// Update chart when dropdown changes
yearSelect.addEventListener("change", function () {
  updateChart(this.value);
});


const trendSelect = document.getElementById("trendSelect");

trendSelect.addEventListener("change", function() {
  updateTrendline(this.value);
});


// trendline
function updateTrendline(type) {
    // Remove existing trendline if any
    svg1_temp.selectAll(".trendline").remove();
  
    if (type === "linear") {
      // Simple linear regression for tempData
      const n = tempData.length;
      const sumX = d3.sum(tempData, d => d.year);
      const sumY = d3.sum(tempData, d => d.temp);
      const sumXY = d3.sum(tempData, d => d.year * d.temp);
      const sumX2 = d3.sum(tempData, d => d.year * d.year);
  
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
  
      // Create points for the trendline based on x domain
      const xDomain = d3.extent(tempData, d => d.year);
      const trendPoints = xDomain.map(x => ({
        year: x,
        temp: slope * x + intercept
      }));
  
      const lineTrend = d3.line()
        .x(d => xTemp(d.year))
        .y(d => yTemp(d.temp));
  
      svg1_temp.append("path")
        .datum(trendPoints)
        .attr("class", "trendline")
        .attr("fill", "none")
        .attr("stroke", "orange")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("d", lineTrend);
    } else if (type === "movingAvg") {
      // Simple moving average (window size = 3)
      const windowSize = 3;
      let movingAvgData = [];
  
      for (let i = 0; i < tempData.length - windowSize + 1; i++) {
        let windowSlice = tempData.slice(i, i + windowSize);
        let avgYear = d3.mean(windowSlice, d => d.year);
        let avgTemp = d3.mean(windowSlice, d => d.temp);
        movingAvgData.push({ year: avgYear, temp: avgTemp });
      }
  
      const lineTrend = d3.line()
        .x(d => xTemp(d.year))
        .y(d => yTemp(d.temp));
  
      svg1_temp.append("path")
        .datum(movingAvgData)
        .attr("class", "trendline")
        .attr("fill", "none")
        .attr("stroke", "green")
        .attr("stroke-width", 2)
        .attr("d", lineTrend);
    }
  }
  



    // ----------- CHART 2: Precipitation by City -----------
    let xMonth = d3.scaleTime() 
    .domain(d3.extent(precipData, d => d.date)) // ChatGPT used to help write this line (used .extent instead of .max).
    .range([0, width]);

    let yAvgPrecip = d3.scaleLinear()
        .domain([0, d3.max(cityDataArr.flatMap(d => d.values.map(v => v.avgPrecip)))]) // ChatGPT used to help write this line. 
        .range([height, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(cityDataArr.map(d => d.city));

    const linePrecip = d3.line()
        .x(d => xMonth(d.month))
        .y(d => yAvgPrecip(d.avgPrecip));

    cityDataArr.forEach(cityEntry => {
        svg2_precip.append("path")
            .datum(cityEntry.values)
            .attr("fill", "none")
            .attr("stroke", color(cityEntry.city))
            .attr("stroke-width", 2)
            .attr("d", linePrecip);
    });

    svg2_precip.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xMonth).tickFormat(d3.timeFormat("%b %Y")));

    svg2_precip.append("g")
        .call(d3.axisLeft(yAvgPrecip));

    svg2_precip.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .text("Month");

    svg2_precip.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Avg. Actual Monthly Precipitation");

    // ----------- LEGEND for precipitation chart -----------
    const legend = svg2_precip.append("g")
        .attr("transform", `translate(${width + 20}, 0)`);

    cityDataArr.forEach((d, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(d.city));

        legend.append("text")
            .attr("x", 18)
            .attr("y", i * 20 + 10)
            .style("font-size", "12px")
            .attr("alignment-baseline", "middle")
            .text(d.city);
    });

    // --- INTERACTIVITY CHART 2 ---

    // Tooltip

    const allCityPoints = cityDataArr.flatMap(city => 
        city.values.map(d => ({ ...d, city: city.city }))
    );

    const tooltip = d3.select("body") // Create tooltip
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background", "rgba(0, 0, 0, 0.7)")
        .style("color", "white")
        .style("padding", "10px")
        .style("border-radius", "5px")
        .style("font-size", "12px");

    svg2_precip.selectAll(".data-point") // Create tooltip events
        .data(allCityPoints) // Bind only the filtered STEM data
        // .data([selectedCategoryData]) // D7: Bind only to category selected by dropdown menu
        .enter()
        .append("circle")
        .attr("class", "data-point")
        .attr("cx", d => xMonth(d.month))
        .attr("cy", d => yAvgPrecip(d.avgPrecip))
        .attr("r", 5)
        .style("fill", d => color(d.city))
        .style("opacity", 0)  // Make circles invisible by default
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible")
            .html(`
                <strong>City:</strong> ${d.city}<br>
                <strong>Month:</strong> ${d3.timeFormat("%b %Y")(d.month)}<br>
                <strong>Avg. Actual Precipitation (in):</strong> ${d.avgPrecip.toFixed(2)}
            `)
                .style("top", (event.pageY + 10) + "px") // Position relative to pointer
                .style("left", (event.pageX + 10) + "px");

            // Make the hovered circle visible
            d3.select(this).style("opacity", 1);  // Set opacity to 1 on hover

            // Create the large circle at the hovered point
            svg2_precip.append("circle")
                .attr("class", "hover-circle")
                .attr("cx", xMonth(d.month))  // Position based on the xScale (year)
                .attr("cy", yAvgPrecip(d.avgPrecip)) // Position based on the yScale (count)
                .attr("r", 6)  // Radius of the large circle
                .style("fill", color(d.city)) // Circle color
                .style("stroke-width", 2);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");

            // Remove the hover circle when mouseout occurs
            svg2_precip.selectAll(".hover-circle").remove();

            // Make the circle invisible again
            d3.select(this).style("opacity", 0);  // Reset opacity to 0 when not hovering
        });

});