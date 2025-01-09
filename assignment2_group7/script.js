// Declare global variables
let data, aggregatedData, geoData;
let selectedCountry = 'DE'; // Track the currently selected country

// Tooltip container
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "country-tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "rgba(52, 89, 149, 0.8)") // Softer blue with transparency
    .style("color", "#fff")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("font-family", "Arial, sans-serif")
    .style("font-size", "12px");

// Load Data
d3.csv("data/cleaned_artvis.csv").then(rawData => {
    console.log("CSV Data Loaded", rawData);
    data = preprocessRawData(rawData);

    // Preprocess aggregated data
    aggregatedData = preprocessAggregatedData(data);

    // Load GeoJSON and initialize the map
    d3.json("data/custom.geo.json").then(rawGeoData => {
        console.log("GeoJSON Data Loaded", rawGeoData);
        geoData = rawGeoData;

        initializeMap(); // Draw the initial map
        drawMap(aggregatedData, 1905); // Default year
    });
});


// Preprocess raw data
function preprocessRawData(rawData) {
    return rawData.map(d => ({
        ...d,
        year: +d["e.startdate"],
        country: d["e.country"].toUpperCase().trim(),
        city: d["e.city"].trim(),
        type: d["e.type"].trim(),
        paintings: +d["e.paintings"] || 0 // Parse paintings as numeric
    }));
}

// Aggregate data by country and year
function preprocessAggregatedData(data) {
    return d3.rollup(
        data,
        v => v.length, // Count number of exhibitions
        d => d.country,
        d => d.year
    );
}

function initializeMap() {
    const svg = d3.select("#map")
        .append("svg")
        .attr("width", 1120)
        .attr("height", 500)
        .call(
            d3.zoom().on("zoom", event => {
                svg.selectAll("g").attr("transform", event.transform);
            })
        );

    // Add a light blue background for water
    svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "#cce7ff"); // Light blue color for water

    svg.append("g").attr("class", "map-layer");

    // Add a legend
    addLegend();
}

// Add vertical legend
function addLegend() {
    const legendWidth = 10;
    const legendHeight = 420;

    const legendSvg = d3.select("#map")
        .append("svg")
        .attr("width", 60)
        .attr("height", legendHeight + 50)
        .style("margin-left", "10px");

    const gradient = legendSvg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "0%") // Vertical gradient
        .attr("y1", "100%")
        .attr("y2", "0%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d3.interpolateGreens(0.3)); // Start with mid-green

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d3.interpolateGreens(1)); // End with dark green

    legendSvg.append("rect")
        .attr("x", 20)
        .attr("y", 20)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    legendSvg.append("text")
        .attr("x", 35)
        .attr("y", 25)
        .style("font-size", "12px")
        .style("text-anchor", "start")
        .text("High");

    legendSvg.append("text")
        .attr("x", 35)
        .attr("y", legendHeight + 25)
        .style("font-size", "12px")
        .style("text-anchor", "start")
        .text("Low");
}

function drawMap(data, year) {
    const yearData = Array.from(data, ([country, years]) => ({
        country,
        count: years.get(year) || 0 // Default to 0 if no data is available for the year
    }));

    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(yearData, d => d.count)])
        .interpolator(t => d3.interpolateGreens(t * 0.7 + 0.3));

    const svg = d3.select("svg");
    const projection = d3.geoMercator().scale(130).translate([480, 250]);
    const path = d3.geoPath().projection(projection);

    svg.select(".map-layer")
        .selectAll("path")
        .data(geoData.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const countryCode = d.properties.iso_a2;
            const countryData = yearData.find(c => c.country === countryCode);
            // If no data exists, use a neutral color
            return countryData && countryData.count > 0 ? colorScale(countryData.count) : "#e0e0e0"; // Light gray for no data
        })
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .on("mouseover", function (event, d) {
            const countryCode = d.properties.iso_a2;
            const countryData = yearData.find(c => c.country === countryCode);
            const info = getCountryInfo(countryCode, countryData, year); // Pass the year here
        
            tooltip.html(info)
                .style("visibility", "visible")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mousemove", function (event) {
            tooltip.style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
        })
        .on("click", (event, d) => {
            const countryCode = d.properties.iso_a2;
            selectedCountry = countryCode; // Update selected country
            console.log(`Country clicked: ${countryCode}`);
            updatePieCharts(countryCode, year); // Update pie charts
            document.getElementById('selected-country').textContent = selectedCountry;
        });
}

// Get country info for tooltip
function getCountryInfo(countryCode, countryData, year) {
    // Filter data for the selected year and country
    const countryRecords = data.filter(d => d.country === countryCode && d.year === year);

    // If no records exist for the country and year, return no data message
    if (countryRecords.length === 0) {
        return `<strong>${countryCode}</strong><br>No data available for ${year}.`;
    }

    const totalExhibitions = countryRecords.length;

    // Aggregate data for type proportions
    const typeCounts = d3.rollup(
        countryRecords,
        v => v.length,
        d => d.type
    );

    const dominantType = Array.from(typeCounts).reduce((a, b) => (a[1] > b[1] ? a : b), ["None", 0])[0];

    const totalTypes = Array.from(typeCounts, ([key, value]) => ({
        type: key,
        percentage: ((value / totalExhibitions) * 100).toFixed(1)
    }));

    // Aggregate data for top cities
    const cityCounts = d3.rollup(
        countryRecords,
        v => v.length,
        d => d.city
    );

    const keyCities = Array.from(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([city]) => city);

    const uniqueArtists = new Set(countryRecords.map(d => d["a.id"])).size;
    const avgPaintings = (
        d3.mean(countryRecords, d => d.paintings) || 0
    ).toFixed(1);

    return `
        <strong>${countryCode} (${year}):</strong><br>
        <strong>Total Exhibitions:</strong> ${totalExhibitions}<br>
        <strong>Dominant Type:</strong> ${dominantType}<br>
        <strong>Proportions:</strong><br>
        ${totalTypes.map(t => `- ${t.type}: ${t.percentage}%`).join("<br>")}<br>
        <strong>Key Cities:</strong> ${keyCities.join(", ")}<br>
        <strong>Unique Artists:</strong> ${uniqueArtists}<br>
        <strong>Avg Paintings per Exhibition:</strong> ${avgPaintings}
    `;
}

