// Saverino Music Player - Enhanced JavaScript
const API_BASE = "https://jiosaavn-api-privatecvc2.vercel.app";

// Global State
const state = {
  currentSong: null,
  isPlaying: false,
  searchResults: [],
  artistResults: [],
  albumResults: [],
  searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
  currentQuality: '3',
  page: 1,
  lastQuery: '',
  audioElement: null,
  currentArtist: null,
  currentAlbum: null,
  activeList: [],
  currentUser: null,
  playlistsTemp: [],
  artistAlbums: []
};

// Utility: Debounce helper to limit how often a function can fire
function debounce(callback, delay = 400) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback.apply(null, args);
    }, delay);
};
}

// DOM Elements
let elements = {};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  setupEventListeners();
  restoreState();
  initializeDarkMode();
});

// Initialize DOM Elements
function initializeElements() {
  elements = {
    searchInput: document.getElementById('search-input'),
    searchInputLanding: document.getElementById('search-input-landing'),
    searchBtn: document.getElementById('search-btn'),
    searchBtnLanding: document.getElementById('search-btn-landing'),
    resultsGrid: document.getElementById('results-grid'),
    loadMoreBtn: document.getElementById('load-more-btn'),
    miniPlayer: document.getElementById('mini-player'),
    fullscreenPlayer: document.getElementById('fullscreen-player'),
    qualityBtns: document.querySelectorAll('.quality-btn'),
    quickTags: document.querySelectorAll('.tag'),
    landingPage: document.getElementById('landing-page'),
    mainContainer: document.querySelector('.container'),
    artistPage: document.getElementById('artist-page'),
    artistResultsGrid: document.getElementById('artist-results-grid'),
    artistNameHeading: document.getElementById('artist-name'),
    artistCover: document.getElementById('artist-cover'),
    artistBackBtn: document.getElementById('artist-back-btn'),
    albumPage: document.getElementById('album-page'),
    albumResultsGrid: document.getElementById('album-results-grid'),
    albumNameHeading: document.getElementById('album-name'),
    albumCover: document.getElementById('album-cover'),
    albumBackBtn: document.getElementById('album-back-btn'),
    fullscreenAlbum: document.getElementById('fullscreen-album'),
    fullscreenArtistLabel: document.getElementById('fullscreen-artist'),
    albumPlayAllBtn: document.getElementById('album-play-all'),
    queuePopup: document.getElementById('queue-popup'),
    queueFab: document.getElementById('queue-fab'),
    closeQueueBtn: document.getElementById('close-queue'),
    queueList: document.getElementById('queue-list'),
    loginBtn: document.getElementById('login-btn'),
    userInfo: document.getElementById('user-info'),
    userNameEl: document.getElementById('user-name'),
    userAvatar: document.getElementById('user-avatar'),
    authModal: document.getElementById('auth-modal'),
    tabLogin: document.getElementById('tab-login'),
    tabSignup: document.getElementById('tab-signup'),
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    closeAuth: document.getElementById('close-auth'),
    loginSubmit: document.getElementById('login-submit'),
    signupSubmit: document.getElementById('signup-submit'),
    skipIntro: document.getElementById('skip-intro'),
    playlistPicker: document.getElementById('playlist-picker'),
    pickerList: document.getElementById('picker-list'),
    createPlaylistBtn: document.getElementById('create-playlist-btn'),
    playlistPlayBtn: document.getElementById('playlist-play-btn')
  };
  state.audioElement = document.getElementById('audio-player');
}

