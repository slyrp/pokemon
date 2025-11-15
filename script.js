const POKEMON_API = 'https://pokeapi.co/api/v2/pokemon';
const POKEMON_LIMIT = 20;

let currentOffset = 0;
let isLoading = false;
let isSearchMode = false;
let searchQuery = '';
let allPokemon = [];
let filteredPokemon = [];

const pokemonGrid = document.getElementById('pokemonGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const endMessage = document.getElementById('endMessage');
const noResults = document.getElementById('noResults');
const errorMessage = document.getElementById('errorMessage');
const pokemonModal = document.getElementById('pokemonModal');
const modalContent = document.getElementById('modalContent');
const modalClose = document.querySelector('.modal-close');
const modalOverlay = document.querySelector('.modal-overlay');

let searchTimeout;

// Initialize
async function init() {
    await loadPokemon();
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    // Clear search functionality
    searchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        clearSearch();
    });
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Infinite scroll
    window.addEventListener('scroll', handleScroll);
    
    // Debounced search on input change
    searchInput.addEventListener('input', (e) => {
        if (e.target.value === '' && isSearchMode) {
            clearSearch();
            return;
        }
        
        // Debounce search for better performance
        clearTimeout(searchTimeout);
        const query = e.target.value.trim().toLowerCase();
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => {
                handleSearch();
            }, 300);
        }
    });
    
    // Modal close events
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !pokemonModal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

// Handle scroll for infinite loading
function handleScroll() {
    if (isLoading || isSearchMode) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Load more when 200px from bottom
    if (scrollTop + windowHeight >= documentHeight - 200) {
        loadPokemon();
    }
}

// Handle search
async function handleSearch() {
    const query = searchInput.value.trim().toLowerCase();
    
    if (query === '') {
        clearSearch();
        return;
    }
    
    isSearchMode = true;
    searchQuery = query;
    pokemonGrid.innerHTML = '';
    showSearchLoading();
    hideEndMessage();
    hideNoResults();
    hideError();
    
    try {
        // Only fetch all Pokemon names when needed (lazy loading)
        if (allPokemon.length === 0) {
            await fetchAllPokemonNames();
        }
        
        // Filter Pokemon by name
        filteredPokemon = allPokemon.filter(pokemon => 
            pokemon.name.toLowerCase().includes(query)
        );
        
        if (filteredPokemon.length === 0) {
            showNoResults();
            hideSearchLoading();
            return;
        }
        
        // Load all filtered Pokemon (not just first 20)
        for (const pokemon of filteredPokemon) {
            await loadPokemonCard(pokemon.url);
        }
        
        hideSearchLoading();
    } catch (error) {
        console.error('Search error:', error);
        hideSearchLoading();
        showError('Failed to search Pokémon. Please try again.');
    }
}

// Clear search and return to normal view
async function clearSearch() {
    isSearchMode = false;
    searchQuery = '';
    searchInput.value = '';
    pokemonGrid.innerHTML = '';
    currentOffset = 0;
    hideNoResults();
    hideEndMessage();
    hideSearchLoading();
    await loadPokemon();
}

// Fetch all Pokemon names for search
async function fetchAllPokemonNames() {
    try {
        const response = await fetch(`${POKEMON_API}?limit=10000`);
        if (!response.ok) {
            throw new Error('Failed to fetch Pokémon list');
        }
        const data = await response.json();
        allPokemon = data.results;
    } catch (error) {
        console.error('Error fetching all Pokemon:', error);
        showError('Failed to load Pokémon list. Please refresh the page.');
        throw error;
    }
}

// Load Pokemon (initial and infinite scroll)
async function loadPokemon() {
    if (isLoading) return;
    
    isLoading = true;
    
    // Show button spinner on initial load (first time only)
    if (currentOffset === 0) {
        showSearchLoading();
    }
    
    hideError();
    
    try {
        const response = await fetch(`${POKEMON_API}?limit=${POKEMON_LIMIT}&offset=${currentOffset}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch Pokémon');
        }
        
        const data = await response.json();
        
        if (data.results.length === 0) {
            showEndMessage();
            if (currentOffset === 0) {
                hideSearchLoading();
            }
            isLoading = false;
            return;
        }
        
        // Load Pokemon cards
        for (const pokemon of data.results) {
            await loadPokemonCard(pokemon.url);
        }
        
        currentOffset += POKEMON_LIMIT;
        
        // If we've loaded all Pokemon
        if (currentOffset >= data.count) {
            showEndMessage();
        }
        
        // Hide button spinner after initial load completes
        if (currentOffset <= POKEMON_LIMIT) {
            hideSearchLoading();
        }
    } catch (error) {
        console.error('Error loading Pokemon:', error);
        if (currentOffset === 0) {
            hideSearchLoading();
        }
        showError('Failed to load Pokémon. Please try again.');
    } finally {
        isLoading = false;
    }
}

// Load individual Pokemon card
async function loadPokemonCard(url) {
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch Pokémon: ${response.status}`);
        }
        
        const pokemon = await response.json();
        
        const card = createPokemonCard(pokemon);
        pokemonGrid.appendChild(card);
    } catch (error) {
        console.error('Error loading Pokemon card:', error);
        // Don't show error for individual card failures, just log it
    }
}