function filterBarChartData(countryCode, year, attribute) {
    const filteredData = data.filter(d => d.country === countryCode && d.year === year);

    const aggregatedData = d3.rollup(
        filteredData,
        v => v.length,
        d => d[attribute]
    );

    return Array.from(aggregatedData, ([key, value]) => ({ key, value }));
}

// Update pie charts
function updatePieCharts(countryCode, year) {
    filterPieChartData(countryCode, year, "e.city", "#pie-chart");
    const barData = filterBarChartData(countryCode, year, "e.type");
    renderTypeChart(barData, "#pie-chart-type");
}

// Filter data for pie chart
function filterPieChartData(countryCode, year, attribute, chartId) {
    const filteredData = data.filter(d => d.country === countryCode && d.year === year);

    const aggregatedData = d3.rollup(
        filteredData,
        v => v.length,
        d => d[attribute]
    );

    const pieData = Array.from(aggregatedData, ([key, value]) => ({ key, value }));

    renderPieChart(pieData, chartId);
}

function renderPieChart(pieData, chartId) {
    const pieSvg = d3.select(chartId)
        .attr("width", 400)
        .attr("height", 400)
        .attr("viewBox", "0 0 400 400");

    // Clear previous chart content
    pieSvg.selectAll("*").remove();

    const radius = 200;
    const g = pieSvg.append("g").attr("transform", `translate(${radius}, ${radius})`);

    const pastelColors = [
        "#345995", "#F8333C", "#FCAB10", "#2B9EB3", "#DBD5B5", "#94524A", "#A3C3D9", "#AE76A6",
        "#E40066", "#45a049", "#E8C3C3", "#C3E8D9", "#D4C3E8"
    ];

    const color = d3.scaleOrdinal(pastelColors);

    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // Draw pie slices
    g.selectAll("path")
        .data(pie(pieData))
        .join("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.key))
        .on("mouseover", function (event, d) {
            // Show tooltip with name and value
            tooltip.html(`${d.data.key}: ${d.data.value} exhibitions`)
                .style("visibility", "visible")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mousemove", function (event) {
            // Move the tooltip with the cursor
            tooltip.style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function () {
            // Hide the tooltip on mouse out
            tooltip.style("visibility", "hidden");
        });

    // Add title to the pie chart
    pieSvg.append("text")
        .attr("x", 200) // Centered horizontally
        .attr("y", 20)  // Adjust for padding
        .style("text-anchor", "middle")
        .style("font-size", "25px")
        .style("font-weight", "bold")
        .style("fill", "#45a049") // Title color
        .text(`Top Cities by Exhibitions, Country: ${selectedCountry}`); // Use template literal

}

function renderTypeChart(barData, chartId) {
    const barSvg = d3.select(chartId)
        .attr("width", 400)
        .attr("height", 400)
        .attr("viewBox", "0 0 400 400");

    // Clear previous chart content
    barSvg.selectAll("*").remove();

    // Define margins and dimensions
    const margin = { top: 50, right: 20, bottom: 50, left: 50 }; // Adjust top margin for title
    const width = 400 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = barSvg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
        .domain(barData.map(d => d.key))
        .range([0, width])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.value)])
        .nice()
        .range([height, 0]);

    const pastelColors = ["#345995", "#F8333C", "#FCAB10", "#2B9EB3"];
    const color = d3.scaleOrdinal(pastelColors);

    // Axes
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("font-size", "12px")
        .style("text-anchor", "middle")
        .style("fill", "#345995"); // Axis text color

    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale).ticks(5))
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", "#345995"); // Axis text color

    // Bars
    g.selectAll(".bar")
        .data(barData)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.key))
        .attr("y", d => yScale(d.value))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.value))
        .attr("fill", d => color(d.key))
        .attr("stroke", "#fff") // Add a white border for better visibility
        .attr("stroke-width", 1)
        .on("mouseover", function (event, d) {
            // Show tooltip with name and value
            tooltip.html(`<strong>${d.key}</strong>: ${d.value} exhibitions`)
                .style("visibility", "visible")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mousemove", function (event) {
            // Move the tooltip with the cursor
            tooltip.style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", function () {
            // Hide the tooltip on mouse out
            tooltip.style("visibility", "hidden");
        });

    // Add Y-axis label
    g.append("text")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "middle")
        .style("font-size", "15px")
        .style("fill", "#345995") // Axis label color
        .style("font-weight", "bold")
        .text("Number of Exhibitions");

    // Add title to the bar chart
    barSvg.append("text")
        .attr("x", width / 2 + margin.left) // Centered horizontally
        .attr("y", margin.top / 2)  // Adjust for padding
        .style("text-anchor", "middle")
        .style("font-size", "25px")
        .style("font-weight", "bold")
        .style("fill", "#45a049") // Title color
        .text(`Exhibition Types Distribution, Country: ${selectedCountry}`);
}

// Add slider functionality
d3.select("#time-slider").on("input", function () {
    const year = +this.value;
    d3.select("#year").text(year);
    drawMap(aggregatedData, year); // Update map with new year

    if (selectedCountry) {
        // If a country is selected, update the pie charts for the new year
        updatePieCharts(selectedCountry, year);
    }
});