// Setup Event Listeners
function setupEventListeners() {
  // Search
  if (elements.searchBtn) elements.searchBtn.addEventListener('click', handleSearch);
  if (elements.searchBtnLanding) elements.searchBtnLanding.addEventListener('click', () => handleSearch(true));
  if (elements.searchInput) {
    elements.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSearch();
    });

    // Real-time debounced search as user types
    elements.searchInput.addEventListener(
      'input',
      debounce(() => {
        const query = elements.searchInput.value.trim();
        if (query.length >= 3) {
          state.page = 1;
          performSearch(query);
        }
      }, 500)
    );
  }

  // Landing input keypress
  if (elements.searchInputLanding) {
    elements.searchInputLanding.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSearch(true);
    });
  }

  // Quality Selection
  elements.qualityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.qualityBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentQuality = btn.dataset.quality;
    });
  });

  // Quick Tags
  elements.quickTags.forEach(tag => {
    tag.addEventListener('click', () => {
      elements.searchInput.value = tag.textContent.trim();
      handleSearch();
    });
  });

  // Load More
  if (elements.loadMoreBtn) {
    elements.loadMoreBtn.addEventListener('click', loadMore);
  }

  // Mini Player Controls
  const miniPlayerImage = document.getElementById('mini-player-image');
  const miniPlayBtn = document.getElementById('mini-play-btn');
  const miniPrevBtn = document.getElementById('mini-prev-btn');
  const miniNextBtn = document.getElementById('mini-next-btn');
  
  if (miniPlayerImage) miniPlayerImage.addEventListener('click', openFullscreenPlayer);
  if (miniPlayBtn) miniPlayBtn.addEventListener('click', togglePlay);
  if (miniPrevBtn) miniPrevBtn.addEventListener('click', playPrevious);
  if (miniNextBtn) miniNextBtn.addEventListener('click', playNext);

  // Fullscreen Player Controls
  const closeFullscreenBtn = document.getElementById('close-fullscreen');
  const fullscreenPlayBtn = document.getElementById('fullscreen-play-btn');
  const fullscreenPrevBtn = document.getElementById('fullscreen-prev-btn');
  const fullscreenNextBtn = document.getElementById('fullscreen-next-btn');
  
  if (closeFullscreenBtn) closeFullscreenBtn.addEventListener('click', closeFullscreenPlayer);
  if (fullscreenPlayBtn) fullscreenPlayBtn.addEventListener('click', togglePlay);
  if (fullscreenPrevBtn) fullscreenPrevBtn.addEventListener('click', playPrevious);
  if (fullscreenNextBtn) fullscreenNextBtn.addEventListener('click', playNext);

  // Progress Bars
  const miniProgressBar = document.getElementById('mini-progress-bar');
  const fullscreenProgressBar = document.getElementById('fullscreen-progress-bar');
  
  if (miniProgressBar) miniProgressBar.addEventListener('click', seekAudio);
  if (fullscreenProgressBar) fullscreenProgressBar.addEventListener('click', seekAudio);

  // Audio Element Events
  if (state.audioElement) {
    state.audioElement.addEventListener('timeupdate', updateProgress);
    state.audioElement.addEventListener('ended', playNext);
    state.audioElement.addEventListener('play', () => {
      state.isPlaying = true;
      updatePlayButtons();
    });
    state.audioElement.addEventListener('pause', () => {
      state.isPlaying = false;
      updatePlayButtons();
    });
  }

  // Artist back button
  if (elements.artistBackBtn) {
    elements.artistBackBtn.addEventListener('click', closeArtistPage);
  }

  // Album back button
  if (elements.albumBackBtn) {
    elements.albumBackBtn.addEventListener('click', closeAlbumPage);
  }

  // Make fullscreen album clickable
  if (elements.fullscreenAlbum) {
    elements.fullscreenAlbum.style.cursor = 'pointer';
    elements.fullscreenAlbum.addEventListener('click', () => {
      if (!state.currentSong) return;
      let track = state.searchResults.find(t => t.id === state.currentSong) ||
                  state.artistResults.find(t => t.id === state.currentSong) ||
                  state.albumResults.find(t => t.id === state.currentSong);
      if (track && track.album) {
        openAlbumPage(track.album.name, track.image ? (track.image[2]?.link || track.image[1]?.link) : '', track.album.id);
      }
    });
  }

  // Make fullscreen artist clickable
  if (elements.fullscreenArtistLabel) {
    elements.fullscreenArtistLabel.style.cursor = 'pointer';
    elements.fullscreenArtistLabel.addEventListener('click', () => {
      if (!state.currentSong) return;
      let track = state.searchResults.find(t => t.id === state.currentSong) ||
                  state.artistResults.find(t => t.id === state.currentSong) ||
                  state.albumResults.find(t => t.id === state.currentSong);
      if (track) {
        openArtistPage(track.primaryArtists, track.image ? (track.image[2]?.link || track.image[1]?.link) : '');
      }
    });
  }

  // Album play all button
  if (elements.albumPlayAllBtn) {
    elements.albumPlayAllBtn.addEventListener('click', () => {
      if (state.albumResults.length === 0) return;
      const first = state.albumResults[0];
      const url = first.downloadUrl[state.currentQuality].link;
      playSong(url, first.id);
    });
  }

  // Queue
  if (elements.queueFab) elements.queueFab.addEventListener('click', toggleQueuePopup);
  if (elements.closeQueueBtn) elements.closeQueueBtn.addEventListener('click', toggleQueuePopup);

  if (elements.loginBtn) elements.loginBtn.addEventListener('click', () => {
    if (state.currentUser) {
      openProfilePage();
    } else {
      openAuthModal();
    }
  });

  if (elements.closeAuth) elements.closeAuth.addEventListener('click', closeAuthModal);

  if (elements.tabLogin) elements.tabLogin.addEventListener('click', () => switchAuthTab('login'));
  if (elements.tabSignup) elements.tabSignup.addEventListener('click', () => switchAuthTab('signup'));

  if (elements.loginSubmit) elements.loginSubmit.addEventListener('click', handleLogin);
  if (elements.signupSubmit) elements.signupSubmit.addEventListener('click', handleSignup);

  if (elements.skipIntro) {
    elements.skipIntro.style.display = 'block';
    elements.skipIntro.addEventListener('click', () => {
      const remember = confirm('Skip intro next time?');
      if (remember) {
        localStorage.setItem('skipLanding', 'true');
      }
      enterApp();
    });
  }

  if (elements.userInfo) elements.userInfo.addEventListener('click', openProfilePage);

  if (elements.playlistPicker) elements.playlistPicker.addEventListener('click', (e) => {
    if (e.target === elements.playlistPicker) elements.playlistPicker.style.display = 'none';
  });

  if (elements.createPlaylistBtn) elements.createPlaylistBtn.addEventListener('click', createPlaylist);

  if (elements.playlistPlayBtn) elements.playlistPlayBtn.addEventListener('click', () => {
    if (!state.currentPlaylist || state.currentPlaylist.tracks.length===0) return;
    const first=state.currentPlaylist.tracks[0];
    playSong(first.downloadUrl[state.currentQuality].link, first.id);
  });

  // Fallback delegation in case button appears later
  const profilePageEl = document.getElementById('profile-page');
  if (profilePageEl) {
    profilePageEl.addEventListener('click', (e) => {
      if (e.target.id === 'create-playlist-btn') {
        createPlaylist();
      }
    });
  }
}

