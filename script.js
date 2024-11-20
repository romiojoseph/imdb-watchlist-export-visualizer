// DOM Elements
let csvData = [];
let isSampleData = true;

// Constants for title types and year ranges
const VALID_TITLE_TYPES = [
    'Movie',
    'Short',
    'TV Movie',
    'TV Short',
    'TV Series',
    'TV Mini Series',
    'TV Special'
];

const YEAR_RANGES = [
    { label: '1890–1929', start: 1890, end: 1929 },
    { label: '1930–1959', start: 1930, end: 1959 },
    { label: '1960–1979', start: 1960, end: 1979 },
    { label: '1980–1999', start: 1980, end: 1999 },
    { label: '2000–2019', start: 2000, end: 2019 },
    { label: '2020–Present', start: 2020, end: new Date().getFullYear() }
];

const RATING_CATEGORIES = {
    'Boring': [1, 2, 3],
    'Average': [4, 5, 6],
    'Good': [7, 8, 9],
    'Masterpiece': [10],
    'Not rated': []
};

const RUNTIME_RANGES = [
    { label: '0-40 mins', min: 0, max: 40 },
    { label: '41-60 mins', min: 41, max: 60 },
    { label: '61-90 mins', min: 61, max: 90 },
    { label: '91-150 mins', min: 91, max: 150 },
    { label: '151+ mins', min: 151, max: Infinity }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    preloadSampleData();
});

function initializeApp() {
    const fileInput = document.getElementById('csvFile');
    fileInput.addEventListener('change', handleFileSelect);

    // Tooltip for CSV export instructions
    const tooltipTrigger = document.getElementById('csv-export-info');
    const tooltip = document.createElement('div');
    tooltip.className = 'export-tooltip';
    tooltip.textContent = 'Sign in to your IMDb account, hover over your username, click "Your Watchlist," then click "Export" and download the file when it is ready.';

    tooltipTrigger.appendChild(tooltip);

    tooltipTrigger.addEventListener('mouseover', () => {
        const triggerRect = tooltipTrigger.getBoundingClientRect();
        tooltip.style.top = `${triggerRect.bottom + 5}px`;
        tooltip.style.left = `${triggerRect.left}px`;
    });
}

async function preloadSampleData() {
    try {
        const response = await fetch('assets/sample.csv');
        const text = await response.text();
        csvData = Papa.parse(text, {
            header: true,
            skipEmptyLines: true
        }).data;

        analyzeData();
    } catch (error) {
        console.error('Error loading sample data:', error);
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.csv')) {
        isSampleData = false;
        clearPreviousData();
        analyzeData();
    } else {
        alert('Please select a valid CSV file. If you are unsure how to export your IMDb watchlist, sign in to your IMDb account, hover over your username, click "Your Watchlist," then click "Export" and download the file when it is ready.');
    }
}

function clearPreviousData() {
    csvData = [];

    const titleTypeCards = document.getElementById('titleTypeCards');
    titleTypeCards.innerHTML = '';

    // Clear all charts using the helper function
    clearChart('movieRatingChart');
    clearChart('otherRatingChart');
    clearChart('yearRangeChart');
    clearChart('imdbRatingChart');
    clearChart('yearlyWatchedChart');
    clearChart('genreTreemap');
    clearChart('genreStackedChart');
    clearChart('directorChart');
    clearChart('runtimeChart');
}

function clearChart(chartId) {
    const chartContainer = document.querySelector(`#${chartId}`);
    if (chartContainer) {
        chartContainer.innerHTML = '';
    }
}

async function analyzeData() {
    const file = document.getElementById('csvFile').files[0];
    if (file && !isSampleData) {
        try {
            const text = await file.text();
            csvData = Papa.parse(text, {
                header: true,
                skipEmptyLines: true
            }).data;

            // Check if the CSV data is compatible
            if (!isValidCSVData(csvData)) {
                alert('The selected CSV file is not compatible. Please ensure it is exported from IMDb. Sign in to your IMDb account, hover over your username, click "Your Watchlist," then click "Export" and download the file when it is ready.');
                return;
            }
        } catch (error) {
            console.error('Error analyzing data:', error);
            alert('Error analyzing the CSV file');
            return;
        }
    }

    // Create watchlist age card
    const years = calculateWatchlistAge();
    createCard('Years of curating', `${years}`);

    // Generate all visualizations
    createTitleTypeCards();
    createRatingPieCharts();
    createYearRangeChart();
    createIMDbRatingChart();
    createYearlyWatchedChart();
    createGenreTreemap(await loadGenreMapping());
    createGenreStackedChart(await loadGenreMapping());
    createDirectorsAnalysis();
    createRuntimeAnalysis();
}

