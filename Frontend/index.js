// --- Constants ---
const VOICES = {
  English: { Male: "Matthew", Female: "Alicia" },
  Hindi: { Male: "Aman", Female: "Namrita" },
  Tamil: { Male: "Murali", Female: "Iniya" },
  Telugu: { Male: "Zion", Female: "Josie" }
};

const LOCALES = {
  English: "en-US",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN"
};


// --- State ---
const state = {
  place: '',
  image: '',
  length: 'Summary',
  voice: 'Male'
};

// --- DOM Elements ---
const cardsContainer = document.querySelector('.cards');
const experiencePanel = document.getElementById('experience');
const previewTitle = document.getElementById('previewTitle');
const audioSection = document.getElementById('audioSection');
const audioPlayer = document.getElementById('audioPlayer');
const transcriptText = document.getElementById('scriptText');
const generateButton = document.getElementById('generateBtn');
const languageSelect = document.getElementById('selectLanguage');
const closeButton = document.getElementById('closeExperience');
const searchPreviewCard = document.getElementById('searchPreviewCard');
const searchPreviewImage = document.getElementById('searchPreviewImage');
const searchPreviewTitle = document.getElementById('searchPreviewTitle');
const transcriptToggle = document.getElementById('transcriptToggle');
const transcriptContent = document.getElementById('transcriptContent');
const transcriptArrow = document.getElementById('transcriptArrow');

const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchBtn');

// --- Functions ---


function resetItineraryPlanner() {
  const form = document.getElementById("itineraryForm");
  const status = document.getElementById("itineraryStatus");
  const resultSection = document.getElementById("itineraryResultSection");
  const result = document.getElementById("itineraryResult");
  const button = document.getElementById("generateItineraryBtn");

  if (!form) return;

  form.reset();

  if (status) {
    status.textContent = "";
    status.classList.add("hidden");
  }

  if (resultSection) {
    resultSection.classList.add("hidden");
  }

  if (result) {
    result.value = "";
  }

  if (button) {
    button.disabled = false;
    button.textContent = "Generate My Itinerary";
  }

  const refineStatus = document.getElementById("refineItineraryStatus");
  if (refineStatus) {
    refineStatus.textContent = "";
    refineStatus.classList.add("hidden");
  }
}


async function searchDestination() {
  const query = searchInput.value.trim();

  if (!query) {
    alert('Please enter a destination in India.');
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = 'Searching...';

  try {
    
const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=5&q=${encodeURIComponent(query)}`;


    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Search request failed');
    }

    const results = await response.json();

    if (!results.length) {
      alert('No destination found. Try another place in India.');
      return;
    }

    
    
    const destination = results[0];
    const place = destination.name ||
      destination.display_name.split(',')[0];

    // Check whether this destination already has a card.
    
    const normalizePlace = (text) =>
      text.toLowerCase().replace(/\s+/g, '').trim();

    const existingCard = Array.from(
      document.querySelectorAll(
        '.place-card:not(.search-preview-card)'
      )
    ).find(card =>
      normalizePlace(card.dataset.place) ===
      normalizePlace(query)
    );

    if (existingCard) {
      // Use the original card and its existing image.
      selectDestination(
        existingCard.dataset.place,
        existingCard.dataset.image,
        existingCard
      );

      existingCard.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      return;
    }

    // For new destinations, search for a matching image.
    const imageUrl =
      `https://commons.wikimedia.org/w/api.php?` +
      `action=query&generator=search&` +
      `gsrsearch=intitle%3A%22${encodeURIComponent(place)}%22&` +
      `gsrnamespace=6&gsrlimit=10&` +
      `prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=800&` +
      `format=json&origin=*`;

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      throw new Error('Image search failed');
    }

    const imageData = await imageResponse.json();

    const imagePages = Object.values(
      imageData.query?.pages || {}
    );

    const normalizedPlace = place.toLowerCase();

    const photo = imagePages.find(page => {
      const title = (page.title || '').toLowerCase();
      const info = page.imageinfo?.[0];

      return title.includes(normalizedPlace) &&
        info &&
        (info.thumburl || info.url);
    });

    const image = photo
      ? (photo.imageinfo[0].thumburl ||
         photo.imageinfo[0].url)
      : 'https://placehold.co/600x400?text=Photo+Unavailable';

    // Show the new destination in the search-preview card.
    selectDestination(place, image);




  } catch (error) {
    console.error('Destination search error:', error);
    alert('Search failed. Please try again.');
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = 'Explore';
  }
}

searchButton.addEventListener('click', searchDestination);

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    searchDestination();
  }
});