// Load initial content
function loadInitialContent() {
  performSearch('Top Hits');
}

// Restore state
function restoreState() {
  if (state.searchHistory.length > 0) {
    updateSearchHistoryUI();
  }
  // Set default quality button active
  elements.qualityBtns.forEach(btn => {
    if (btn.dataset.quality === state.currentQuality) {
      btn.classList.add('active');
    }
  });
}

// Handle Search
function handleSearch(fromLanding = false) {
  let query = '';
  if (fromLanding && elements.searchInputLanding) {
    query = elements.searchInputLanding.value.trim();
    // Mirror query into main search input for consistency
    if (elements.searchInput) elements.searchInput.value = query;
  } else {
    query = elements.searchInput.value.trim();
  }
  if (!query) return;
  state.page = 1;

  // If currently on landing page, transition to app view
  if (elements.landingPage && !elements.landingPage.classList.contains('fade-out')) {
    enterApp();
  }

  performSearch(query);
  saveToSearchHistory(query);
}

// Perform Search
async function performSearch(query) {
  state.lastQuery = query;
  elements.resultsGrid.innerHTML = '<div class="loader"><div class="loader-dots"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div></div>';
  
  try {
    const response = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&limit=40&page=${state.page}`);
    if (!response.ok) throw new Error('Search failed');
    
    const data = await response.json();
    if (!data.data || !data.data.results || data.data.results.length === 0) {
      elements.resultsGrid.innerHTML = '<p class="error-message">No results found. Try another search term.</p>';
      return;
    }
    
    if (state.page === 1) {
      state.searchResults = data.data.results;
      setActiveList(state.searchResults);
    } else {
      state.searchResults = state.searchResults.concat(data.data.results);
      setActiveList(state.searchResults);
    }
    
    renderSearchResults();
  } catch (error) {
    elements.resultsGrid.innerHTML = '<p class="error-message">Failed to search. Please try again.</p>';
    console.error('Search error:', error);
  }
}

// Render search results
function renderSearchResults() {
  elements.resultsGrid.innerHTML = '';
  state.searchResults.forEach(track => {
    const card = createSongCard(track);
    elements.resultsGrid.appendChild(card);
  });
  
  if (elements.loadMoreBtn) {
    elements.loadMoreBtn.style.display = state.searchResults.length >= 40 ? 'inline-flex' : 'none';
  }
}

// Create song card
function createSongCard(track) {
  const card = document.createElement('div');
  card.className = 'song-card';
  
  const imageUrl = track.image && track.image[1] ? track.image[1].link : '';
  const downloadUrl = track.downloadUrl[state.currentQuality] ? track.downloadUrl[state.currentQuality].link : '';
  
  card.innerHTML = `
    <div class="song-image-wrapper">
      <img src="${imageUrl}" alt="${track.name}" class="song-image" loading="lazy" />
      <div class="song-overlay">
        <button class="play-btn" aria-label="Play" data-url="${downloadUrl}" data-id="${track.id}">
          <i class="fas fa-play"></i>
        </button>
        <button class="plus-btn" aria-label="Add to playlist" title="Add to playlist">
          <i class="fas fa-plus"></i>
        </button>
      </div>
    </div>
    <div class="song-info">
      <div class="song-title">${track.name || 'Unknown'}</div>
      <div class="song-artist">${track.primaryArtists || 'Unknown Artist'}</div>
      <div class="song-meta">
        <span>${track.year || ''}</span>
        <span>${formatDuration(track.duration)}</span>
      </div>
    </div>
  `;
  
  // Add event listener
  const playBtn = card.querySelector('.play-btn');
  playBtn.addEventListener('click', () => playSong(downloadUrl, track.id));
  
  const plusBtn = card.querySelector('.plus-btn');
  if (plusBtn) plusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addTrackToPlaylist(track);
  });
  
  // Artist click opens artist page
  const artistDiv = card.querySelector('.song-artist');
  if (artistDiv) {
    artistDiv.style.cursor = 'pointer';
    artistDiv.addEventListener('click', () => {
      openArtistPage(track.primaryArtists, track.image ? track.image[2]?.link || track.image[1]?.link : '');
    });
  }
  
  // Album click opens album page
  const albumSpan = document.createElement('div');
  albumSpan.className = 'song-album clickable-album';
  albumSpan.textContent = track.album ? track.album.name : 'Unknown Album';
  albumSpan.style.cursor = 'pointer';
  albumSpan.style.fontSize = '12px';
  albumSpan.style.color = 'var(--primary)';
  
  const songInfo = card.querySelector('.song-info');
  if (songInfo) songInfo.appendChild(albumSpan);
  
  albumSpan.addEventListener('click', () => {
    if (track.album) {
      openAlbumPage(track.album.name, track.image ? (track.image[2]?.link || track.image[1]?.link) : '', track.album.id);
    }
  });
  
  return card;
}

// Format duration
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Play song
function playSong(url, id) {
  if (!url) return;
  
  state.currentSong = id;
  state.audioElement.src = url;
  state.audioElement.play();
  
  updateMiniPlayer();
  updateFullscreenPlayer();
  
  if (elements.miniPlayer) {
    elements.miniPlayer.classList.add('active');
  }

  buildQueue(id);
}

// Update mini player
function updateMiniPlayer() {
  if (!state.currentSong) return;
  
  let track = state.searchResults.find(t => t.id === state.currentSong);
  if (!track) {
    track = state.artistResults.find(t => t.id === state.currentSong);
    if (!track) track = state.albumResults.find(t => t.id === state.currentSong);
  }
  if (!track) return;
  
  const miniImage = document.getElementById('mini-player-image');
  const miniTitle = document.getElementById('mini-player-title');
  const miniArtist = document.getElementById('mini-player-artist');
  
  if (miniImage) miniImage.src = track.image[1].link;
  if (miniTitle) miniTitle.textContent = track.name;
  if (miniArtist) miniArtist.textContent = track.primaryArtists;
}

// Update fullscreen player
function updateFullscreenPlayer() {
  if (!state.currentSong) return;
  
  let track = state.searchResults.find(t => t.id === state.currentSong);
  if (!track) {
    track = state.artistResults.find(t => t.id === state.currentSong);
    if (!track) track = state.albumResults.find(t => t.id === state.currentSong);
  }
  if (!track) return;
  
  const fullscreenCover = document.getElementById('fullscreen-cover');
  const fullscreenTitle = document.getElementById('fullscreen-title');
  const fullscreenArtist = document.getElementById('fullscreen-artist');
  const fullscreenAlbum = document.getElementById('fullscreen-album');
  
  if (fullscreenCover) fullscreenCover.src = track.image[1].link;
  if (fullscreenTitle) fullscreenTitle.textContent = track.name;
  if (fullscreenArtist) fullscreenArtist.textContent = track.primaryArtists;
  if (fullscreenAlbum) fullscreenAlbum.textContent = track.album ? track.album.name : '';
}

// Toggle play/pause
function togglePlay() {
  if (!state.audioElement.src) return;
  
  if (state.audioElement.paused) {
    state.audioElement.play();
  } else {
    state.audioElement.pause();
  }
}

// Update play buttons
function updatePlayButtons() {
  const playIcon = state.isPlaying ? 'fa-pause' : 'fa-play';
  
  const miniPlayBtn = document.getElementById('mini-play-btn');
  const fullscreenPlayBtn = document.getElementById('fullscreen-play-btn');
  
  if (miniPlayBtn) miniPlayBtn.innerHTML = `<i class="fas ${playIcon}"></i>`;
  if (fullscreenPlayBtn) fullscreenPlayBtn.innerHTML = `<i class="fas ${playIcon}"></i>`;
  
  // Update fullscreen player state
  if (state.isPlaying) {
    elements.fullscreenPlayer.classList.add('playing');
  } else {
    elements.fullscreenPlayer.classList.remove('playing');
  }
}

// Play previous
function playPrevious() {
  if (!state.currentSong) return;
  const index = state.activeList.findIndex(t => t.id === state.currentSong);
  if (index > 0) {
    const prevTrack = state.activeList[index - 1];
    const url = prevTrack.downloadUrl[state.currentQuality].link;
    playSong(url, prevTrack.id);
  }
}

// Play next
function playNext() {
  if (!state.currentSong) return;
  const index = state.activeList.findIndex(t => t.id === state.currentSong);
  if (index < state.activeList.length - 1) {
    const nextTrack = state.activeList[index + 1];
    const url = nextTrack.downloadUrl[state.currentQuality].link;
    playSong(url, nextTrack.id);
  }
}

// Update progress
function updateProgress() {
  const currentTime = state.audioElement.currentTime;
  const duration = state.audioElement.duration;
  
  if (!duration) return;
  
  const percent = (currentTime / duration) * 100;
  
  const miniProgressFill = document.getElementById('mini-progress-fill');
  const fullscreenProgressFill = document.getElementById('fullscreen-progress-fill');
  const miniCurrentTime = document.getElementById('mini-current-time');
  const miniTotalTime = document.getElementById('mini-total-time');
  const fullscreenCurrentTime = document.getElementById('fullscreen-current-time');
  const fullscreenTotalTime = document.getElementById('fullscreen-total-time');
  
  if (miniProgressFill) miniProgressFill.style.width = `${percent}%`;
  if (fullscreenProgressFill) fullscreenProgressFill.style.width = `${percent}%`;
  if (miniCurrentTime) miniCurrentTime.textContent = formatDuration(Math.floor(currentTime));
  if (miniTotalTime) miniTotalTime.textContent = formatDuration(Math.floor(duration));
  if (fullscreenCurrentTime) fullscreenCurrentTime.textContent = formatDuration(Math.floor(currentTime));
  if (fullscreenTotalTime) fullscreenTotalTime.textContent = formatDuration(Math.floor(duration));
}

// Seek audio
function seekAudio(event) {
  const progressBar = event.currentTarget;
  const rect = progressBar.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const width = rect.width;
  const percent = clickX / width;
  
  if (state.audioElement.duration) {
    state.audioElement.currentTime = percent * state.audioElement.duration;
  }
}

// Open fullscreen player
function openFullscreenPlayer() {
  if (!state.currentSong) return;
  updateFullscreenPlayer();
  elements.fullscreenPlayer.classList.add('active');
}

// Close fullscreen player
function closeFullscreenPlayer() {
  elements.fullscreenPlayer.classList.remove('active');
}

// Load more
function loadMore() {
  state.page++;
  performSearch(state.lastQuery);
}

// Save to search history
function saveToSearchHistory(term) {
  if (!term || term.length < 2) return;
  
  state.searchHistory = state.searchHistory.filter(t => t.toLowerCase() !== term.toLowerCase());
  state.searchHistory.unshift(term);
  
  if (state.searchHistory.length > 10) {
    state.searchHistory = state.searchHistory.slice(0, 10);
  }
  
  localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
  updateSearchHistoryUI();
}

// Update search history UI
function updateSearchHistoryUI() {
  // This can be implemented if you want to show search history in the UI
}

// Show message
function showMessage(message, type = 'info') {
  const messageEl = document.createElement('div');
  messageEl.className = `${type}-message slide-up`;
  messageEl.textContent = message;
  
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.remove();
  }, 3000);
}

// Dark Mode Functions
function initializeDarkMode() {
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  // Apply saved theme
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
  
  // Toggle theme on button click
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }
}

function updateThemeIcon(theme) {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const icon = themeToggle.querySelector('i');
    if (icon) {
      icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }
}

// Improved mobile touch handling
function addMobileTouchHandlers() {
  // Add touch feedback to buttons
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('touchstart', () => {
      button.style.transform = 'scale(0.95)';
    });
    button.addEventListener('touchend', () => {
      button.style.transform = '';
    });
  });
  
  // Improve swipe gestures for fullscreen player
  let touchStartX = 0;
  let touchStartY = 0;
  
  elements.fullscreenPlayer.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });
  
  elements.fullscreenPlayer.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Swipe down to close fullscreen player
    if (Math.abs(diffY) > Math.abs(diffX) && diffY > 50) {
      closeFullscreenPlayer();
    }
  });
}

// Initialize mobile handlers
if ('ontouchstart' in window) {
  document.addEventListener('DOMContentLoaded', addMobileTouchHandlers);
}

// Make functions globally accessible for onclick handlers
window.playSong = playSong;

function enterApp() {
  elements.mainContainer.style.display='';
}

// Artist Page Logic
function openArtistPage(name, coverUrl) {
  if (!name) return;
  state.currentArtist = name;
  elements.artistNameHeading.textContent = name;
  if (coverUrl) elements.artistCover.src = coverUrl;

  // Attempt to get higher quality cover if possible
  fetchArtistInfo(name);
  
  // Show artist page
  elements.artistPage.style.display = 'flex';

  // Reset page and fetch
  fetchArtistSongs(name);
}

async function fetchArtistSongs(name) {
  elements.artistResultsGrid.innerHTML = '<div class="loader"><div class="loader-dots"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div></div>';
  try {
    const response = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(name)}&limit=40&page=1`);
    if (!response.ok) throw new Error('Artist search failed');
    const data = await response.json();
    if (!data.data || !data.data.results) throw new Error('No results');
    // Filter songs strictly matching artist name in primaryArtists string
    state.artistResults = data.data.results.filter(t => t.primaryArtists && t.primaryArtists.toLowerCase().includes(name.toLowerCase()));

    // Build unique album list
    const albumMap = {};
    state.artistResults.forEach(t => {
      if (t.album) {
        const id = t.album.id;
        if (!albumMap[id]) {
          albumMap[id] = {
            id,
            name: t.album.name,
            image: t.image ? (t.image[2]?.link || t.image[1]?.link) : '',
            year: t.year || ''
          };
        }
      }
    });
    state.artistAlbums = Object.values(albumMap);

    renderArtistAlbums();
    setActiveList(state.artistResults);
  } catch (e) {
    elements.artistResultsGrid.innerHTML = '<p class="error-message">Failed to load artist songs.</p>';
  }
}

