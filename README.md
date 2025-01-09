# InformationVisualization
## ArtVis: Global Art Exhibition Trends (1905–1915)

## Description
This project visualizes global art exhibition trends from 1905 to 1915 using interactive visualizations. Users can explore:
- An interactive map showing the number of exhibitions per country.
- Pie charts displaying the top cities per country for exhibitions and the distribution of exhibition types.
- Year-based filtering using a slider to explore historical trends.

The visualization is built using **D3.js** and is fully responsive and interactive.

## Features
- Interactive choropleth map to visualize the number of exhibitions by country.
- Pie chart showing top cities by exhibitions in a selected country.
- Bar chart showing distribution of exhibition types (e.g., solo vs. group).
- Year filtering using a slider to explore historical trends.
- Tooltips providing detailed information about each country.
- Hover effects and click events for deeper insights.

## Hosted Version
The visualization can be accessed online at:
https://ritaselimi.github.io/InformationVisualization/

## How to Run Locally
1. **Clone the repository**:
2. **Navigate to the project directory**:
3. **Start a local web server** (required for loading local assets like JSON or CSV files):
     ```bash
     python -m http.server
     ```
4. **Access the visualization**:
   - Open your browser and navigate to:
     ```
     http://localhost:8000
     ```
## Project Structure
The repository contains the following files:
- `index.html`: Main HTML file for the visualization.
- `style.css`: Styling for the visualization.
- `script.js`: JavaScript code, including the interactive visualizations.
- `cleaned_artvis.csv`: Dataset of exhibitions (1905–1915).
- `custom.geo.json`: GeoJSON data for map rendering.
- `README.md`: Documentation for the project.

## Dataset
- **cleaned_artvis.csv**: Contains exhibition data, including year, country, city, type, and paintings.
- **custom.geo.json**: GeoJSON file for rendering the choropleth map.

## Contributors
- Rita Selimi
- Rea Kasumi
```
