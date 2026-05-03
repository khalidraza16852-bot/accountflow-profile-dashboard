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
const profileStoragePrefix = "accountflow-profile";
const accountsStorageKey = "accountflow-accounts";
const editableFields = [
  "fullName",
  "phone",
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

function readProfile(email = currentEmail) {
  if (!email) {
    return {};
  }

  return JSON.parse(localStorage.getItem(accountKey(email)) || "{}");
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

function signIn(email) {
  currentEmail = email.trim().toLowerCase();

  if (!currentEmail) {
    loginEmail.focus();
    return;
  }

  showDashboard();
  setView("dashboardView");
  loadProfile();
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  signIn(loginEmail.value);
});

googleLogin.addEventListener("click", () => {
  signIn(loginEmail.value || "gmail-account@gmail.com");
});

logoutLink.addEventListener("click", (event) => {
  event.preventDefault();
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