function renderArtistAlbums() {
  elements.artistResultsGrid.innerHTML = '';
  elements.artistResultsGrid.className = 'results-grid';
  state.artistAlbums.forEach(alb => {
    const card = createAlbumCard(alb);
    elements.artistResultsGrid.appendChild(card);
  });
}

function createAlbumCard(album){
  const card=document.createElement('div');
  card.className='song-card'; // reuse style
  card.innerHTML=`
    <div class="song-image-wrapper">
      <img src="${album.image}" alt="${album.name}" class="song-image" loading="lazy" />
    </div>
    <div class="song-info" style="text-align:center;">
      <div class="song-title">${album.name}</div>
      <div class="song-meta"><span>${album.year}</span></div>
    </div>`;
  card.addEventListener('click',()=>openAlbumPage(album.name,album.image,album.id));
  return card;
}

function closeArtistPage() {
  elements.artistPage.style.display = 'none';
}

async function fetchArtistInfo(name) {
  try {
    const response = await fetch(`${API_BASE}/search/artists?query=${encodeURIComponent(name)}&limit=1&page=1`);
    if (!response.ok) return;
    const data = await response.json();
    if (data.data && data.data.results && data.data.results[0]) {
      const artist = data.data.results[0];
      if (artist.image && artist.image[2]) {
        elements.artistCover.src = artist.image[2].link;
      }
    }
  } catch (e) {
    // silent fail
  }
}

