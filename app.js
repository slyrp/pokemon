console.log("%cPokémon!", "color: yellow; font-size: 50px; font-weight: bold;");
console.log("%cIf you find any bugs, please report them on GitHub!", "color: yellow; font-size: 18px;");

// Define a mapping for Pokémon colors
const pokemonColors = {
  "red": { startHue: 0, endHue: 10 },
  "orange": { startHue: 10, endHue: 30 },
  "yellow": { startHue: 30, endHue: 60 },
  "green": { startHue: 60, endHue: 150 },
  "cyan": { startHue: 150, endHue: 180 },
  "blue": { startHue: 180, endHue: 240 },
  "violet": { startHue: 240, endHue: 270 },
  "pink": { startHue: 270, endHue: 350 },
  "brown": { startHue: 20, endHue: 40, saturation: "50%", lightness: "30%" },
  "gray": { startHue: 0, endHue: 360, saturation: "0%", lightness: "50%" },
  "white": { startHue: 0, endHue: 360, saturation: "0%", lightness: "100%" },
  "black": { startHue: 0, endHue: 360, saturation: "0%", lightness: "0%" }
};

function modifyColor(color, action, percentage) {
  // Helper function to ensure a value is between 0 and 255
  const clamp = (value) => Math.max(0, Math.min(255, value));

  // Helper function to convert hex to rgb
  const hexToRgb = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Helper function to convert rgb to hex
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');

  // Parse the input color
  let rgb;
  if (color.startsWith('#')) {
    rgb = hexToRgb(color);
  } else if (color.startsWith('rgb')) {
    const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
    rgb = match ? { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) } : null;
  } else if (color.startsWith('hsl')) {
    // Convert HSL to RGB (simplified conversion)
    const match = color.match(/(\d+),\s*(\d+)%,\s*(\d+)%/);
    if (match) {
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
      const g = Math.round(hue2rgb(p, q, h) * 255);
      const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
      rgb = { r, g, b };
    }
  }

  if (!rgb) {
    throw new Error('Invalid color format');
  }

  // Modify the color
  const factor = 1 + (percentage / 100) * (action === 'darken' ? -1 : 1);
  rgb.r = clamp(Math.round(rgb.r * factor));
  rgb.g = clamp(Math.round(rgb.g * factor));
  rgb.b = clamp(Math.round(rgb.b * factor));

  // Return the color in the same format as input
  if (color.startsWith('#')) {
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  } else if (color.startsWith('rgb')) {
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  } else if (color.startsWith('hsl')) {
    // Convert back to HSL (approximate)
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }
}

// Helper function for HSL to RGB conversion
function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

// Function to get a color from color data
function getColorFromData(colorData) {
  const hue = Math.floor((colorData.startHue + colorData.endHue) / 2);
  const saturation = colorData.saturation || "100%";
  const lightness = colorData.lightness || "50%";
  return `hsl(${hue}, ${saturation}, ${lightness})`;
}

// Pokémon container and initial settings
const pokedexContainer = document.getElementById('pokedexContainer');
const pokemonContainer = document.getElementById('pokemonContainer');
let currentOffset = 1; // Start with the first Pokémon
const limit = 20; // Number of Pokémon to load per request

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function getPokemon(id, log = false) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await response.json();
    if (log) {
      console.log("ID: " + id + " - Pokemon:");
      console.log(data);
    }
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function getPokemonSpecies(id, log = false) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    const data = await response.json();
    if (log) {
      console.log("ID: " + id + " - Species:");
      console.log(data);
    }
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function getPokemonMoves(id, log = false) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/move/${id}/`);
    const data = await response.json();
    if (log) {
      console.log("ID: " + id + " - Moves:");
      console.log(data);
    }
    console.log(data);
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function getPokemonStats(id, log = false) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/stat/${id}/`);
    const data = await response.json();
    if (log) {
      console.log("ID: " + id + " - Stats:");
      console.log(data);
    }
    console.log(data);
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

getPokemonMoves(9, true);

function correctID(id) {
  return id.toString().padStart(4, '0');
}

// Load Pokémon data and create card
async function createPokemonCard(id) {
  const pokemon = await getPokemon(id, true);
  const pokemonSpecies = await getPokemonSpecies(id, true);
  if (!pokemon || !pokemonSpecies) return;

  const pokemonColor = pokemonSpecies.color.name.toLowerCase();
  const colorData = pokemonColors[pokemonColor] || pokemonColors['red'];

  // Create Pokémon card
  const pokemonCard = document.createElement('div');
  pokemonCard.classList.add('pokemon-card');
  pokemonCard.style.borderColor = modifyColor(getColorFromData(colorData), 'lighten', 20);
  pokemonCard.setAttribute('id', `${correctID(pokemon.id.toString())}`);
  pokemonCard.setAttribute('abilities', pokemon.abilities.map(a => a.ability.name).join(', '));
  pokemonCard.setAttribute('types', pokemon.types.map(t => t.type.name).join(', '));
  pokemonCard.setAttribute('height', pokemon.height.toString());
  pokemonCard.setAttribute('weight', pokemon.weight.toString());
  pokemonCard.setAttribute('base_experience', pokemon.base_experience.toString());
  pokemonCard.setAttribute('stats', pokemon.stats.map(s => `${s.stat.name}: ${s.base_stat}`).join(', '));
  pokemonCard.addEventListener('click', () => {
    pokemonContainer.classList.toggle('full-card');
  });

  const topContainer = document.createElement('div');
  topContainer.classList.add('top-container');

  const h3 = document.createElement('h3');
  h3.innerText = `#${correctID(pokemon.id.toString())}`;
  topContainer.appendChild(h3);

  const go = document.createElement('h3');
  go.classList.add('go');
  go.innerText = '→';
  topContainer.appendChild(go);

  pokemonCard.appendChild(topContainer);

  const h1 = document.createElement('h1');
  h1.innerText = capitalizeFirstLetter(pokemon.name);

  const badge = pokemon.types
  const badgeContainer = document.createElement('div');
  badgeContainer.classList.add('badge-container');
  badge.forEach(type => {
    const span = document.createElement('span');
    span.classList.add('badge');
    span.innerText = capitalizeFirstLetter(type.type.name);
    span.style.backgroundColor = modifyColor(getColorFromData(colorData), 'darken', 40);
    badgeContainer.appendChild(span);
  });
  
  const image = document.createElement('img');

  if (pokemon.sprites.front_female) {
    const isFemale = Math.random() < 0.5;
    image.src = isFemale ? pokemon.sprites.front_female : pokemon.sprites.front_default;
    h1.innerText += isFemale ? ' (♀)' : ' (♂)';
  } else {
    image.src = pokemon.sprites.front_default;
  }

  pokemonCard.appendChild(image);
  pokemonCard.appendChild(h1);
  pokemonCard.appendChild(badgeContainer);

  pokedexContainer.appendChild(pokemonCard);
}

// Initialize and load Pokémon
let isLoading = false;
async function loadPokemons() {
  if (isLoading) return;
  isLoading = true;
  const end = currentOffset + limit;
  for (let i = currentOffset; i < end; i++) {
    await createPokemonCard(i);
  }
  currentOffset = end;
  isLoading = false;
}

function checkScroll() {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    loadPokemons();
  }
}

window.addEventListener('scroll', checkScroll);

// Initial load
loadPokemons();