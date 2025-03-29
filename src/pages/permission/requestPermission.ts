/**
 * Vérifie si la permission du microphone a déjà été accordée
 * @returns {Promise<boolean>} Une Promise qui se résout avec l'état de la permission
 */
async function checkStoredPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["microphonePermission"], (result) => {
      resolve(result.microphonePermission === true);
    });
  });
}

/**
 * Sauvegarde l'état de la permission du microphone
 * @param {boolean} granted - Si la permission a été accordée
 */
async function savePermissionState(granted: boolean): Promise<void> {
  await chrome.storage.local.set({ microphonePermission: granted });

  // Notifier la page parent que la permission a été accordée
  if (granted) {
    window.parent.postMessage({ type: "MICROPHONE_PERMISSION_GRANTED" }, "*");
  }
}

/**
 * Demande la permission d'accès au microphone
 * @returns {Promise<void>} Une Promise qui se résout quand la permission est accordée ou rejette avec une erreur
 */
export async function getUserPermission(): Promise<void> {
  try {
    // Vérifier si la permission a déjà été accordée
    const hasStoredPermission = await checkStoredPermission();
    if (hasStoredPermission) {
      console.log("Permission du microphone déjà accordée");
      window.parent.postMessage({ type: "MICROPHONE_PERMISSION_GRANTED" }, "*");
      return;
    }

    // Demander la permission si elle n'a pas encore été accordée
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log("Accès au microphone accordé");

    // Arrêter les pistes pour éviter que l'indicateur d'enregistrement ne soit affiché
    stream.getTracks().forEach((track) => track.stop());

    // Sauvegarder l'état de la permission
    await savePermissionState(true);
  } catch (error) {
    console.error("Erreur lors de la demande d'accès au microphone", error);
    await savePermissionState(false);
    throw error;
  }
}

// Vérifier et demander la permission du microphone si nécessaire
getUserPermission().catch((error) => {
  console.error("Échec de l'obtention de la permission du microphone:", error);
});