// Album Page Logic
function openAlbumPage(name, coverUrl, albumId) {
  if (!name) return;
  state.currentAlbum = { name, id: albumId };
  elements.albumNameHeading.textContent = name;
  if (coverUrl) elements.albumCover.src = coverUrl;

  elements.albumPage.style.display = 'flex';

  fetchAlbumSongs(albumId, name);
}

async function fetchAlbumSongs(albumId, nameFallback) {
  elements.albumResultsGrid.innerHTML = '<div class="loader"><div class="loader-dots"><div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div></div></div>';
  try {
    // Attempt album specific endpoint first
    let results = [];
    if (albumId) {
      const resp = await fetch(`${API_BASE}/albums?id=${albumId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.data && data.data.songs) {
          results = data.data.songs;
        }
      }
    }
    if (results.length === 0 && nameFallback) {
      const resp = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(nameFallback)}&limit=40&page=1`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.data && data.data.results) {
          results = data.data.results.filter(t => t.album && t.album.id === albumId);
        }
      }
    }
    state.albumResults = results;
    renderAlbumResults();
    setActiveList(state.albumResults);
  } catch (e) {
    elements.albumResultsGrid.innerHTML = '<p class="error-message">Failed to load album songs.</p>';
  }
}

function renderAlbumResults() {
  elements.albumResultsGrid.className = 'track-list';
  elements.albumResultsGrid.innerHTML = '';
  state.albumResults.forEach((track, idx) => {
    const row = createTrackRow(track, idx);
    elements.albumResultsGrid.appendChild(row);
  });
}

