const loginScreen = document.querySelector("#loginScreen");
const dashboardScreen = document.querySelector("#dashboardScreen");
const loginForm = document.querySelector("#loginForm");
const googleLogin = document.querySelector("#googleLogin");
const logoutLink = document.querySelector("#logoutLink");
const menuButton = document.querySelector("#menuButton");
const sidebar = document.querySelector("#sidebar");
const profileForm = document.querySelector("#profileForm");
const saveMessage = document.querySelector("#saveMessage");
const loginEmail = document.querySelector("#loginEmail");
const loginPassword = document.querySelector("#loginPassword");
const loginMessage = document.querySelector("#loginMessage");
const googleMessage = document.querySelector("#googleMessage");
const googleButtonMount = document.querySelector("#googleButtonMount");
const navItems = document.querySelectorAll("[data-view]");
const pageViews = document.querySelectorAll(".page-view");
const pageEyebrow = document.querySelector("#pageEyebrow");
const pageTitle = document.querySelector("#pageTitle");
const topbarName = document.querySelector("#topbarName");
const miniAvatar = document.querySelector(".mini-avatar");
const avatarInput = document.querySelector("#avatarInput");
const avatarPreview = document.querySelector("#avatarPreview");
const avatarPlaceholder = document.querySelector("#avatarPlaceholder");
const editAvatar = document.querySelector("#editAvatar");
const profileCardName = document.querySelector("#profileCardName");
const profileProgress = document.querySelector("#profileProgress");
const profileStrength = document.querySelector("#profileStrength");
const heroTitle = document.querySelector("#heroTitle");
const summaryEmail = document.querySelector("#summaryEmail");
const summaryId = document.querySelector("#summaryId");
const summaryStatus = document.querySelector("#summaryStatus");
const openProfileButtons = document.querySelectorAll("[data-open-profile]");
const printProfileButtons = document.querySelectorAll("#printProfile, [data-print-profile]");
const profileStoragePrefix = "accountflow-profile";
const accountsStorageKey = "accountflow-accounts";
const credentialsStorageKey = "accountflow-credentials";
const rememberedGoogleEmailKey = "accountflow-remembered-google-email";
const editableFields = [
  "fullName",
  "phone",
  "fatherName",
  "motherName",
  "classSection",
  "governmentId",
  "dateOfBirth",
  "gender",
  "street",
  "city",
  "state",
  "zipCode",
  "bio",
];

let currentEmail = "";
let currentAvatar = "";
let googleSignInReady = false;
let googleButtonRendered = false;
const googleNonceKey = "accountflow-google-nonce";

const pageCopy = {
  dashboardView: {
    eyebrow: "Dashboard",
    title: "Account overview",
  },
  profileView: {
    eyebrow: "Personal information",
    title: "Edit your profile details",
  },
  settingsView: {
    eyebrow: "Settings",
    title: "Account preferences",
  },
};

function accountKey(email) {
  return `${profileStoragePrefix}:${encodeURIComponent(email.toLowerCase())}`;
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

async function hashPassword(password, saltHex) {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: hexToBytes(saltHex),
      iterations: 120000,
      hash: "SHA-256",
    },
    passwordKey,
    256
  );

  return bytesToHex(new Uint8Array(bits));
}

function readCredentials() {
  return JSON.parse(localStorage.getItem(credentialsStorageKey) || "{}");
}

function writeCredentials(credentials) {
  localStorage.setItem(credentialsStorageKey, JSON.stringify(credentials));
}

async function verifyOrCreateAccount(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const credentials = readCredentials();
  const existingCredential = credentials[normalizedEmail];

  if (!normalizedEmail || !password) {
    return { ok: false, message: "Enter email and password." };
  }

  if (!existingCredential) {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const saltHex = bytesToHex(salt);
    credentials[normalizedEmail] = {
      salt: saltHex,
      passwordHash: await hashPassword(password, saltHex),
      createdAt: new Date().toISOString(),
    };
    writeCredentials(credentials);
    return { ok: true, email: normalizedEmail, created: true };
  }

  const passwordHash = await hashPassword(password, existingCredential.salt);

  if (passwordHash !== existingCredential.passwordHash) {
    return { ok: false, message: "Wrong email or password." };
  }

  return { ok: true, email: normalizedEmail, created: false };
}

function readProfile(email = currentEmail) {
  if (!email) {
    return {};
  }

  return JSON.parse(localStorage.getItem(accountKey(email)) || "{}");
}

function googleClientId() {
  return document.querySelector('meta[name="google-client-id"]').content.trim();
}

function hasGoogleClientId() {
  const clientId = googleClientId();
  return clientId && clientId !== "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE";
}