function isValidCSVData(data) {
    // Check if the CSV data contains the required columns
    const requiredColumns = ['Title Type', 'Year', 'IMDb Rating', 'Your Rating', 'Genres', 'Directors', 'Runtime (mins)', 'Created'];
    const firstRow = data[0];
    return requiredColumns.every(column => column in firstRow);
}

async function loadGenreMapping() {
    try {
        const response = await fetch('assets/genre.json');
        return await response.json();
    } catch (error) {
        console.error('Error loading genre mapping:', error);
        return {};
    }
}

function getRatingCategory(rating) {
    if (!rating) return 'Not rated';
    rating = parseInt(rating);

    for (const [category, range] of Object.entries(RATING_CATEGORIES)) {
        if (range.includes(rating)) return category;
    }
    return 'Not rated';
}

function createTitleTypeCards() {
    const counts = VALID_TITLE_TYPES.reduce((acc, type) => {
        acc[type] = csvData.filter(item => item['Title Type'] === type).length;
        return acc;
    }, {});

    // Create cards using counts object
    Object.entries(counts).forEach(([type, count]) => {
        createCard(type, count);
    });
}

function createRatingPieCharts() {
    // Movies pie chart
    const movieData = csvData.filter(item => item['Title Type'] === 'Movie');
    const movieRatings = analyzeRatings(movieData);

    // Other content pie chart
    const otherData = csvData.filter(item =>
        VALID_TITLE_TYPES.includes(item['Title Type']) &&
        item['Title Type'] !== 'Movie'
    );
    const otherRatings = analyzeRatings(otherData);

    createPieChart('movieRatingChart', 'Movie Ratings', movieRatings);
    createPieChart('otherRatingChart', 'Other Content Ratings', otherRatings);
}

function analyzeRatings(data) {
    const ratings = {
        'Boring': 0,
        'Average': 0,
        'Good': 0,
        'Masterpiece': 0,
        'Not rated': 0
    };

    data.forEach(item => {
        const category = getRatingCategory(item['Your Rating']);
        ratings[category]++;
    });

    return ratings;
}

function createYearRangeChart() {
    const yearData = YEAR_RANGES.map(range => {
        const itemsInRange = csvData.filter(item => {
            const year = parseInt(item.Year);
            return year >= range.start && year <= range.end;
        });

        const ratingBreakdown = analyzeRatings(itemsInRange);
        return {
            range: range.label,
            ...ratingBreakdown
        };
    });

    createStackedColumnChart('yearRangeChart', yearData);
}

function createIMDbRatingChart() {
    const ratingCounts = {};
    for (let i = 1; i <= 10; i++) {
        ratingCounts[i] = {
            total: 0,
            ratingBreakdown: {
                'Boring': 0,
                'Average': 0,
                'Good': 0,
                'Masterpiece': 0,
                'Not rated': 0
            }
        };
    }

    csvData.forEach(item => {
        const imdbRating = Math.floor(parseFloat(item['IMDb Rating']));
        if (imdbRating >= 1 && imdbRating <= 10) {
            ratingCounts[imdbRating].total++;
            const userRatingCategory = getRatingCategory(item['Your Rating']);
            ratingCounts[imdbRating].ratingBreakdown[userRatingCategory]++;
        }
    });

    createBarChart('imdbRatingChart', ratingCounts);
}

function createYearlyWatchedChart() {
    const yearlyData = {};

    csvData.forEach(item => {
        const year = parseInt(item.Year);
        if (!yearlyData[year]) {
            yearlyData[year] = {
                total: 0,
                'Boring': 0,
                'Average': 0,
                'Good': 0,
                'Masterpiece': 0,
                'Not rated': 0
            };
        }

        yearlyData[year].total++;
        const category = getRatingCategory(item['Your Rating']);
        yearlyData[year][category]++;
    });

    createAreaChart('yearlyWatchedChart', yearlyData);
}

function createGenreTreemap(genreMapping) {
    const genreCounts = {};

    csvData.forEach(item => {
        if (!VALID_TITLE_TYPES.includes(item['Title Type'])) return;

        const genres = item.Genres.split(',').map(g => g.trim());
        genres.forEach(genre => {
            // Find main category for this genre
            const mainCategory = findMainCategory(genre, genreMapping);
            if (mainCategory) {
                genreCounts[mainCategory] = (genreCounts[mainCategory] || 0) + 1;
            }
        });
    });

    createTreemapChart('genreTreemap', genreCounts);
}