function createTrackRow(track, index) {
  const row = document.createElement('div');
  row.className = 'track-row';

  const cover = track.image && track.image[1] ? track.image[1].link : '';
  const downloadUrl = track.downloadUrl[state.currentQuality] ? track.downloadUrl[state.currentQuality].link : '';

  row.innerHTML = `
    <span class="track-index">${index + 1}</span>
    <img src="${cover}" alt="${track.name}" class="track-thumb" />
    <div class="track-info">
      <span class="track-title">${track.name}</span>
      <span class="track-artist">${track.primaryArtists}</span>
    </div>
    <div style="display:flex;gap:10px;align-items:center;">
      <button class="plus-btn" title="Add to playlist"><i class="fas fa-plus"></i></button>
      <button class="track-play-btn" aria-label="Play"><i class="fas fa-play"></i></button>
    </div>
  `;

  // clicking row plays song
  row.addEventListener('click', (e) => {
    // Avoid double trigger when clicking play button specifically
    const target = e.target;
    if (target.closest('.track-play-btn')) {
      e.stopPropagation();
    }
    playSong(downloadUrl, track.id);
  });

  // play button click
  const playBtn = row.querySelector('.track-play-btn');
  if (playBtn) {
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSong(downloadUrl, track.id);
    });
  }

  const plusBtn = row.querySelector('.plus-btn');
  if (plusBtn) {
    plusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addTrackToPlaylist(track);
    });
  }

  return row;
}

