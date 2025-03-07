document.addEventListener('DOMContentLoaded', function() {
    
    // API Key
    const apiKey = 'Your Api Key'
    // DOM Elements
    const cityInput = document.getElementById('city-search');
    const searchBtn = document.getElementById('search-btn');
    const cityEl = document.getElementById('city');
    const dateEl = document.getElementById('date');
    const tempEl = document.getElementById('temperature');
    const feelsLikeEl = document.getElementById('feels-like-temp');
    const highLowEl = document.getElementById('high-low');
    const descriptionEl = document.getElementById('weather-description');
    const weatherIconEl = document.getElementById('weather-icon');
    const unitsToggleBtn = document.getElementById('units-toggle');
    const weatherCard = document.querySelector('.weather-card');
    
    // Weather icons mapping
    const weatherIcons = {
        'Clear': 'https://cdn-icons-png.flaticon.com/512/979/979585.png',
        'Clouds': 'https://cdn-icons-png.flaticon.com/512/4834/4834559.png',
        'Rain': 'https://cdn.iconscout.com/icon/free/png-256/free-cloud-rain-icon-download-in-svg-png-gif-file-formats--rainny-forecast-weather-pack-nature-icons-3219522.png',
        'Snow': 'https://cdn-icons-png.flaticon.com/512/8675/8675121.png',
        'Thunderstorm': 'https://cdn1.iconfinder.com/data/icons/weather-forecast-meteorology-color-1/128/weather-thunderstorm-512.png',
        'Drizzle': 'https://cdn.iconscout.com/icon/free/png-256/free-drizzle-icon-download-in-svg-png-gif-file-formats--sun-weather-daylight-icons-pack-445611.png?f=webp&w=256',
        'Haze': 'https://cdn-icons-png.flaticon.com/512/1197/1197102.png',
        'Fog': 'https://cdn-icons-png.flaticon.com/512/7774/7774309.png'
    };
    
    // Variables
    let units = 'metric'; // Default to Celsius
    
    // Create error message element
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.style.display = 'none';
    document.querySelector('.container').insertBefore(errorMessage, weatherCard);
    
    // Format date
    function formatDate(date) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    
    // Update current date
    function updateDate() {
        const now = new Date();
        dateEl.textContent = formatDate(now);
    }
    
    // Get day of week
    function getDayOfWeek(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    }
    
    // Get the appropriate weather icon
    function getWeatherIcon(weatherMain) {
        return weatherIcons[weatherMain] || weatherIcons['Clouds']; // Default to clouds if not found
    }
    
    // Toggle temperature units
    function toggleUnits() {
        if (units === 'metric') {
            units = 'imperial';
            unitsToggleBtn.textContent = '°F';
        } else {
            units = 'metric';
            unitsToggleBtn.textContent = '°C';
        }
        
        // Fetch weather data again with new units
        if (cityEl.textContent) {
            getWeatherData(cityEl.textContent);
        }
    }
    
    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    
    // Get weather data from API
    async function getWeatherData(city) {
        try {
            // Hide any previous error
            errorMessage.style.display = 'none';
            
            // Show loading state
            cityEl.textContent = 'Loading...';
            
            // Current weather
            const currentResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${apiKey}`);
            
            if (!currentResponse.ok) {
                // Check specific error codes
                if (currentResponse.status === 404) {
                    throw new Error('City not found. Please check the spelling or try another city.');
                } else if (currentResponse.status === 401) {
                    throw new Error('API key error. Please check your API key.');
                } else {
                    throw new Error(`Error: ${currentResponse.statusText}`);
                }
            }
            
            const currentData = await currentResponse.json();
            
            // Update UI with current weather
            cityEl.textContent = currentData.name;
            tempEl.textContent = `${Math.round(currentData.main.temp)}°`;
            feelsLikeEl.textContent = `${Math.round(currentData.main.feels_like)}°`;
            highLowEl.textContent = `${Math.round(currentData.main.temp_max)}° / ${Math.round(currentData.main.temp_min)}°`;
            descriptionEl.textContent = currentData.weather[0].main;
            weatherIconEl.src = getWeatherIcon(currentData.weather[0].main);
            
            // 5-day forecast
            const forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=${units}&appid=${apiKey}`);
            
            if (!forecastResponse.ok) {
                throw new Error('Error fetching forecast data.');
            }
            
            const forecastData = await forecastResponse.json();
            
            // Update hourly forecast (first 5 entries, including NOW)
            const timeSlots = document.querySelectorAll('.time-slot');
            timeSlots[0].querySelector('.forecast-temp').textContent = `${Math.round(currentData.main.temp)}°`;
            timeSlots[0].querySelector('.forecast-icon').src = getWeatherIcon(currentData.weather[0].main);
            
            // Update the remaining hourly slots
            for (let i = 1; i < timeSlots.length; i++) {
                const forecast = forecastData.list[i - 1]; // -1 because first slot is NOW
                const time = new Date(forecast.dt * 1000);
                timeSlots[i].querySelector('p:first-child').textContent = time.toLocaleTimeString('en-US', { hour: '2-digit' });
                timeSlots[i].querySelector('.forecast-temp').textContent = `${Math.round(forecast.main.temp)}°`;
                timeSlots[i].querySelector('.forecast-icon').src = getWeatherIcon(forecast.weather[0].main);
            }
            
            // Update 5-day forecast
            // Process data to get one forecast per day
            const dailyForecasts = {};
            forecastData.list.forEach(forecast => {
                const date = new Date(forecast.dt * 1000).toDateString();
                if (!dailyForecasts[date] || 
                    new Date(forecast.dt * 1000).getHours() === 12) {
                    // Take noon forecast or first available for each day
                    dailyForecasts[date] = forecast;
                }
            });
            
            // Get array of unique daily forecasts
            const uniqueDailyForecasts = Object.values(dailyForecasts).slice(0, 5);
            
            // Update 5-day forecast UI
            const dayForecasts = document.querySelectorAll('.day-forecast');
            uniqueDailyForecasts.forEach((forecast, index) => {
                if (index < dayForecasts.length) {
                    const dayEl = dayForecasts[index].querySelector('.day');
                    const iconEl = dayForecasts[index].querySelector('.day-forecast-icon');
                    const tempEl = dayForecasts[index].querySelector('.day-forecast-temp');
                    
                    dayEl.textContent = getDayOfWeek(forecast.dt);
                    iconEl.src = getWeatherIcon(forecast.weather[0].main);
                    
                    tempEl.textContent = `${Math.round(forecast.main.temp_max)}° / ${Math.round(forecast.main.temp_min)}°`;
                }
            });
            
            // Make weather card visible if it was hidden
            weatherCard.style.display = 'block';
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            
            // Show error message to user
            showError(error.message || 'Error fetching weather data. Please try again.');
            
            // Reset city name if it was set to "Loading..."
            if (cityEl.textContent === 'Loading...') {
                // Try to restore previous city name or set to default
                const previousCity = localStorage.getItem('lastValidCity') || 'Unknown Location';
                cityEl.textContent = previousCity;
            }
        }
    }
    
    // Event listeners
    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
        } else {
            showError('Please enter a city name');
        }
    });
    
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = cityInput.value.trim();
            if (city) {
                getWeatherData(city);
            } else {
                showError('Please enter a city name');
            }
        }
    });
    
    unitsToggleBtn.addEventListener('click', toggleUnits);
    
    // Initialize
    updateDate();
    getWeatherData('Tallinn'); // Default city
    
    // Save last valid city to localStorage
    window.addEventListener('beforeunload', () => {
        if (cityEl.textContent && cityEl.textContent !== 'Loading...' && cityEl.textContent !== 'Unknown Location') {
            localStorage.setItem('lastValidCity', cityEl.textContent);
        }
    });
});