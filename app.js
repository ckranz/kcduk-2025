const API_URL = 'https://sessionize.com/api/v2/lxonkgvd/view/All';

let allData = null;
let filteredSessions = [];

// Fetch data from Sessionize
async function fetchSchedule() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allData = await response.json();
        initializeFilters();
        displaySchedule();
    } catch (error) {
        showError('Failed to load schedule. Please try again later.');
        console.error('Error fetching schedule:', error);
    }
}

// Initialize filter dropdowns
function initializeFilters() {
    const roomFilter = document.getElementById('room-filter');
    const dayFilter = document.getElementById('day-filter');

    // Populate rooms
    allData.rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        roomFilter.appendChild(option);
    });

    // Get unique days from sessions
    const days = [...new Set(allData.sessions.map(s => s.startsAt.split('T')[0]))].sort();
    days.forEach(day => {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = formatDate(day);
        dayFilter.appendChild(option);
    });

    // Add event listeners
    roomFilter.addEventListener('change', filterSchedule);
    dayFilter.addEventListener('change', filterSchedule);

    document.getElementById('filters').style.display = 'flex';
}

// Filter schedule based on selected filters
function filterSchedule() {
    const roomFilter = document.getElementById('room-filter').value;
    const dayFilter = document.getElementById('day-filter').value;

    filteredSessions = allData.sessions.filter(session => {
        const matchesRoom = !roomFilter || session.roomId == roomFilter;
        const matchesDay = !dayFilter || session.startsAt.startsWith(dayFilter);
        return matchesRoom && matchesDay;
    });

    displaySchedule();
}

// Display the schedule
function displaySchedule() {
    const scheduleDiv = document.getElementById('schedule');
    const loading = document.getElementById('loading');

    loading.style.display = 'none';

    const sessions = filteredSessions.length > 0 ? filteredSessions : allData.sessions;

    // Group sessions by day
    const sessionsByDay = groupSessionsByDay(sessions);

    scheduleDiv.innerHTML = '';

    Object.keys(sessionsByDay).sort().forEach(day => {
        const daySection = document.createElement('div');
        daySection.className = 'day-section';

        const dayHeader = document.createElement('h2');
        dayHeader.textContent = formatDate(day);
        daySection.appendChild(dayHeader);

        // Group sessions by time for this day
        const sessionsByTime = groupSessionsByTime(sessionsByDay[day]);

        Object.keys(sessionsByTime).sort().forEach(time => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';

            const timeHeader = document.createElement('div');
            timeHeader.className = 'time-header';
            timeHeader.textContent = time;
            timeSlot.appendChild(timeHeader);

            const sessionsGrid = document.createElement('div');
            sessionsGrid.className = 'sessions-grid';

            sessionsByTime[time].forEach(session => {
                const sessionCard = createSessionCard(session);
                sessionsGrid.appendChild(sessionCard);
            });

            timeSlot.appendChild(sessionsGrid);
            daySection.appendChild(timeSlot);
        });

        scheduleDiv.appendChild(daySection);
    });
}

// Create a session card
function createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'session-card';

    if (session.isPlenumSession) {
        card.classList.add('plenum');
    }

    const room = allData.rooms.find(r => r.id === session.roomId);
    const speakers = session.speakers.map(speakerId =>
        allData.speakers.find(s => s.id === speakerId)
    ).filter(s => s);

    const timeRange = `${formatTime(session.startsAt)} - ${formatTime(session.endsAt)}`;

    card.innerHTML = `
        <div class="session-header">
            <h3 class="session-title">${session.title}</h3>
            ${room ? `<span class="session-room">${room.name}</span>` : ''}
        </div>
        <div class="session-time">${timeRange}</div>
        ${session.description ? `<p class="session-description">${session.description}</p>` : ''}
        ${speakers.length > 0 ? `
            <div class="session-speakers">
                ${speakers.map(speaker => `
                    <div class="speaker">
                        ${speaker.profilePicture ? `<img src="${speaker.profilePicture}" alt="${speaker.fullName}">` : ''}
                        <div class="speaker-info">
                            <div class="speaker-name">${speaker.fullName}</div>
                            ${speaker.tagLine ? `<div class="speaker-tagline">${speaker.tagLine}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;

    return card;
}

// Group sessions by day
function groupSessionsByDay(sessions) {
    return sessions.reduce((acc, session) => {
        const day = session.startsAt.split('T')[0];
        if (!acc[day]) acc[day] = [];
        acc[day].push(session);
        return acc;
    }, {});
}

// Group sessions by start time
function groupSessionsByTime(sessions) {
    return sessions.reduce((acc, session) => {
        const time = formatTime(session.startsAt);
        if (!acc[time]) acc[time] = [];
        acc[time].push(session);
        return acc;
    }, {});
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format time
function formatTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('error');
    const loading = document.getElementById('loading');

    loading.style.display = 'none';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Dark mode functionality
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchSchedule();

    // Add theme toggle event listener
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});