function closeAlbumPage() {
  elements.albumPage.style.display = 'none';
}

// Define helper to set active list
function setActiveList(list) {
  state.activeList = list || [];
}

function buildQueue(currentId) {
  if (!state.activeList || state.activeList.length === 0) return;
  const index = state.activeList.findIndex(t => t.id === currentId);
  state.queue = state.activeList.slice(index + 1);
  renderQueue();
}

function renderQueue() {
  if (!elements.queueList) return;
  elements.queueList.innerHTML = '';
  state.queue.forEach((track, idx) => {
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.innerHTML = `<span>${idx + 1}</span><span style="flex:1;min-width:0;">${track.name}</span><button class="queue-remove"><i class="fas fa-times"></i></button>`;
    item.addEventListener('click', () => {
      playSong(track.downloadUrl[state.currentQuality].link, track.id);
    });
    const rmBtn = item.querySelector('.queue-remove');
    rmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.queue = state.queue.filter(t => t.id !== track.id);
      renderQueue();
    });
    elements.queueList.appendChild(item);
  });
}

function toggleQueuePopup() {
  if (elements.queuePopup) elements.queuePopup.classList.toggle('active');
}

// Auth functions
function loadUsers() {
  return JSON.parse(localStorage.getItem('users') || '[]');
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function handleSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  if (!username || !password) return alert('Fill all fields');
  const users = loadUsers();
  if (users.find(u => u.username === username)) return alert('User exists');
  users.push({ username, password, playlists: [] });
  saveUsers(users);
  alert('Account created, you can login now');
  switchAuthTab('login');
}

