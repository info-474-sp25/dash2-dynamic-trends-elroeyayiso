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
        values: values.map(([monthStr, avgPrecip]) => ({
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

    // ----------- CHART 2: Precipitation by City -----------
    const xMonth = d3.scaleTime()
        .domain([
            d3.min(cityDataArr, c => d3.min(c.values, v => v.month)),
            d3.max(cityDataArr, c => d3.max(c.values, v => v.month))
        ])
        .range([0, width]);

    const yAvgPrecip = d3.scaleLinear()
        .domain([0, d3.max(cityDataArr, c => d3.max(c.values, v => v.avgPrecip)) * 1.1])
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
        .call(d3.axisBottom(xMonth).tickFormat(d3.timeFormat("%Y-%m")));

    svg2_precip.append("g")
        .call(d3.axisLeft(yAvgPrecip));

    svg2_precip.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Month");

    svg2_precip.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Average Monthly Precipitation");

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
});