function findMainCategory(genre, genreMapping) {
    for (const [category, subgenres] of Object.entries(genreMapping)) {
        if (subgenres.includes(genre)) return category;
    }
    return null;
}

function createGenreStackedChart(genreMapping) {
    const genreData = {};

    Object.keys(genreMapping).forEach(mainGenre => {
        genreData[mainGenre] = {
            'Boring': 0,
            'Average': 0,
            'Good': 0,
            'Masterpiece': 0,
            'Not rated': 0
        };
    });

    csvData.forEach(item => {
        if (!VALID_TITLE_TYPES.includes(item['Title Type'])) return;

        const genres = item.Genres.split(',').map(g => g.trim());
        const ratingCategory = getRatingCategory(item['Your Rating']);

        genres.forEach(genre => {
            const mainCategory = findMainCategory(genre, genreMapping);
            if (mainCategory && genreData[mainCategory]) {
                genreData[mainCategory][ratingCategory]++;
            }
        });
    });

    createStackedColumnChart('genreStackedChart', genreData);
}

// ApexCharts configuration functions
function createPieChart(elementId, title, data) {
    const options = {
        series: Object.values(data),
        labels: Object.keys(data),
        colors: ['#FF5C5C', '#FFD54C', '#44C59A', '#4CAF50', '#e5e5e5'],
        chart: {
            type: 'pie',
            height: 480,
            align: 'center',
            offsetY: -2
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            width: 1
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            offsetX: -35
        },
        tooltip: {
            custom: function ({ seriesIndex, w }) {
                const label = w.config.labels[seriesIndex];
                const value = w.config.series[seriesIndex];
                const total = w.config.series.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);

                return `
                    <div class="custom-tooltip">
                        <div class="tooltip-title">${label}</div>
                        <div class="tooltip-content">
                            <div>Count: ${value}</div>
                            <div>Percentage: ${percentage}%</div>
                        </div>
                    </div>
                `;
            }
        }
    };

    new ApexCharts(document.querySelector(`#${elementId}`), options).render();
}

function createStackedColumnChart(elementId, data) {
    const labels = elementId === 'yearRangeChart'
        ? YEAR_RANGES.map(range => range.label)
        : Object.keys(data);

    const options = {
        series: Object.keys(RATING_CATEGORIES).map(category => ({
            name: category,
            data: Object.values(data).map(item => item[category])
        })),
        colors: ['#FF5C5C', '#FFD54C', '#44C59A', '#4CAF50', '#e5e5e5'],
        chart: {
            type: 'bar',
            height: 480,
            stacked: true,
            stackType: '100%'
        },
        xaxis: {
            categories: labels
        },
        yaxis: {
            labels: {
                show: false
            }
        },
        dataLabels: {
            enabled: false
        },
        legend: {
            position: 'bottom',
            horizontalAlign: 'left',
            offsetX: -35
        },
        tooltip: {
            custom: function ({ series, seriesIndex, dataPointIndex, w }) {
                const category = labels[dataPointIndex];
                const ratings = Object.keys(RATING_CATEGORIES);

                // Calculate total for this category
                const total = series.reduce((sum, curr) => sum + curr[dataPointIndex], 0);

                let tooltipContent = `
                    <div class="custom-tooltip">
                        <div class="tooltip-title">${category}</div>
                        <div class="tooltip-content">
                            <div>Total watched: ${total}</div>
                            <div class="card-label">Your ratings</div>
                `;

                // Add each rating category with count and percentage
                ratings.forEach((rating, index) => {
                    const count = series[index][dataPointIndex];
                    const percentage = ((count / total) * 100).toFixed(1);
                    tooltipContent += `
                        <div>${rating}: ${count} (${percentage}%)</div>
                    `;
                });

                tooltipContent += `
                        </div>
                    </div>
                `;

                return tooltipContent;
            }
        }
    };

    new ApexCharts(document.querySelector(`#${elementId}`), options).render();
}