// Process Pokemon name to handle gender suffixes
function processPokemonName(name) {
    let displayName = name;
    let genderIndicator = '';
    
    if (name.endsWith('-m')) {
        displayName = name.slice(0, -2);
        genderIndicator = ' ♂';
    } else if (name.endsWith('-f')) {
        displayName = name.slice(0, -2);
        genderIndicator = ' ♀';
    }
    
    return {
        baseName: displayName,
        genderIndicator: genderIndicator,
        fullName: displayName + genderIndicator
    };
}

// Create Pokemon card element
function createPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    
    const id = pokemon.id.toString().padStart(3, '0');
    const nameData = processPokemonName(pokemon.name);
    const image = pokemon.sprites.other['official-artwork']?.front_default || 
                  pokemon.sprites.front_default;
    const types = pokemon.types.map(type => type.type.name);
    
    card.innerHTML = `
        <div class="pokemon-id">#${id}</div>
        <img src="${image}" alt="${nameData.baseName}" loading="lazy">
        <div class="pokemon-name">${nameData.fullName}</div>
        <div class="pokemon-types">
            ${types.map(type => `<span class="type-badge type-${type}">${type}</span>`).join('')}
        </div>
    `;
    
    // Add click event for more details
    card.addEventListener('click', () => {
        showPokemonDetails(pokemon);
    });
    
    // Add keyboard support for accessibility
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showPokemonDetails(pokemon);
        }
    });
    
    return card;
}

// Show Pokemon details in modal
function showPokemonDetails(pokemon) {
    const id = pokemon.id.toString().padStart(3, '0');
    const nameData = processPokemonName(pokemon.name);
    const image = pokemon.sprites.other['official-artwork']?.front_default || 
                  pokemon.sprites.front_default;
    const types = pokemon.types.map(type => type.type.name);
    const height = (pokemon.height / 10).toFixed(1);
    const weight = (pokemon.weight / 10).toFixed(1);
    const stats = pokemon.stats;
    
    // Calculate total base stat
    const totalStats = stats.reduce((sum, stat) => sum + stat.base_stat, 0);
    
    modalContent.innerHTML = `
        <div class="modal-pokemon-image">
            <img src="${image}" alt="${nameData.baseName}">
        </div>
        <div class="modal-pokemon-header">
            <div class="modal-pokemon-name">${nameData.fullName}</div>
            <div class="modal-pokemon-id">#${id}</div>
            <div class="modal-pokemon-types">
                ${types.map(type => `<span class="type-badge type-${type}">${type}</span>`).join('')}
            </div>
        </div>
        <div class="modal-pokemon-info">
            <div class="modal-info-item">
                <div class="modal-info-label">Height</div>
                <div class="modal-info-value">${height}m</div>
            </div>
            <div class="modal-info-item">
                <div class="modal-info-label">Weight</div>
                <div class="modal-info-value">${weight}kg</div>
            </div>
        </div>
        <div class="modal-stats">
            <div class="modal-stats-title">Base Stats</div>
            ${stats.map(stat => {
                const statName = stat.stat.name.replace('-', ' ');
                const statValue = stat.base_stat;
                const statPercentage = (statValue / 255) * 100; // Max stat is 255
                return `
                    <div class="modal-stat-item">
                        <div class="modal-stat-header">
                            <span class="modal-stat-name">${statName}</span>
                            <span class="modal-stat-value">${statValue}</span>
                        </div>
                        <div class="modal-stat-bar-container">
                            <div class="modal-stat-bar" style="width: ${statPercentage}%"></div>
                        </div>
                    </div>
                `;
            }).join('')}
            <div class="modal-stat-item modal-stat-total">
                <div class="modal-stat-header">
                    <span class="modal-stat-name modal-stat-total-text">Total</span>
                    <span class="modal-stat-value modal-stat-total-text">${totalStats}</span>
                </div>
            </div>
        </div>
    `;
    
    pokemonModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Focus management for accessibility
    modalClose.focus();
}

// Close modal
function closeModal() {
    pokemonModal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scrolling
}

// Utility functions
function showEndMessage() {
    endMessage.classList.remove('hidden');
}

function hideEndMessage() {
    endMessage.classList.add('hidden');
}

function showNoResults() {
    noResults.classList.remove('hidden');
}

function hideNoResults() {
    noResults.classList.add('hidden');
}

function showError(message) {
    if (errorMessage) {
        errorMessage.querySelector('p').textContent = message || 'Something went wrong. Please try again later.';
        errorMessage.classList.remove('hidden');
    }
}

function hideError() {
    if (errorMessage) {
        errorMessage.classList.add('hidden');
    }
}

function showSearchLoading() {
    searchBtn.classList.add('loading');
    const spinner = searchBtn.querySelector('.search-spinner');
    if (spinner) {
        spinner.classList.remove('hidden');
    }
}

function hideSearchLoading() {
    searchBtn.classList.remove('loading');
    const spinner = searchBtn.querySelector('.search-spinner');
    if (spinner) {
        spinner.classList.add('hidden');
    }
}

// Initialize on page load
init();

