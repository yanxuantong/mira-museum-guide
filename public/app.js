const form = document.querySelector("#guide-form");
const imageInput = document.querySelector("#image");
const imageLabel = document.querySelector("#image-label");
const preview = document.querySelector("#preview");
const apiBase = normalizeApiBase(window.MIRA_API_BASE || "");
let pollTimer = null;

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  imageLabel.textContent = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
  };
  reader.readAsDataURL(file);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearInterval(pollTimer);
  setLiveState("preparing");
  const file = imageInput.files?.[0];
  const imageDataUrl = file ? await readAsDataUrl(file) : "";

  const response = await fetch(`${apiBase}/api/start-guide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: document.querySelector("#phone").value,
      language: document.querySelector("#language").value,
      image_name: file?.name || "sample-data/artwork.jpg",
      image_data_url: imageDataUrl
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    setLiveState("failed_or_mocked");
    throw new Error(payload.error || "Failed to start guide");
  }
  renderVisitCard(payload.visit_card);
  pollTimer = setInterval(() => pollVisitCard(payload.visit_card.visit_card_id), 900);
  pollVisitCard(payload.visit_card.visit_card_id);
});

const params = new URLSearchParams(window.location.search);
const focusMode = params.get("focus");
if (focusMode) document.body.dataset.focus = focusMode;
const replayCardId = params.get("card");
if (replayCardId) {
  pollVisitCard(replayCardId);
  pollTimer = setInterval(() => pollVisitCard(replayCardId), 900);
}

async function pollVisitCard(visitCardId) {
  const response = await fetch(`${apiBase}/api/visit-card/${encodeURIComponent(visitCardId)}`);
  const payload = await response.json();
  if (!response.ok) return;
  renderVisitCard(payload.visit_card);
  if (payload.visit_card.status === "completed") clearInterval(pollTimer);
}

function renderVisitCard(card) {
  document.querySelector("#card-id").textContent = `Linked to ${card.masked_phone}`;
  document.querySelector("#live-state").textContent = card.status;
  setLiveState(card.status);
  document.querySelector("#image-summary").textContent =
    card.image_request.analysis_summary || `Image received: ${card.image_request.uploaded_filename}`;
  document.querySelector("#guide-summary").textContent =
    card.guide_summary || "Preparing your guide summary.";
  document.querySelector("#next-recommendation").textContent = card.next_recommendation
    ? `${card.next_recommendation.title}: ${card.next_recommendation.description}`
    : "Waiting for guide call.";
}

function setLiveState(status) {
  document.querySelector("#live-state").textContent = status;
  const order = ["preparing", "matching", "calling", "in_progress", "summarizing", "completed"];
  const activeIndex = Math.max(0, order.indexOf(status));
  document.querySelectorAll("#status-steps li").forEach((item, index) => {
    item.classList.toggle("active", index <= activeIndex);
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function normalizeApiBase(value) {
  return String(value || "").replace(/\/$/, "");
}
