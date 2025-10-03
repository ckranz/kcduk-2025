const API_URL = 'https://sessionize.com/api/v2/lxonkgvd/view/All';

let allData = null;
let filteredSessions = [];

// Get session type (keynote, workshop, or talk)
function getSessionType(session) {
    if (session.isPlenumSession) {
        return 'keynote';
    }
    if (session.title && session.title.toLowerCase().startsWith('workshop:')) {
        return 'workshop';
    }
    return 'talk';
}

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
    const searchInput = document.getElementById('search-input');
    const filterToggle = document.getElementById('filter-toggle');
    const filters = document.getElementById('filters');

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
    searchInput.addEventListener('input', filterSchedule);

    // Type filter checkboxes
    const typeCheckboxes = ['type-keynote', 'type-talk', 'type-workshop'];
    typeCheckboxes.forEach(id => {
        document.getElementById(id).addEventListener('change', filterSchedule);
    });

    // Toggle filters visibility
    filterToggle.addEventListener('click', () => {
        filters.classList.toggle('filters-collapsed');
        filters.classList.toggle('filters-expanded');
        filterToggle.classList.toggle('active');
    });

    document.getElementById('filter-container').style.display = 'block';
}

// Filter schedule based on selected filters
function filterSchedule() {
    const roomFilter = document.getElementById('room-filter').value;
    const dayFilter = document.getElementById('day-filter').value;
    const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();

    // Get selected types
    const selectedTypes = [];
    if (document.getElementById('type-keynote').checked) selectedTypes.push('keynote');
    if (document.getElementById('type-talk').checked) selectedTypes.push('talk');
    if (document.getElementById('type-workshop').checked) selectedTypes.push('workshop');

    filteredSessions = allData.sessions.filter(session => {
        // Room and day filters
        const matchesRoom = !roomFilter || session.roomId == roomFilter;
        const matchesDay = !dayFilter || session.startsAt.startsWith(dayFilter);

        // Type filter
        const sessionType = getSessionType(session);
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(sessionType);

        // Search filter
        let matchesSearch = true;
        if (searchQuery) {
            const titleMatch = session.title?.toLowerCase().includes(searchQuery);
            const descriptionMatch = session.description?.toLowerCase().includes(searchQuery);

            // Get speaker names for this session
            const speakers = session.speakers.map(speakerId =>
                allData.speakers.find(s => s.id === speakerId)
            ).filter(s => s);
            const speakerMatch = speakers.some(speaker =>
                speaker.fullName?.toLowerCase().includes(searchQuery)
            );

            matchesSearch = titleMatch || descriptionMatch || speakerMatch;
        }

        return matchesRoom && matchesDay && matchesType && matchesSearch;
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

        const sessionsGrid = document.createElement('div');
        sessionsGrid.className = 'sessions-grid';

        // Sort sessions by start time
        const sortedSessions = sessionsByDay[day].sort((a, b) =>
            a.startsAt.localeCompare(b.startsAt)
        );

        sortedSessions.forEach(session => {
            const sessionCard = createSessionCard(session);
            sessionsGrid.appendChild(sessionCard);
        });

        daySection.appendChild(sessionsGrid);
        scheduleDiv.appendChild(daySection);
    });
}

// Create a session card
function createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'session-card';

    const sessionType = getSessionType(session);
    if (sessionType === 'keynote') {
        card.classList.add('plenum');
    } else if (sessionType === 'workshop') {
        card.classList.add('workshop');
    }

    const room = allData.rooms.find(r => r.id === session.roomId);
    const speakers = session.speakers.map(speakerId =>
        allData.speakers.find(s => s.id === speakerId)
    ).filter(s => s);

    const timeRange = `${formatTime(session.startsAt)} - ${formatTime(session.endsAt)}`;

    card.innerHTML = `
        <div class="session-header">
            <h3 class="session-title">${session.title}</h3>
        </div>
        <div class="session-meta">
            ${speakers.length > 0 ? `
                <div class="session-speakers-compact">
                    ${speakers.map(speaker => `
                        <div class="speaker-compact">
                            ${speaker.profilePicture ? `<img src="${speaker.profilePicture}" alt="${speaker.fullName}">` : ''}
                            <span class="speaker-name">${speaker.fullName}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            <span class="session-time">${timeRange}</span>
            ${room ? `<span class="session-room">${room.name}</span>` : ''}
        </div>
        <div class="session-details">
            ${session.description ? `<p class="session-description">${session.description}</p>` : ''}
            ${speakers.length > 0 && speakers.some(s => s.tagLine) ? `
                <div class="session-speakers-full">
                    ${speakers.map(speaker => speaker.tagLine ? `
                        <div class="speaker-tagline">
                            <strong>${speaker.fullName}:</strong> ${speaker.tagLine}
                        </div>
                    ` : '').join('')}
                </div>
            ` : ''}
        </div>
        <div class="expand-indicator">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
    `;

    // Add click handler to toggle expansion
    card.addEventListener('click', () => {
        card.classList.toggle('expanded');
    });

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
    const savedTheme = localStorage.getItem('theme') || 'dark';
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