function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const users = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return alert('Invalid credentials');
  state.currentUser = user;
  localStorage.setItem('currentUser', username);
  updateUserUI();
  closeAuthModal();
}

function updateUserUI() {
  if (state.currentUser) {
    elements.loginBtn.style.display = 'none';
    elements.userInfo.style.display = 'flex';
    elements.userNameEl.textContent = state.currentUser.username;
    if (state.currentUser.avatar) {
      elements.userAvatar.src = state.currentUser.avatar;
    }
    renderPlaylists();
  } else {
    elements.loginBtn.style.display = 'inline-block';
    elements.userInfo.style.display = 'none';
  }
}

function openAuthModal() {
  elements.authModal.classList.add('active');
  switchAuthTab('login');
}

function closeAuthModal() { elements.authModal.classList.remove('active'); }

function switchAuthTab(tab) {
  if (tab === 'login') {
    elements.tabLogin.classList.add('active');
    elements.tabSignup.classList.remove('active');
    elements.loginForm.classList.add('active');
    elements.signupForm.classList.remove('active');
  } else {
    elements.tabSignup.classList.add('active');
    elements.tabLogin.classList.remove('active');
    elements.signupForm.classList.add('active');
    elements.loginForm.classList.remove('active');
  }
}

function openProfilePage() {
  document.getElementById('profile-page').style.display = 'flex';
  document.getElementById('profile-username').textContent = state.currentUser.username;
  if (state.currentUser.avatar) {
    elements.userAvatar.src = state.currentUser.avatar;
  }
  renderPlaylists();
}

// Playlist functions
function getCurrentUser() {
  if (!state.currentUser) {
    const uname = localStorage.getItem('currentUser');
    if (uname) {
      const user = loadUsers().find(u => u.username === uname);
      state.currentUser = user;
    }
  }
  return state.currentUser;
}

function createPlaylist() {
  const user = getCurrentUser();
  if (!user) return alert('Login required');
  const name = prompt('Playlist name');
  if (!name) return;
  const id = Date.now().toString();
  user.playlists.push({ id, name, tracks: [] });
  saveUsers(loadUsers().map(u => (u.username===user.username?user:u)));
  renderPlaylists();
}

function renderPlaylists() {
  const list = document.getElementById('playlist-list');
  if (!list) return;
  list.innerHTML='';
  const user = getCurrentUser();
  if (!user) return;
  user.playlists.forEach(pl => {
    const card=document.createElement('div');card.className='playlist-card';card.textContent=`${pl.name} (${pl.tracks.length})`;card.addEventListener('click',()=>openPlaylistPage(pl.id));list.appendChild(card);
  });
}

function openPlaylistPage(id) {
  const user=getCurrentUser();
  const pl=user.playlists.find(p=>p.id===id);
  if(!pl) return;
  state.currentPlaylist=pl;
  document.getElementById('playlist-title').textContent=pl.name;
  document.getElementById('playlist-page').style.display='flex';
  renderPlaylistTracks();
}

function renderPlaylistTracks() {
  const container=document.getElementById('playlist-track-list');
  container.innerHTML='';
  if(!state.currentPlaylist) return;
  state.currentPlaylist.tracks.forEach((track,idx)=>{
    const row=createTrackRow(track,idx);
    container.appendChild(row);
  });
  setActiveList(state.currentPlaylist.tracks);
}

function addTrackToPlaylist(track) {
  const user=getCurrentUser();
  if(!user) return alert('Login required');
  elements.pickerList.innerHTML='';
  user.playlists.forEach(pl=>{const item=document.createElement('div');item.className='picker-item';item.textContent=pl.name;item.addEventListener('click',()=>{if(pl.tracks.find(t=>t.id===track.id)){alert('Already in playlist');}else{pl.tracks.push(track);saveUsers(loadUsers().map(u=>u.username===user.username?user:u));alert('Added to '+pl.name);}elements.playlistPicker.style.display='none';});elements.pickerList.appendChild(item);});
  elements.playlistPicker.style.display='flex';
}

// back buttons
document.getElementById('profile-back-btn').addEventListener('click',()=>{document.getElementById('profile-page').style.display='none';});
document.getElementById('playlist-back-btn').addEventListener('click',()=>{document.getElementById('playlist-page').style.display='none';});
