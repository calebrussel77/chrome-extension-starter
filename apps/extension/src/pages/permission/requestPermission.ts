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
 * Vérifie le statut actuel de la permission du microphone via l'API Permissions
 * @returns {Promise<string>} État de la permission ('granted', 'denied', ou 'prompt')
 */
async function checkPermissionStatus(): Promise<string> {
  if (navigator.permissions) {
    try {
      const permissionStatus = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      return permissionStatus.state;
    } catch (error) {
      console.error("Erreur lors de la vérification des permissions:", error);
      return "prompt";
    }
  }
  return "prompt";
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
  } else {
    window.parent.postMessage({ type: "MICROPHONE_PERMISSION_DENIED" }, "*");
  }
}

/**
 * Demande la permission d'accès au microphone
 * @returns {Promise<void>} Une Promise qui se résout quand la permission est accordée ou rejette avec une erreur
 */
export async function getUserPermission(): Promise<void> {
  try {
    // Vérifier si la permission a déjà été accordée dans le stockage local
    const hasStoredPermission = await checkStoredPermission();
    if (hasStoredPermission) {
      // Vérifier si la permission est toujours valide
      const permissionStatus = await checkPermissionStatus();
      if (permissionStatus === "granted") {
        window.parent.postMessage(
          { type: "MICROPHONE_PERMISSION_GRANTED" },
          "*"
        );
        return;
      }
    }

    // Vérifier l'état actuel de la permission
    const currentPermission = await checkPermissionStatus();
    if (currentPermission === "denied") {
      console.error("L'accès au microphone a été bloqué par l'utilisateur");
      window.parent.postMessage(
        {
          type: "MICROPHONE_PERMISSION_ERROR",
          error:
            "L'accès au microphone a été bloqué. Veuillez activer l'accès dans les paramètres de votre navigateur.",
        },
        "*"
      );
      await savePermissionState(false);
      throw new Error("Microphone access blocked by user");
    }

    // Demander la permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Arrêter les pistes pour éviter que l'indicateur d'enregistrement ne soit affiché
    stream.getTracks().forEach((track) => track.stop());

    // Sauvegarder l'état de la permission
    await savePermissionState(true);
  } catch (error) {
    console.error("Erreur lors de la demande d'accès au microphone", error);

    // Détails sur l'erreur pour le débogage
    if (error instanceof Error) {
      console.error("Type d'erreur:", error.name);
      console.error("Message d'erreur:", error.message);
    }

    await savePermissionState(false);

    // Envoyer des détails sur l'erreur
    window.parent.postMessage(
      {
        type: "MICROPHONE_PERMISSION_ERROR",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      "*"
    );

    throw error;
  }
}

// Vérifier et demander la permission du microphone si nécessaire
getUserPermission().catch((error) => {
  console.error("Échec de l'obtention de la permission du microphone:", error);
});
