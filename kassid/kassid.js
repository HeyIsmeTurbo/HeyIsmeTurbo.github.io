const API_URL = "/api/cats";

const catGrid = document.getElementById("catGrid");
const status = document.getElementById("status");
const reloadBtn = document.getElementById("reloadBtn");
const catCountSlider = document.getElementById("catCount");
const catCountValue = document.getElementById("catCountValue");
const trackPicker = document.getElementById("trackPicker");
const bgMusic = document.getElementById("bgMusic");
const profileModal = document.getElementById("profileModal");
const closeProfileBtn = document.getElementById("closeProfileBtn");
const profileImage = document.getElementById("profileImage");
const profileName = document.getElementById("profileName");
const profileOrigin = document.getElementById("profileOrigin");
const profileTemperament = document.getElementById("profileTemperament");
const profileLifeSpan = document.getElementById("profileLifeSpan");
const profileWeight = document.getElementById("profileWeight");
const profileDescription = document.getElementById("profileDescription");

const TRACKS = {
	carefree: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3",
	monkeys: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Monkeys%20Spinning%20Monkeys.mp3",
};

function setStatus(message) {
	status.textContent = message;
}

function createCard(cat) {
	const card = document.createElement("article");
	card.className = "cat-card";
	card.tabIndex = 0;

	const breed = cat.breeds && cat.breeds.length > 0 ? cat.breeds[0] : null;
	const name = breed?.name || "Unknown Breed";
	const origin = breed?.origin || "Unknown";
	const temperament = breed?.temperament || "Playful";

	card.innerHTML = `
		<img src="${cat.url}" alt="${name} cat" loading="lazy" />
		<div class="cat-content">
			<h2 class="cat-title">${name}</h2>
			<p class="cat-text"><strong>Origin:</strong> ${origin}</p>
			<p class="cat-text"><strong>Temperament:</strong> ${temperament}</p>
		</div>
	`;

	card.addEventListener("click", () => openProfile(cat));
	card.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			openProfile(cat);
		}
	});

	return card;
}

function openProfile(cat) {
	const breed = cat.breeds && cat.breeds.length > 0 ? cat.breeds[0] : null;
	const name = breed?.name || "Unknown Breed";
	const origin = breed?.origin || "Unknown";
	const temperament = breed?.temperament || "Unknown";
	const lifeSpan = breed?.life_span || "Unknown";
	const weight = breed?.weight?.metric || "Unknown";
	const description =
		breed?.description ||
		"This cat does not have extended breed information available right now.";

	profileImage.src = cat.url;
	profileImage.alt = `${name} cat`;
	profileName.textContent = name;
	profileOrigin.textContent = `Origin: ${origin}`;
	profileTemperament.textContent = `Temperament: ${temperament}`;
	profileLifeSpan.textContent = `Life Span: ${lifeSpan} years`;
	profileWeight.textContent = `Average Weight: ${weight} kg`;
	profileDescription.textContent = description;

	profileModal.classList.add("open");
	profileModal.setAttribute("aria-hidden", "false");
	closeProfileBtn.focus();
}

function closeProfile() {
	profileModal.classList.remove("open");
	profileModal.setAttribute("aria-hidden", "true");
}

async function loadCats() {
	catGrid.innerHTML = "";
	setStatus("Loading cats...");
	reloadBtn.disabled = true;
	catCountSlider.disabled = true;

	const selectedCount = Number(catCountSlider.value);

	try {
		const response = await fetch(`${API_URL}?limit=${selectedCount}`);

		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`);
		}

		const cats = await response.json();
		cats.forEach((cat, index) => {
			const card = createCard(cat);
			card.style.animationDelay = `${index * 60}ms`;
			catGrid.appendChild(card);
		});

		setStatus(`Loaded ${cats.length} cat cards.`);
	} catch (error) {
		setStatus("Could not load cats right now. Please try again.");
		console.error("Failed to load cat data:", error);
	} finally {
		reloadBtn.disabled = false;
		catCountSlider.disabled = false;
	}
}

reloadBtn.addEventListener("click", loadCats);
catCountSlider.addEventListener("input", () => {
	catCountValue.textContent = catCountSlider.value;
});
catCountSlider.addEventListener("change", loadCats);

function setTrack(trackKey) {
	const trackUrl = TRACKS[trackKey] || TRACKS.carefree;
	bgMusic.src = trackUrl;
	bgMusic.load();
}

trackPicker.addEventListener("change", () => {
	setTrack(trackPicker.value);
	bgMusic.play().catch(() => {
		// Playback might be blocked until user interacts with controls.
	});
});

setTrack(trackPicker.value);

closeProfileBtn.addEventListener("click", closeProfile);
profileModal.addEventListener("click", (event) => {
	if (event.target === profileModal) {
		closeProfile();
	}
});
document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && profileModal.classList.contains("open")) {
		closeProfile();
	}
});

loadCats();
