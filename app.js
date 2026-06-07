const SUPABASE_URL = "https://nhoemmyojkjqbjkrhsbe.supabase.co/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ob2VtbXlvamtqcWJqa3Joc2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTM1OTIsImV4cCI6MjA5NjM4OTU5Mn0.odauhMM3C12AB7wzDR4OLYeaekLJgQORwWMQiywhhgs";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let people = [];
let route = [];
let routeLocked = false;

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

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
  const { data } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  document.getElementById("welcome").innerText =
    `Asalamu Alaikum, ${data.first_name}`;
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

function showPage(page) {
  document.getElementById("peoplePage").classList.add("hidden");
  document.getElementById("routePage").classList.add("hidden");

  if (page === "people") {
    document.getElementById("peoplePage").classList.remove("hidden");
  } else {
    document.getElementById("routePage").classList.remove("hidden");
  }
}

async function addPerson() {
  const full_name = document.getElementById("personName").value;
  const address = document.getElementById("personAddress").value;

  if (!full_name || !address) {
    alert("Please enter name and address.");
    return;
  }

  await supabaseClient.from("people").insert({
    user_id: currentUser.id,
    full_name,
    address
  });

  document.getElementById("personName").value = "";
  document.getElementById("personAddress").value = "";

  loadPeople();
}

async function loadPeople() {
  const search = document.getElementById("searchPeople")?.value?.toLowerCase() || "";

  const { data } = await supabaseClient
    .from("people")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  people = data || [];

  const filtered = people.filter(p =>
    p.full_name.toLowerCase().includes(search) ||
    p.address.toLowerCase().includes(search)
  );

  document.getElementById("peopleList").innerHTML = filtered.map(p => `
    <div class="person">
      <b>${p.full_name}</b><br>
      ${p.address}
      <button onclick="deletePerson('${p.id}')">Delete</button>
    </div>
  `).join("");

  document.getElementById("personSelect").innerHTML = people.map(p => `
    <option value="${p.id}">${p.full_name} - ${p.address}</option>
  `).join("");
}

async function deletePerson(id) {
  await supabaseClient.from("people").delete().eq("id", id);
  loadPeople();
}

function addToRoute() {
  if (routeLocked) {
    alert("Route is locked.");
    return;
  }

  const id = document.getElementById("personSelect").value;
  const person = people.find(p => p.id === id);

  if (person) {
    route.push(person);
    renderRoute();
  }
}

function renderRoute() {
  document.getElementById("routeList").innerHTML = route.map((p, index) => `
    <div class="stop">
      ${index + 1}. <b>${p.full_name}</b><br>
      ${p.address}
    </div>
  `).join("");
}

function smartRoute() {
  if (routeLocked) return;

  const start = document.getElementById("startAddress").value;

  if (!start) {
    alert("Please enter starting address.");
    return;
  }

  route.sort((a, b) => a.address.localeCompare(b.address));

  routeLocked = true;
  document.getElementById("smartBtn").classList.add("locked");
  document.getElementById("smartBtn").innerText = "Smart Route Locked";

  renderRoute();
}

function openGoogleMaps() {
  const start = document.getElementById("startAddress").value;

  if (!start || route.length === 0) {
    alert("Add a start address and route stops.");
    return;
  }

  const destination = route[route.length - 1].address;
  const waypoints = route.slice(0, -1).map(p => p.address).join("|");

  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${encodeURIComponent(start)}`;
  url += `&destination=${encodeURIComponent(destination)}`;

  if (waypoints) {
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }

  window.open(url, "_blank");
}

function doneRoute() {
  const confirmReset = confirm("Are you sure? This will reset the route.");

  if (!confirmReset) return;

  route = [];
  routeLocked = false;

  document.getElementById("smartBtn").classList.remove("locked");
  document.getElementById("smartBtn").innerText = "Smart Route";

  renderRoute();

  alert("New Route Created!");
}