function selectDestination(place, image, clickedCard = null) {
  state.place = place;
  state.image = image;
  resetItineraryPlanner();
  // Update UI content
  previewTitle.textContent = place;
  cardsContainer.classList.add('faded');

  // Reset previous states
  document.querySelectorAll('.place-card').forEach(card => card.classList.remove('active'));
  searchPreviewCard.classList.add('hidden');

  // Handle Card Visibility
  if (clickedCard) {
    clickedCard.classList.add('active');
  } else {
    // If it's a search result, show the preview card
    searchPreviewImage.src = image;
    searchPreviewTitle.textContent = place;
    searchPreviewCard.classList.remove('hidden');
    searchPreviewCard.classList.add('active');
  }

  // Reset Audio Panel
  audioSection.classList.add('hidden');
  audioPlayer.src = '';
  transcriptText.textContent = '';
  generateButton.textContent = 'Generate Audio Guide';
  generateButton.disabled = false;

  // Show Panel with animation
  experiencePanel.classList.remove('hidden');
  setTimeout(() => {
    experiencePanel.classList.add('visible');
  }, 10);
}

function deselectDestination() {
  experiencePanel.classList.remove('visible');

  // Wait for animation to finish before hiding
  setTimeout(() => {
    experiencePanel.classList.add('hidden');
    cardsContainer.classList.remove('faded');
    searchPreviewCard.classList.add('hidden');
    document.querySelectorAll('.place-card').forEach(card => card.classList.remove('active'));
  }, 300);
}

// --- Event Listeners ---

// Close Button
closeButton.addEventListener('click', deselectDestination);

// Card Clicks
document.querySelectorAll('.place-card:not(.search-preview-card)').forEach(card => {
  card.addEventListener('click', () => {
    selectDestination(card.dataset.place, card.dataset.image, card);
  });
});

// Option Toggles (History Type)
const lengthButtons = document.querySelectorAll('[data-group="length"] button');
lengthButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    lengthButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.length = btn.dataset.value;
  });
});

// Option Toggles (Voice Gender)
const voiceButtons = document.querySelectorAll('[data-group="voice"] button');
voiceButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    voiceButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.voice = btn.dataset.value;
  });
});


// Generate Audio guide button Logic

const GENERATE_AUDIO_GUIDE_API_URL = "https://ai-travel-guide-api-oe5d.onrender.com/generate-audio-guide";

generateButton.addEventListener('click', async () => {
  generateButton.disabled = true;
  generateButton.textContent = '⏳ Generating Audio...';

  try {
    const selectedLanguage = languageSelect.value;
    const selectedVoice = state.voice;

    const response = await fetch(GENERATE_AUDIO_GUIDE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        place: state.place,
        answerType: state.length,
        language: selectedLanguage,
        voiceId: VOICES[selectedLanguage][selectedVoice],
        locale: LOCALES[selectedLanguage]
      })
    });

    if (!response.ok) throw new Error('Generation failed');

    const data = await response.json();

    // Update UI with Result
    transcriptText.textContent = data.description;
    audioSection.classList.remove('hidden');

    if (data.audioBase64) {
      audioPlayer.src = `data:audio/mp3;base64,${data.audioBase64}`;
      audioPlayer.load();
      audioPlayer.classList.remove('hidden');
      generateButton.textContent = 'Listen to Audio';
    } else {
      audioPlayer.classList.add('hidden');
      generateButton.textContent = 'Audio Not Available';
    }

  } catch (err) {
    console.error(err);
    alert('Generation failed. Please check your connection.');
    generateButton.textContent = 'Generate Audio Guide';
    generateButton.disabled = false;
  }
});

// Transcript Toggle
transcriptToggle.addEventListener('click', () => {
  transcriptContent.classList.toggle('hidden');
  transcriptArrow.classList.toggle('rotate-180');
});



const BACKEND_URL = "https://ai-travel-guide-api-oe5d.onrender.com";

const GENERATE_ITINERARY_API_URL =
  `${BACKEND_URL}/generate-itinerary`;

const REFINE_ITINERARY_API_URL =
  `${BACKEND_URL}/refine-itinerary`;

const itineraryForm = document.getElementById("itineraryForm");
const itineraryStatus = document.getElementById("itineraryStatus");
const itineraryResultSection = document.getElementById("itineraryResultSection");
const itineraryResult = document.getElementById("itineraryResult");
const itineraryPreview = document.getElementById("itineraryFormattedPreview");
const itineraryPreferences = document.getElementById("itineraryPreferences");
const generateItineraryBtn = document.getElementById("generateItineraryBtn");
const refineItineraryBtn = document.getElementById("refineItineraryBtn");
const copyItineraryBtn = document.getElementById("copyItineraryBtn");
const itineraryCopyStatus = document.getElementById("itineraryCopyStatus");

function setItineraryStatus(message) {
  itineraryStatus.textContent = message;
  itineraryStatus.classList.remove("hidden");
}