function decodeGoogleCredential(credential) {
  const payload = credential.split(".")[1];
  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decodedPayload = decodeURIComponent(
    atob(normalizedPayload)
      .split("")
      .map((character) => `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join("")
  );

  return JSON.parse(decodedPayload);
}

function signInWithGoogleProfile(googleProfile) {
  const email = googleProfile.email || "";
  const profile = readProfile(email);

  if (googleProfile.name && !profile.fullName) {
    profile.fullName = googleProfile.name;
  }

  if (googleProfile.picture && !profile.avatar) {
    profile.avatar = googleProfile.picture;
  }

  currentEmail = email.toLowerCase();
  writeProfile({ ...profile, email: currentEmail });
  localStorage.setItem(rememberedGoogleEmailKey, currentEmail);
  showDashboard();
  setView("dashboardView");
  loadProfile();
}

function startGoogleRedirectSignIn() {
  if (!hasGoogleClientId()) {
    googleMessage.textContent = "Add your Google Client ID in index.html to connect real Gmail sign-in.";
    return;
  }

  const nonce = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: window.location.origin + window.location.pathname,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    prompt: "select_account",
  });

  sessionStorage.setItem(googleNonceKey, nonce);
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function handleGoogleRedirectResponse() {
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const idToken = hashParams.get("id_token");

  if (!idToken) {
    return;
  }

  const googleProfile = decodeGoogleCredential(idToken);
  const expectedNonce = sessionStorage.getItem(googleNonceKey);

  if (expectedNonce && googleProfile.nonce !== expectedNonce) {
    googleMessage.textContent = "Google sign-in failed security check. Please try again.";
    return;
  }

  sessionStorage.removeItem(googleNonceKey);
  history.replaceState(null, "", window.location.pathname);
  signInWithGoogleProfile(googleProfile);
}

function initializeGoogleSignIn() {
  if (!hasGoogleClientId() || !window.google?.accounts?.id) {
    return;
  }

  try {
    window.google.accounts.id.initialize({
      client_id: googleClientId(),
      callback: (response) => {
        signInWithGoogleProfile(decodeGoogleCredential(response.credential));
      },
    });

    if (!googleButtonRendered) {
      window.google.accounts.id.renderButton(googleButtonMount, {
        shape: "pill",
        size: "large",
        text: "signin_with",
        theme: "outline",
        width: 330,
      });
      googleButtonRendered = true;
    }

    googleSignInReady = true;
    googleMessage.textContent = "";
  } catch (error) {
    googleMessage.textContent = "Google sign-in setup failed. Check that localhost:3000 is added in Google Cloud.";
  }
}

function writeProfile(profile) {
  localStorage.setItem(accountKey(currentEmail), JSON.stringify(profile));

  const accounts = JSON.parse(localStorage.getItem(accountsStorageKey) || "{}");
  accounts[currentEmail.toLowerCase()] = {
    email: currentEmail,
    governmentId: profile.governmentId || "",
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(accountsStorageKey, JSON.stringify(accounts));
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");
}

function showLogin() {
  dashboardScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  sidebar.classList.remove("open");
  currentEmail = "";
  currentAvatar = "";
}

function setView(viewId) {
  pageViews.forEach((view) => {
    view.classList.toggle("active-view", view.id === viewId);
  });

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });

  pageEyebrow.textContent = pageCopy[viewId].eyebrow;
  pageTitle.textContent = pageCopy[viewId].title;
  sidebar.classList.remove("open");
}

function profileCompletion(profile) {
  const completedFields = editableFields.filter((fieldName) => profile[fieldName]);
  const avatarScore = profile.avatar ? 1 : 0;
  return Math.round(((completedFields.length + avatarScore) / (editableFields.length + 1)) * 100);
}

function updateAvatar(profile) {
  currentAvatar = profile.avatar || "";

  if (currentAvatar) {
    avatarPreview.src = currentAvatar;
    avatarPreview.classList.remove("hidden");
    avatarPlaceholder.classList.add("hidden");
    miniAvatar.innerHTML = "";
    miniAvatar.style.backgroundImage = `url("${currentAvatar}")`;
    miniAvatar.classList.add("has-photo");
    return;
  }

  avatarPreview.removeAttribute("src");
  avatarPreview.classList.add("hidden");
  avatarPlaceholder.classList.remove("hidden");
  miniAvatar.style.backgroundImage = "";
  miniAvatar.classList.remove("has-photo");
  miniAvatar.innerHTML = '<svg><use href="#icon-user"></use></svg>';
}

function updateAccountUI(profile) {
  const name = profile.fullName || "New user";
  const completion = profileCompletion(profile);

  profileCardName.textContent = name;
  topbarName.textContent = profile.fullName || "User";
  heroTitle.textContent = profile.fullName ? `Welcome, ${profile.fullName}` : "Welcome to your account";
  summaryEmail.textContent = currentEmail || "Not signed in";
  summaryId.textContent = profile.governmentId || "Not added";
  summaryStatus.textContent = completion === 100 ? "Complete" : `${completion}% complete`;
  profileProgress.style.width = `${completion}%`;
  profileProgress.classList.toggle("empty", completion === 0);
  profileStrength.textContent = `Profile strength ${completion}%`;
  updateAvatar(profile);
}

function clearProfileForm() {
  editableFields.forEach((fieldName) => {
    const field = profileForm.elements[fieldName];

    if (field) {
      field.value = "";
    }
  });
}

function loadProfile() {
  const profile = readProfile();
  clearProfileForm();
  profileForm.elements.email.value = currentEmail;

  editableFields.forEach((fieldName) => {
    const field = profileForm.elements[fieldName];

    if (field && profile[fieldName]) {
      field.value = profile[fieldName];
    }
  });

  updateAccountUI(profile);
}

function collectProfile() {
  const profile = {
    email: currentEmail,
    avatar: currentAvatar,
  };

  editableFields.forEach((fieldName) => {
    profile[fieldName] = profileForm.elements[fieldName].value.trim();
  });

  return profile;
}

function downloadPersonalInformation(profile) {
  const rows = [
    ["Email", profile.email || ""],
    ["Full name", profile.fullName || ""],
    ["Phone number", profile.phone || ""],
    ["Father name", profile.fatherName || ""],
    ["Mother name", profile.motherName || ""],
    ["Class section", profile.classSection || ""],
    ["Government ID / ID number", profile.governmentId || ""],
    ["Date of birth", profile.dateOfBirth || ""],
    ["Gender", profile.gender || ""],
    ["Street", profile.street || ""],
    ["City", profile.city || ""],
    ["State", profile.state || ""],
    ["Zip code", profile.zipCode || ""],
    ["Bio / description", profile.bio || ""],
  ];
  const content = [
    "Personal Information",
    "====================",
    "",
    ...rows.map(([label, value]) => `${label}: ${value || "Not provided"}`),
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  const safeEmail = (profile.email || "profile").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "");

  link.href = URL.createObjectURL(blob);
  link.download = `${safeEmail || "profile"}-personal-information.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function signIn(email, password) {
  loginMessage.textContent = "";
  loginMessage.classList.remove("error");

  const result = await verifyOrCreateAccount(email, password);

  if (!result.ok) {
    loginMessage.textContent = result.message;
    loginMessage.classList.add("error");
    return;
  }

  currentEmail = result.email;
  showDashboard();
  setView("dashboardView");
  loadProfile();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await signIn(loginEmail.value, loginPassword.value);
});

googleLogin.addEventListener("click", () => {
  if (!hasGoogleClientId()) {
    googleMessage.textContent = "Add your Google Client ID in index.html to connect real Gmail sign-in.";
    return;
  }

  googleMessage.textContent = "Opening Google sign-in...";
  startGoogleRedirectSignIn();
});

logoutLink.addEventListener("click", (event) => {
  event.preventDefault();
  localStorage.removeItem(rememberedGoogleEmailKey);
  showLogin();
});

menuButton.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

document.addEventListener("click", (event) => {
  const clickedInsideSidebar = sidebar.contains(event.target);
  const clickedMenu = menuButton.contains(event.target);

  if (!clickedInsideSidebar && !clickedMenu) {
    sidebar.classList.remove("open");
  }
});

navItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    setView(item.dataset.view);
  });
});

openProfileButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setView("profileView");
  });
});

editAvatar.addEventListener("click", () => {
  avatarInput.click();
});

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    currentAvatar = reader.result;
    const profile = collectProfile();
    writeProfile(profile);
    updateAccountUI(profile);
    saveMessage.textContent = "Profile photo saved.";

    window.setTimeout(() => {
      saveMessage.textContent = "";
    }, 2600);
  });
  reader.readAsDataURL(file);
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const profile = collectProfile();
  writeProfile(profile);
  updateAccountUI(profile);
  saveMessage.textContent = "Profile details saved for this email and ID.";

  window.setTimeout(() => {
    saveMessage.textContent = "";
  }, 2600);
});

printProfileButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const profile = collectProfile();
    writeProfile(profile);
    updateAccountUI(profile);
    downloadPersonalInformation(profile);
    setView("profileView");
    window.print();
  });
});

handleGoogleRedirectResponse();
window.addEventListener("load", () => {
  initializeGoogleSignIn();

  if (dashboardScreen.classList.contains("hidden")) {
    const rememberedEmail = localStorage.getItem(rememberedGoogleEmailKey);

    if (rememberedEmail) {
      currentEmail = rememberedEmail;
      showDashboard();
      setView("dashboardView");
      loadProfile();
    }
  }
});