function createBarChart(elementId, data) {
    const options = {
        series: [{
            name: 'Total Watched',
            data: Object.values(data).map(item => item.total)
        }],
        chart: {
            type: 'bar',
            height: 480
        },
        dataLabels: {
            enabled: false
        },
        legend: {
            position: 'bottom',
            horizontalAlign: 'left',
            offsetX: -35
        },
        xaxis: {
            categories: Object.keys(data)
        },
        colors: ['#3358d4'],
        tooltip: {
            custom: function ({ seriesIndex, dataPointIndex, w }) {
                const rating = dataPointIndex + 1;
                const breakdown = data[rating].ratingBreakdown;
                return `
                    <div class="custom-tooltip">
                        <div class="tooltip-title">IMDb Rating: ${rating}</div>
                        <div class="tooltip-content">
                            <div>Total watched: ${data[rating].total}</div>
                            <div class="card-label">Your ratings</div>
                            ${Object.entries(breakdown)
                        .map(([category, count]) =>
                            `<div>${category}: ${count}</div>`
                        ).join('')}
                        </div>
                    </div>
                `;
            }
        }
    };

    new ApexCharts(document.querySelector(`#${elementId}`), options).render();
}

function createAreaChart(elementId, data) {
    const years = Object.keys(data).sort();

    const series = [
        { name: 'Total Watched', data: years.map(year => data[year].total) },
        { name: 'Boring', data: years.map(year => data[year]['Boring']) },
        { name: 'Average', data: years.map(year => data[year]['Average']) },
        { name: 'Good', data: years.map(year => data[year]['Good']) },
        { name: 'Masterpiece', data: years.map(year => data[year]['Masterpiece']) },
        { name: 'Not rated', data: years.map(year => data[year]['Not rated']) }
    ];

    const options = {
        series: series,
        chart: {
            type: 'area',
            height: 680,
            zoom: {
                enabled: true
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            width: 1,
            colors: ['#70A1FF', '#FF5C5C', '#FFD54C', '#44C59A', '#4CAF50', '#a3a3a3']
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 0.5,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100]
            },
            colors: ['#70A1FF', '#FF5C5C', '#FFD54C', '#44C59A', '#4CAF50', '#e5e5e5']
        },
        legend: {
            position: 'bottom',
            horizontalAlign: 'left',
            offsetX: -35
        },
        xaxis: {
            categories: years,
            labels: {
                show: true
            }
        },
        yaxis: {
            max: function (max) {
                return max * 1.1; // Add 10% extra space above the maximum value
            }
        },
        tooltip: {
            custom: function ({ seriesIndex, dataPointIndex, w }) {
                const year = years[dataPointIndex];
                const yearData = data[year];
                return `
                    <div class="custom-tooltip">
                        <div class="tooltip-title">${year}</div>
                        <div class="tooltip-content">
                            <div>Total watched: ${yearData.total}</div>
                            <div class="card-label">Your ratings</div>
                            ${Object.entries(yearData)
                        .filter(([key]) => key !== 'total')
                        .map(([category, count]) =>
                            `<div>${category}: ${count}</div>`
                        ).join('')}
                        </div>
                    </div>
                `;
            }
        }
    };

    new ApexCharts(document.querySelector(`#${elementId}`), options).render();
}

function createTreemapChart(elementId, data) {
    const options = {
        series: [{
            data: Object.entries(data).map(([name, value]) => ({
                x: name,
                y: value
            }))
        }],
        chart: {
            type: 'treemap',
            height: 720
        },
        stroke: {
            width: 1
        },
        colors: ['#3358d4'],
        dataLabels: {
            enabled: true
        },
        legend: {
            position: 'bottom',
            horizontalAlign: 'left',
            offsetX: -35
        },
        tooltip: {
            custom: function ({ dataPointIndex, w }) {
                const data = w.config.series[0].data[dataPointIndex];
                const total = w.config.series[0].data.reduce((sum, item) => sum + item.y, 0);
                const percentage = ((data.y / total) * 100).toFixed(1);

                return `
                    <div class="custom-tooltip">
                        <div class="tooltip-title">${data.x}</div>
                        <div class="tooltip-content">
                            <div>Count: ${data.y}</div>
                            <div>Percentage: ${percentage}%</div>
                        </div>
                    </div>
                `;
            }
        }
    };

    new ApexCharts(document.querySelector(`#${elementId}`), options).render();
}

function createCard(type, count) {
    const cardContainer = document.getElementById('titleTypeCards');
    const card = document.createElement('div');
    card.className = 'title-type-card';

    card.innerHTML = `
        <p class="card-label">${type}</p>
        <h1>${count.toLocaleString()}</h1>
    `;
    cardContainer.appendChild(card);
}

