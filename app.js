const SUPABASE_URL = "https://nhoemmyojkjqbjkrhsbe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ob2VtbXlvamtqcWJqa3Joc2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTM1OTIsImV4cCI6MjA5NjM4OTU5Mn0.odauhMM3C12AB7wzDR4OLYeaekLJgQORwWMQiywhhgs";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let people = [];
let route = [];
let routeLocked = false;

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = data.user;

  await loadProfile();
  await loadPeople();

  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("appPage").classList.remove("hidden");
}

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error || !data) {
    document.getElementById("welcome").innerText = "Asalamu Alaikum";
    return;
  }

  document.getElementById("welcome").innerText =
    `Asalamu Alaikum, ${data.first_name}`;
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

function showPage(page) {
  document.getElementById("peoplePage").classList.toggle("hidden", page !== "people");
  document.getElementById("routePage").classList.toggle("hidden", page !== "route");

  document.getElementById("tab-people")?.classList.toggle("active", page === "people");
  document.getElementById("tab-route")?.classList.toggle("active", page === "route");

  if (page === "route") {
    populatePersonSelect();
    renderRoute();
  }
}

async function addPerson() {
  const full_name = document.getElementById("personName").value.trim();
  const address = document.getElementById("personAddress").value.trim();

  if (!full_name || !address) {
    alert("Please enter name and address.");
    return;
  }

  const { error } = await supabaseClient.from("people").insert({
    user_id: currentUser.id,
    full_name,
    address
  });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("personName").value = "";
  document.getElementById("personAddress").value = "";

  await loadPeople();
  showToast("Person added!");
}

async function loadPeople() {
  const search = document.getElementById("searchPeople")?.value?.toLowerCase() || "";

  const { data, error } = await supabaseClient
    .from("people")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    alert(error.message);
    return;
  }

  people = data || [];

  const filtered = people.filter(p =>
    p.full_name.toLowerCase().includes(search) ||
    p.address.toLowerCase().includes(search)
  );

  renderPeople(filtered);
  populatePersonSelect();
}

function renderPeople(list) {
  const peopleList = document.getElementById("peopleList");

  if (!list || list.length === 0) {
    peopleList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <p>No people yet — add someone above</p>
      </div>
    `;
    return;
  }

  peopleList.innerHTML = list.map(p => `
    <div class="person-item">
      <div class="avatar">${getInitials(p.full_name)}</div>
      <div class="person-info">
        <div class="person-name">${escapeHtml(p.full_name)}</div>
        <div class="person-address">${escapeHtml(p.address)}</div>
      </div>
      <button class="btn-icon" onclick="deletePerson('${p.id}')" title="Delete">
        ✕
      </button>
    </div>
  `).join("");
}

function populatePersonSelect() {
  const select = document.getElementById("personSelect");
  if (!select) return;

  if (!people.length) {
    select.innerHTML = `<option value="">No people saved</option>`;
    return;
  }

  select.innerHTML = people.map(p => `
    <option value="${p.id}">
      ${escapeHtml(p.full_name)} - ${escapeHtml(p.address)}
    </option>
  `).join("");
}

async function deletePerson(id) {
  const { error } = await supabaseClient
    .from("people")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  route = route.filter(p => p.id !== id);

  await loadPeople();
  renderRoute();
  showToast("Person deleted.");
}

function addToRoute() {
  if (routeLocked) {
    alert("Route is locked. Press Done to start a new route.");
    return;
  }

  const id = document.getElementById("personSelect").value;

  if (!id) {
    alert("Please select a person.");
    return;
  }

  const person = people.find(p => p.id === id);

  if (!person) {
    alert("Person not found.");
    return;
  }

  const alreadyAdded = route.some(p => p.id === person.id);

  if (alreadyAdded) {
    alert("This person is already in the route.");
    return;
  }

  route.push(person);
  renderRoute();
  showToast("Stop added to route.");
}

function removeFromRoute(index) {
  if (routeLocked) {
    alert("Route is locked. Press Done to reset it.");
    return;
  }

  route.splice(index, 1);
  renderRoute();
}

function renderRoute() {
  const routeList = document.getElementById("routeList");
  const stopCount = document.getElementById("stopCount");

  if (stopCount) {
    stopCount.innerText = `${route.length} stop${route.length === 1 ? "" : "s"}`;
  }

  if (!route.length) {
    routeList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📍</div>
        <p>No stops yet — add people above</p>
      </div>
    `;
    return;
  }

  routeList.innerHTML = route.map((p, index) => `
    <div class="route-stop">
      <div class="stop-number">${index + 1}</div>
      <div class="stop-info">
        <div class="stop-name">${escapeHtml(p.full_name)}</div>
        <div class="stop-addr">${escapeHtml(p.address)}</div>
      </div>
      <button class="btn-icon" onclick="removeFromRoute(${index})" title="Remove">
        ✕
      </button>
    </div>
  `).join("");
}

function smartRoute() {
  if (routeLocked) {
    alert("Smart Route is already locked.");
    return;
  }

  const start = document.getElementById("startAddress").value.trim();

  if (!start) {
    alert("Please enter a starting address.");
    return;
  }

  if (route.length < 2) {
    alert("Add at least 2 stops before using Smart Route.");
    return;
  }

  route.sort((a, b) => a.address.localeCompare(b.address));

  routeLocked = true;

  const btn = document.getElementById("smartBtn");
  btn.classList.add("success");
  btn.classList.remove("accent");
  btn.innerText = "Smart Route Locked";

  renderRoute();
  showToast("Smart Route locked.");
}

function openGoogleMaps() {
  const start = document.getElementById("startAddress").value.trim();

  if (!start) {
    alert("Please enter a starting address.");
    return;
  }

  if (!route.length) {
    alert("Add at least one stop to the route.");
    return;
  }

  const cleanStops = [];

  route.forEach(p => {
    const address = p.address.trim();
    if (address && !cleanStops.includes(address)) {
      cleanStops.push(address);
    }
  });

  if (!cleanStops.length) {
    alert("No valid stops found.");
    return;
  }

  const destination = cleanStops[cleanStops.length - 1];
  const waypoints = cleanStops.slice(0, -1);

  let url = "https://www.google.com/maps/dir/?api=1";
  url += `&travelmode=driving`;
  url += `&origin=${encodeURIComponent(start)}`;
  url += `&destination=${encodeURIComponent(destination)}`;

  if (waypoints.length > 0) {
    url += `&waypoints=${encodeURIComponent(waypoints.join("|"))}`;
  }

  window.open(url, "_blank");
}

function doneRoute() {
  const confirmReset = confirm("Are you sure? This will reset the route.");

  if (!confirmReset) return;

  route = [];
  routeLocked = false;

  const btn = document.getElementById("smartBtn");
  btn.classList.remove("success");
  btn.classList.add("accent");
  btn.innerText = "Smart Route";

  renderRoute();
  showToast("New Route Created!");
}

function getInitials(name) {
  return name
    .split(" ")
    .map(word => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.innerText = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}