// Safely format plain text/Markdown into a readable preview.
function formatItinerary(text) {
  const escapeHTML = (value) =>
    value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  const formatInline = (value) =>
    escapeHTML(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const lines = text.split(/\r?\n/);
  const output = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      output.push('<div class="h-2"></div>');
      continue;
    }

    // Markdown headings.
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      const headingText = formatInline(heading[1]);
      const isDay = /^day\s+\d+/i.test(heading[1]);

      output.push(
        isDay
          ? `<h3 class="text-xl font-bold text-[#d9680b] mt-5 mb-2">${headingText}</h3>`
          : `<h4 class="text-base font-bold text-gray-900 mt-4 mb-1">${headingText}</h4>`
      );
      continue;
    }

    // Day headings without Markdown markers.
    if (/^day\s+\d+\b/i.test(line)) {
      output.push(
        `<h3 class="text-xl font-bold text-[#d9680b] mt-5 mb-2">${formatInline(line)}</h3>`
      );
      continue;
    }

    // Numbered activities.
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) {
      output.push(`
        <div class="flex items-start gap-3 my-2">
          <span class="flex-shrink-0 font-bold text-[#d9680b]">${numbered[1]}.</span>
          <div class="flex-1">${formatInline(numbered[2])}</div>
        </div>
      `);
      continue;
    }

    // Bullet points.
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      output.push(`
        <div class="flex items-start gap-3 my-1">
          <span class="text-[#d9680b]">•</span>
          <div class="flex-1">${formatInline(bullet[1])}</div>
        </div>
      `);
      continue;
    }

    output.push(
      `<p class="my-1">${formatInline(line)}</p>`
    );
  }

  return output.join("");
}

function updateItineraryPreview() {
  itineraryPreview.innerHTML = formatItinerary(itineraryResult.value);
}

// Update the formatted preview whenever the user edits the text.
itineraryResult.addEventListener("input", updateItineraryPreview);

// Generate the first itinerary.
itineraryForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const destination = document.getElementById("tripDestination").value.trim();
  const days = Number(document.getElementById("tripDays").value);
  const budget = document.getElementById("tripBudget").value;
  const pace = document.getElementById("tripPace").value;

  const interests = Array.from(
    document.querySelectorAll('input[name="tripInterest"]:checked')
  ).map((checkbox) => checkbox.value);

  if (!destination) {
    setItineraryStatus("Please enter a destination.");
    return;
  }

  generateItineraryBtn.disabled = true;
  generateItineraryBtn.textContent = "Generating Itinerary...";
  itineraryResultSection.classList.add("hidden");
  setItineraryStatus("Please wait while AI plans your trip...");

  try {
    const response = await fetch(GENERATE_ITINERARY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination,
        days,
        budget,
        interests,
        pace
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not generate the itinerary.");
    }

    itineraryResult.value = data.itinerary || "";
    itineraryPreferences.value = "";
    updateItineraryPreview();

    itineraryResultSection.classList.remove("hidden");
    setItineraryStatus("Itinerary generated successfully. You can edit, refine, or copy it.");
  } catch (error) {
    console.error("Itinerary error:", error);
    setItineraryStatus(
      error.message || "Could not connect to the planner. Check that Flask is running."
    );
  } finally {
    generateItineraryBtn.disabled = false;
    generateItineraryBtn.textContent = "Generate My Itinerary";
  }
});

// Refine the user's CURRENT edited itinerary.
refineItineraryBtn.addEventListener("click", async () => {
  const destination = document.getElementById("tripDestination").value.trim();
  const days = Number(document.getElementById("tripDays").value);
  const currentItinerary = itineraryResult.value.trim();
  const preferences = itineraryPreferences.value.trim();

  if (!destination || !currentItinerary) {
    setItineraryStatus("Generate an itinerary first before refining it.");
    return;
  }

  refineItineraryBtn.disabled = true;
  refineItineraryBtn.textContent = "Refining...";
  copyItineraryBtn.disabled = true;
  setItineraryStatus("Updating your itinerary with your edits and preferences...");

  try {
    const response = await fetch(REFINE_ITINERARY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination,
        days,
        itinerary: currentItinerary,
        preferences
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not refine the itinerary.");
    }

    // Replace the editor with the newly refined complete plan.
    itineraryResult.value = data.itinerary || currentItinerary;
    updateItineraryPreview();
    itineraryPreferences.value = "";

    setItineraryStatus("Your itinerary has been updated. Review the latest version below.");
  } catch (error) {
    console.error("Itinerary refinement error:", error);
    setItineraryStatus(
      error.message || "Could not refine the itinerary. Please try again."
    );
  } finally {
    refineItineraryBtn.disabled = false;
    refineItineraryBtn.textContent = "Refine My Itinerary";
    copyItineraryBtn.disabled = false;
  }
});

// Copy the latest text from the editor, including manual edits.
copyItineraryBtn.addEventListener("click", async () => {
  const textToCopy = itineraryResult.value.trim();

  if (!textToCopy) {
    itineraryCopyStatus.textContent = "There is no itinerary to copy yet.";
    itineraryCopyStatus.classList.remove("hidden");
    return;
  }

  try {
    await navigator.clipboard.writeText(textToCopy);
    itineraryCopyStatus.textContent = "Latest itinerary copied successfully!";
  } catch (error) {
    // Fallback for browsers where Clipboard API is unavailable.
    itineraryResult.focus();
    itineraryResult.select();

    const copied = document.execCommand("copy");

    itineraryCopyStatus.textContent = copied
      ? "Latest itinerary copied successfully!"
      : "Copy failed. Select the itinerary text and copy it manually.";
  }

  itineraryCopyStatus.classList.remove("hidden");
});
