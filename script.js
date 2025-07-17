let userEmail = "";
let accessToken = "";
const folderName = "ASR_Uploads";
let folderId = "";

// התחברות עם גוגל
function handleLogin(response) {
  const idToken = response.credential;
  const payload = JSON.parse(atob(idToken.split('.')[1]));

  userEmail = payload.email;

  if (!userEmail.endsWith("@mail.tau.ac.il")) {
    alert("רק משתמשי mail.tau.ac.il יכולים להשתמש במערכת");
    return;
  }

  google.accounts.oauth2.initTokenClient({
    client_id: "821890513550-o7b29f3abllq3l0if7su1mfro3kgfr1r.apps.googleusercontent.com",
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: async (tokenResponse) => {
      accessToken = tokenResponse.access_token;

      document.getElementById("login-section").style.display = "none";
      document.getElementById("upload-section").style.display = "block";
      document.getElementById("user-email").textContent = "התחברת בתור: " + userEmail;

      folderId = await findOrCreateFolder(folderName);
    }
  }).requestAccessToken();
}

async function findOrCreateFolder(folderName) {
  const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const data = await res.json();
  if (data.files.length > 0) return data.files[0].id;

  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder"
  };

  const resCreate = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(metadata)
  });

  const newFolder = await resCreate.json();
  return newFolder.id;
}

document.getElementById("upload-button").addEventListener("click", async () => {
  const fileInput = document.getElementById("file-input");
  const file = fileInput.files[0];

  if (!file) {
    alert("אנא בחר קובץ לפני ההעלאה");
    return;
  }

  const selectedModel = document.getElementById("model").value;
  const selectedLanguage = document.getElementById("language").value;
  const selectedFormats = Array.from(
    document.getElementById("output-format").selectedOptions
  ).map(opt => opt.value);

  console.log("📦 מודל שנבחר:", selectedModel);
  console.log("🗣️ שפה שנבחרה:", selectedLanguage);
  console.log("📄 פורמטים:", selectedFormats);

  const metadata = {
    name: file.name,
    mimeType: file.type,
    parents: [folderId]
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  try {
    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    });

    const data = await res.json();

    if (data.id) {
      alert("✅ הקובץ הועלה בהצלחה!");
      console.log("✅ File ID:", data.id);
    } else {
      alert("❌ שגיאה בהעלאה");
      console.error(data);
    }

  } catch (error) {
    alert("❌ שגיאה כללית");
    console.error(error);
  }
});