function calculateWatchlistAge() {
    let oldestDate = new Date(9999, 11, 31); // Initialize to a very distant future date

    csvData.forEach(item => {
        if (item.Created) {
            // Parse date in YYYY-MM-DD format
            const [year, month, day] = item.Created.split('-').map(Number);
            const itemDate = new Date(year, month - 1, day); // month is 0-based
            if (itemDate < oldestDate) {
                oldestDate = itemDate;
            }
        }
    });

    const today = new Date();
    let yearDiff = today.getFullYear() - oldestDate.getFullYear();

    // Adjust for the month and day difference
    if (today.getMonth() < oldestDate.getMonth() ||
        (today.getMonth() === oldestDate.getMonth() && today.getDate() < oldestDate.getDate())) {
        yearDiff--;
    }

    // Calculate the exact year difference including months and days
    const exactYearDiff = yearDiff + (today.getMonth() - oldestDate.getMonth()) / 12 + (today.getDate() - oldestDate.getDate()) / 365;

    return Math.round(exactYearDiff); // Round to the nearest whole number
}

function createDirectorsAnalysis() {
    const directorStats = {};

    csvData.forEach(item => {
        if (!item.Directors) return;

        const directors = item.Directors.split(',').map(d => d.trim());
        directors.forEach(director => {
            if (!directorStats[director]) {
                directorStats[director] = {
                    total: 0,
                    'Boring': 0,
                    'Average': 0,
                    'Good': 0,
                    'Masterpiece': 0,
                    'Not rated': 0
                };
            }

            directorStats[director].total++;
            const ratingCategory = getRatingCategory(item['Your Rating']);
            directorStats[director][ratingCategory]++;
        });
    });

    // Get top 15 directors by total count
    const top15Directors = Object.entries(directorStats)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 15)
        .reduce((acc, [director, stats]) => {
            acc[director] = stats;
            return acc;
        }, {});

    createStackedColumnChart('directorChart', top15Directors);
}

function createRuntimeAnalysis() {
    const runtimeStats = RUNTIME_RANGES.reduce((acc, range) => {
        acc[range.label] = {
            total: 0,
            'Boring': 0,
            'Average': 0,
            'Good': 0,
            'Masterpiece': 0,
            'Not rated': 0
        };
        return acc;
    }, {});

    csvData.forEach(item => {
        const runtime = parseInt(item['Runtime (mins)']);
        if (isNaN(runtime)) return;

        const range = RUNTIME_RANGES.find(r => runtime >= r.min && runtime <= r.max);
        if (!range) return;

        runtimeStats[range.label].total++;
        const ratingCategory = getRatingCategory(item['Your Rating']);
        runtimeStats[range.label][ratingCategory]++;
    });

    createDonutChart('runtimeChart', runtimeStats);
}

function createDonutChart(elementId, data) {
    const series = Object.values(data).map(stats => stats.total);
    const labels = Object.keys(data);

    const options = {
        series: series,
        labels: labels,
        colors: ['#e1e9ff', '#c1d0ff', '#8da4ef', '#3358d4', '#1f2d5c'],
        chart: {
            type: 'donut',
            height: 480,
            align: 'center',
            offsetY: 0
        },
        dataLabels: {
            enabled: false
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '50%'
                }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            offsetX: -35,
            offsetY: -2
        },
        tooltip: {
            custom: function ({ seriesIndex, w }) {
                const label = w.config.labels[seriesIndex];
                const stats = data[label];
                const total = stats.total;

                return `
                    <div class="custom-tooltip">
                        <div class="tooltip-title">${label}</div>
                        <div class="tooltip-content">
                            <div>Total watched: ${total}</div>
                            <div class="card-label">Your ratings</div>
                            <div>Boring: ${stats['Boring']}</div>
                            <div>Average: ${stats['Average']}</div>
                            <div>Good: ${stats['Good']}</div>
                            <div>Masterpiece: ${stats['Masterpiece']}</div>
                            <div>Not rated: ${stats['Not rated']}</div>
                        </div>
                    </div>
                `;
            }
        }
    };

    new ApexCharts(document.querySelector(`#${elementId}`), options).render();
}

document.getElementById('csvFile').addEventListener('change', function () {
    const fileName = this.files.length > 0 ? this.files[0].name : '';
    const fileText = document.getElementById('fileText');
    const fileNameElement = document.getElementById('fileName');

    if (fileName) {
        fileText.style.display = 'inline';  // Show "Selected file:" text
        fileNameElement.textContent = fileName; // Display the file name
    } else {
        fileText.style.display = 'none';  // Hide "Selected file:" text if no file is selected
        fileNameElement.textContent = ''; // Clear the file name
    }
});
